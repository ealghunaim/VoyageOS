import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { getTripWeather, listTrips, Trip, WxDay } from '../api';
import FlagField from '../components/FlagField';
import { Btn, Card } from '../components/ui';
import { FAB_CLEARANCE } from '../components/TopBar';
import { classify, needsDebrief, sortForTab, whenLabel } from '../tripStatus';
import { accentForTrip, F, P, RA, S, T, titleize } from '../theme';

type Tab = 'all' | 'upcoming' | 'finished';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'finished', label: 'Finished' },
];

export default function Home({ onNewTrip, onOpenTrip }: {
  onNewTrip: () => void; onOpenTrip: (t: Trip) => void;
}) {
  const [all, setAll] = useState<Trip[] | null>(null);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [wx, setWx] = useState<Record<string, WxDay[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const raw = await listTrips();
      setAll(raw);
      // Weather is only worth fetching for trips that have not happened — a
      // forecast for last month is noise, and it was a request per trip.
      const ahead = raw.filter(t => classify(t) !== 'finished');
      Promise.all(ahead.map(t => getTripWeather(t.id).then(w => [t.id, w.days] as const).catch(() => [t.id, []] as const)))
        .then(entries => setWx(Object.fromEntries(entries)));
    }
    catch (e: any) { setError(e.message); setAll([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { shown, upcomingCount, finishedCount, debriefCount } = useMemo(() => {
    const raw = all ?? [];
    const inTab = raw.filter(t => {
      const where = classify(t);
      if (tab === 'all') return true;
      // In-progress trips belong under Upcoming: the tab answers "what am I
      // travelling for", and a trip you are on is the most current answer of
      // all. Filing it under Finished is the bug this feature exists to fix.
      return tab === 'finished' ? where === 'finished' : where !== 'finished';
    });
    return {
      shown: sortForTab(inTab, tab),
      upcomingCount: raw.filter(t => classify(t) !== 'finished').length,
      finishedCount: raw.filter(t => classify(t) === 'finished').length,
      debriefCount: raw.filter(t => needsDebrief(t)).length,
    };
  }, [all, tab]);

  if (all === null) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={P.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: P.pageBg }}
      contentContainerStyle={{ padding: S[5], paddingTop: S[2], paddingBottom: FAB_CLEARANCE }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true); await load(); setRefreshing(false);
        }} />
      }
    >
      <Text style={s.greeting}>Where to next?</Text>

      {!!error && (
        <Card><Text style={s.error}>{error}</Text></Card>
      )}

      {/* The tabs only earn their space once there is something to sort. With
          one trip they are three controls that all show the same card. */}
      {(all.length > 1 || finishedCount > 0) && (
        <View style={s.tabs}>
          {TABS.map(x => {
            const on = tab === x.key;
            const count = x.key === 'upcoming' ? upcomingCount
              : x.key === 'finished' ? finishedCount : all.length;
            return (
              <Pressable key={x.key} onPress={() => setTab(x.key)}
                style={[s.tab, on && s.tabOn]}>
                <Text style={[s.tabText, on && s.tabTextOn]}>
                  {x.label}{count > 0 ? ` ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {tab === 'finished' && debriefCount > 0 && (
        // The nudge lives here rather than on every tab because this is where
        // acting on it is one tap away — the trips are right underneath.
        <Card>
          <Text style={s.h2}>
            {debriefCount} {debriefCount === 1 ? 'trip' : 'trips'} awaiting debrief
          </Text>
          <Text style={s.sub}>
            Sixty seconds each. What you over-packed teaches the next list.
          </Text>
        </Card>
      )}

      {shown.length === 0 && !error && (
        <Card>
          <Text style={s.h2}>
            {all.length === 0 ? 'No trips yet'
              : tab === 'finished' ? 'Nothing finished yet'
              : 'Nothing coming up'}
          </Text>
          <Text style={s.sub}>
            {all.length === 0
              ? 'Create your first — the AI packs it with a reason on every item.'
              : tab === 'finished'
              ? 'Trips move here the day after they end.'
              : 'Every trip you have is behind Finished.'}
          </Text>
          {tab !== 'finished' && (
            <>
              <View style={{ height: 14 }} />
              <Btn label="+ New Trip" onPress={onNewTrip} />
            </>
          )}
        </Card>
      )}

      {shown.map(t => {
        const where = classify(t);
        const when = whenLabel(t);
        const accent = accentForTrip(t.country_code, t.title);
        // The trip you are actually on outranks everything else on the screen,
        // for its whole length — not just the 48 hours the old rule allowed.
        const imminent = where === 'in_progress' || when === 'tomorrow';
        const done = t.status === 'completed';
        return (
          <Pressable key={t.id} onPress={() => onOpenTrip(t)}>
            <Card style={[{ padding: 0, overflow: 'hidden' }, imminent && { borderWidth: 2, borderColor: accent }] as any}>
              <View>
                <FlagField
                  stops={(t.destinations?.length
                    ? t.destinations
                    : [{ place_name: t.place ?? t.title, country_code: t.country_code ?? null }])}
                  style="wash" height={imminent ? 156 : 104} />
                <View style={s.pillFloat}>
                  {/* A closed-out trip is a distinct state from merely past,
                      and the Finished tab could not previously draw that line.
                      The glyph is on the pill rather than beside the title so
                      it reads as part of the trip's status, not its name. */}
                  <Text style={[s.pillText, { color: accent }]}>
                    {t.locked_at ? '🔒 ' : ''}{done ? 'debriefed ✓' : when}
                  </Text>
                </View>
              </View>
              <View style={{ padding: S[4] + 2, paddingTop: S[3] }}>
                <Text style={[s.tripTitle, imminent && s.tripTitleBig]} numberOfLines={1}>{titleize(t.title)}</Text>
                <Text style={s.dates}>{t.start_date} → {t.end_date}</Text>
                {(() => {
                  const days = wx[t.id] ?? [];
                  if (!days.length) return null;
                  const typical = days.every(d => d.provider === 'climatology');
                  const hi = Math.max(...days.map(d => d.temp_max ?? -99));
                  const lo = Math.min(...days.map(d => d.temp_min ?? 99));
                  const rain = Math.max(...days.map(d => d.precip_prob ?? 0));
                  const snow = days.some(d => (d.snow_cm ?? 0) > 0);
                  const parts = [`${typical ? '~' : ''}${Math.round(lo)}–${Math.round(hi)}°`];
                  if (rain > 0) parts.push(`☔ ${Math.round(rain)}%`);
                  if (snow) parts.push('❄ snow');
                  if (!rain && !snow && hi >= 32) parts.push('☀ dry heat');
                  return (
                    <Text style={[s.wxLine, { color: accent }]}>
                      {parts.join('  ·  ')}{typical ? '   (typical)' : ''}
                    </Text>
                  );
                })()}
                <Text style={[s.open, { color: accent }]}>
                  {where === 'finished' && !done ? '60-second debrief ›' : 'Open trip ›'}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}

      {shown.length > 0 && (
        <>
          <View style={{ height: 4 }} />
          <Btn label="+ New Trip" onPress={onNewTrip} />
        </>
      )}

      {/* Kits and Documents used to be two 11pt text links down here, which
          is where things go to be missed. They are tabs now. The "Past trips ›"
          link that sat beside them became the Finished tab in 2b. */}
      <Text style={s.footer}>v1.0-dev</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: P.pageBg, alignItems: 'center', justifyContent: 'center' },
  // Three paddings used to stack between the identity bar and this line —
  // the bar's own 14, the list's 20, and a further 18 here, for 52pt of gap
  // that read as the greeting having drifted loose from the header.
  greeting: { ...T.display, color: P.textPri, marginTop: 0, marginBottom: S[4] },
  h2: { ...T.h2, color: P.textPri, marginBottom: S[1] },
  sub: { ...T.body, color: P.textSec, lineHeight: 20 },
  // An error banner reports a state, so it keeps colour. The neutral-grey rule
  // covers destructive *actions* — sign out, delete — which this is not.
  error: { ...T.body, color: P.danger },
  band: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[4] + 2, paddingVertical: S[3] },
  // 8x8 made circular needs exactly half its width; RA.sm would over-round it.
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: S[2] },
  place: { ...T.label, letterSpacing: 1.2 },
  // LEFT, not right. The floating + is fixed to the screen's bottom-right and
  // cards scroll underneath it, so a right-hand pill was dragged through the
  // one control on the screen every time the list moved. Nothing else on the
  // card is readable text over artwork, so moving the pill leaves the + passing
  // over flag colour instead of over words.
  pillFloat: {
    position: 'absolute', top: S[3] - 2, left: S[3], paddingHorizontal: S[3], paddingVertical: 5,
    borderRadius: RA.pill,
    // A scrim over the flag hero — the palette has no translucent surface, and
    // P.card at full opacity would hide the artwork it floats on.
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  pillText: { ...T.label, letterSpacing: 0 },
  tripTitle: { ...T.h2, color: P.textPri },
  tripTitleBig: { ...T.h1 },
  dates: { ...T.body, color: P.textSec, marginTop: 3, marginBottom: S[1] },
  wxLine: { ...T.caption, fontFamily: F.bold, marginBottom: S[2] },
  open: { ...T.body, fontFamily: F.bold },
  tabs: {
    flexDirection: 'row', backgroundColor: P.sunken, borderRadius: RA.pill,
    padding: 3, marginBottom: S[4],
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: RA.pill },
  tabOn: { backgroundColor: P.card },
  tabText: { ...T.caption, fontFamily: F.bold, color: P.textSec },
  tabTextOn: { color: P.textPri },
  links: { flexDirection: 'row', justifyContent: 'center', marginTop: S[4] + 2 },
  link: { ...T.body, fontFamily: F.bold, color: P.brand },
  linkSep: { ...T.body, color: P.textSec },
  footer: { ...T.caption, color: P.textMuted, textAlign: 'center', marginTop: S[3] + 2 },
});
