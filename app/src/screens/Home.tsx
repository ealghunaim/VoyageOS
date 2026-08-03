import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { getTripWeather, listTrips, Trip, WxDay } from '../api';
import FlagField from '../components/FlagField';
import Wordmark from '../components/Wordmark';
import { Btn, Card } from '../components/ui';
import { accentForTrip, F, P, RA, S, T, titleize } from '../theme';

function daysUntil(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function Home({ onNewTrip, onOpenTrip, onKits, onDocuments, onArchive, onHomeTap, authed, onSignOut }: {
  onNewTrip: () => void; onOpenTrip: (t: Trip) => void;
  onKits: () => void; onDocuments: () => void; onArchive: (past: Trip[]) => void;
  onHomeTap?: () => void;
  authed?: boolean; onSignOut?: () => void;
}) {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [past, setPast] = useState<Trip[]>([]);
  const [wx, setWx] = useState<Record<string, WxDay[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const raw = await listTrips();
      const now = Date.now();
      const upcoming = raw.filter(t => new Date(t.end_date + 'T23:59:59').getTime() >= now && t.status !== 'completed')
        .sort((a, b) => a.start_date.localeCompare(b.start_date));
      const done = raw.filter(t => !(new Date(t.end_date + 'T23:59:59').getTime() >= now && t.status !== 'completed'))
        .sort((a, b) => b.start_date.localeCompare(a.start_date));
      setTrips(upcoming);
      setPast(done);
      Promise.all(upcoming.map(t => getTripWeather(t.id).then(w => [t.id, w.days] as const).catch(() => [t.id, []] as const)))
        .then(entries => setWx(Object.fromEntries(entries)));
    }
    catch (e: any) { setError(e.message); setTrips([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (trips === null) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={P.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: P.pageBg }}
      contentContainerStyle={{ padding: S[5], paddingTop: S[6] }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true); await load(); setRefreshing(false);
        }} />
      }
    >
      <Wordmark onPress={onHomeTap} />
      <Text style={s.greeting}>Where to next?</Text>

      {!!error && (
        <Card><Text style={s.error}>{error}</Text></Card>
      )}

      {trips.length === 0 && !error && (
        <Card>
          <Text style={s.h2}>No trips yet</Text>
          <Text style={s.sub}>Create your first — the AI packs it with a reason on every item.</Text>
          <View style={{ height: 14 }} />
          <Btn label="+ New Trip" onPress={onNewTrip} />
        </Card>
      )}

      {trips.map(t => {
        const n = daysUntil(t.start_date);
        const past = n < 0;
        const when = n > 1 ? `in ${n} days` : n === 1 ? 'tomorrow' : n === 0 ? 'today' : 'past';
        const accent = accentForTrip(t.country_code, t.title);
        const hrsToGo = (new Date(t.start_date + 'T00:00:00').getTime() - Date.now()) / 3600000;
        const imminent = hrsToGo <= 24 && hrsToGo > -48;
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
                  <Text style={[s.pillText, { color: accent }]}>{done ? 'debriefed ✓' : when}</Text>
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
                  {past && !done ? '60-second debrief ›' : 'Open trip ›'}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}

      {trips.length > 0 && (
        <>
          <View style={{ height: 4 }} />
          <Btn label="+ New Trip" onPress={onNewTrip} />
        </>
      )}

      <View style={s.links}>
        {past.length > 0 && (
          <>
            <Pressable onPress={() => onArchive(past)}><Text style={s.link}>Past trips ({past.length}) ›</Text></Pressable>
            <Text style={s.linkSep}>{'    ·    '}</Text>
          </>
        )}
        <Pressable onPress={onKits}><Text style={s.link}>My kits ›</Text></Pressable>
        <Text style={s.linkSep}>{'    ·    '}</Text>
        <Pressable onPress={onDocuments}><Text style={s.link}>Documents ›</Text></Pressable>
      </View>
      <Text style={s.footer}>v1.0-dev{authed ? '' : ' · local mode'}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: P.pageBg, alignItems: 'center', justifyContent: 'center' },
  greeting: { ...T.display, fontSize: 34, color: P.textPri, letterSpacing: -0.8, marginTop: S[4] + 2, marginBottom: S[4] + 2 },
  h2: { ...T.h2, color: P.textPri, marginBottom: S[1] },
  sub: { ...T.body, color: P.textSec, lineHeight: 20 },
  // An error banner reports a state, so it keeps colour. The neutral-grey rule
  // covers destructive *actions* — sign out, delete — which this is not.
  error: { ...T.body, color: P.danger },
  band: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[4] + 2, paddingVertical: S[3] },
  // 8x8 made circular needs exactly half its width; RA.sm would over-round it.
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: S[2] },
  place: { ...T.label, letterSpacing: 1.2 },
  pillFloat: {
    position: 'absolute', top: S[3] - 2, right: S[3], paddingHorizontal: S[3], paddingVertical: 5,
    borderRadius: RA.pill,
    // A scrim over the flag hero — the palette has no translucent surface, and
    // P.card at full opacity would hide the artwork it floats on.
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  pillText: { ...T.label, fontSize: 12, letterSpacing: 0 },
  tripTitle: { ...T.h1, fontSize: 21, color: P.textPri, letterSpacing: -0.3 },
  tripTitleBig: { fontSize: 24 },
  dates: { ...T.body, color: P.textSec, marginTop: 3, marginBottom: S[1] },
  wxLine: { ...T.caption, fontFamily: F.bold, marginBottom: S[2] },
  open: { ...T.body, fontFamily: F.bold },
  links: { flexDirection: 'row', justifyContent: 'center', marginTop: S[4] + 2 },
  link: { ...T.body, fontFamily: F.bold, color: P.brand },
  linkSep: { ...T.body, color: P.textSec },
  footer: { ...T.caption, color: P.textMuted, textAlign: 'center', marginTop: S[3] + 2 },
});
