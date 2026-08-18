import React, { useCallback, useEffect, useState } from 'react';
import { Alert, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { askTrip, deleteTrip, getTrip, getTripWeather, patchTrip, Trip, TripDetail, WxDay } from '../api';
import TileIcon from '../components/icons';
import DepartureCard from './DepartureCard';
import JourneyEditor from './JourneyEditor';
import TripExtras from './TripExtras';
import FlagField from '../components/FlagField';
import { classify, isoDay } from '../tripStatus';
import { accentForTrip, onColor, tint, titleize, P, S, RA, E, T, FOLD } from '../theme';
import { FAB_CLEARANCE } from '../components/TopBar';

// Ordered by when a traveller reaches for them: pack and plan before leaving,
// then the things you use while you are there, then Know and Go, which are
// looked up rather than browsed. Know sat second — high billing for a
// reference page nobody opens twice.
const TILES: { key: string; label: string; sub: string }[] = [
  { key: 'pack', label: 'Pack', sub: 'With reasons' },
  { key: 'plan', label: 'Plan', sub: 'Day by day' },
  { key: 'eat', label: 'Eat', sub: 'Dishes worth it' },
  { key: 'play', label: 'Play', sub: 'Experiences' },
  { key: 'visit', label: 'Visit', sub: 'Sights & districts' },
  { key: 'know', label: 'Know', sub: 'Entry & plugs' },
  { key: 'go', label: 'Go', sub: 'Airport & around' },
  { key: 'journal', label: 'Journal', sub: 'Travel log' },
];

/**
 * The fold. A trip goes out and comes back — the V is that shape, and here it
 * does real work: it cuts the destination ground away from the tools below.
 * Drawn once per screen; the whole motif's weight rests on this one edge.
 */
function FoldEdge({ width, color }: { width: number; color: string }) {
  const d = FOLD.depth;
  if (!width) return null;
  return (
    <Svg width={width} height={d} style={{ position: 'absolute', bottom: 0, left: 0 }}>
      <Path d={`M0,0 L${width / 2},${d} L${width},0 L${width},${d} L0,${d} Z`} fill={P.card} />
      <Path d={`M0,0 L${width / 2},${d} L${width},0`} stroke={color} strokeWidth={3} fill="none" />
    </Svg>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.panel, E.low, style]}>{children}</View>;
}

const anim = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(
    220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));

type TripStop = { id: string; place_name: string; country_code: string | null; seq: number };

/**
 * A scrim that sinks the artwork into the solid ground beneath the title.
 * Without it the landscape stops at a hard line; with it the card reads as one
 * deepening field of colour, which is most of what makes it feel considered.
 */
function Scrim({ width, height, color }: { width: number; height: number; color: string }) {
  if (!width) return null;
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', bottom: 0, left: 0 }}
      pointerEvents="none">
      <Defs>
        <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0" />
          <Stop offset="1" stopColor={color} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#scrim)" />
    </Svg>
  );
}

export default function TripHub({ trip, accent, onBack, onPack, onPlan, onGuide, onJournal, onSOS, onDebrief, onTripChanged }: {
  trip: Trip; accent?: string; onBack: () => void; onPack: () => void; onPlan: () => void;
  onGuide: (section: string) => void; onJournal: () => void; onSOS: () => void; onDebrief: () => void;
  onTripChanged: (t: Trip | null) => void;
}) {
  // Colour doctrine: the destination fills the hero ground and carries the
  // controls beneath it, so a trip reads as one field of colour from the card
  // to the tab bar. Type on the ground is white or ink by luminance, never
  // brand blue — blue on crimson or green vibrates.
  // `dest` always drives the hero ground and the flag art — that is the
  // destination's one guaranteed place. `chrome` is what the surrounding
  // controls use, and the caller decides whether that is the destination or
  // the brand.
  const dest = accentForTrip(trip.country_code, trip.title);
  const heroInk = onColor(dest);
  const chrome = accent ?? dest;
  const plateBg = tint(chrome, 0.10);

  const [editing, setEditing] = useState(false);
  const [eStart, setEStart] = useState(trip.start_date);
  const [eEnd, setEEnd] = useState(trip.end_date);
  const [picking, setPicking] = useState<'start' | 'end'>('start');
  const [aq, setAq] = useState('');
  const [aBusy, setABusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [wx, setWx] = useState<WxDay[]>([]);
  const [heroW, setHeroW] = useState(0);
  // Was `start_date < now`, which offered to close out a trip on its first
  // morning — the same start-date-means-past bug fixed on Home in 2b. A trip
  // is not finished because it has begun.
  const past = classify(trip) === 'finished';

  const loadWx = useCallback(async () => {
    try { setWx((await getTripWeather(trip.id)).days); } catch {}
  }, [trip.id]);
  useEffect(() => { loadWx(); }, [loadWx]);

  // The list endpoint only carries the first destination, so fetch the real
  // stop list — the hero ground is built from it.
  // which folder is expanded; only one at a time
  const [openKey, setOpenKey] = useState<string | null>(null);

  const [stops, setStops] = useState<TripStop[]>([]);
  useEffect(() => {
    getTrip(trip.id)
      .then((d: TripDetail) => setStops((d.destinations ?? []) as TripStop[]))
      .catch(() => {});
  }, [trip.id]);


  const ground: TripStop[] = stops.length
    ? stops
    : [{ id: 'fallback', place_name: trip.place ?? trip.title, country_code: trip.country_code ?? null, seq: 1 }];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }}
      contentContainerStyle={{ padding: S[5], paddingTop: S[4], paddingBottom: FAB_CLEARANCE }}>




      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: S[3] }}>
        <Text style={[T.title, { color: chrome }]}>‹  Trips</Text>
      </Pressable>

      <Panel style={{ padding: 0, overflow: 'hidden', marginBottom: S[5], ...E.mid,
        backgroundColor: dest }}>
        <View onLayout={e => setHeroW(e.nativeEvent.layout.width)}>
          <FlagField stops={ground} style="wash" height={124} />
          <Scrim width={heroW} height={64} color={dest} />
        </View>
        <View style={{ paddingHorizontal: S[5], paddingTop: S[2], paddingBottom: S[6] }}>
          <Text style={[T.display, { color: heroInk }]}>{titleize(trip.title)}</Text>
          <Text style={[T.body, { color: heroInk, opacity: 0.75, marginTop: S[1] }]}>
            {trip.start_date}  →  {trip.end_date}
          </Text>
          {ground.length > 1 && (
            <Text style={[T.caption, { color: heroInk, opacity: 0.7, marginTop: S[2] }]}>
              {ground.map(d => d.place_name).join('  →  ')}
            </Text>
          )}
          {wx.length > 0 && wx.every(d => d.provider === 'climatology') && (
            <Text style={[T.label, { color: heroInk, opacity: 0.7, marginTop: S[3] }]}>
              TYPICAL {new Date(trip.start_date).toLocaleString(undefined, { month: 'long' }).toUpperCase()} · LAST YEAR
            </Text>
          )}
          {wx.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S[2] }}>
              <Text style={[T.caption, { color: heroInk }]}>
                {wx.map(d =>
                  `${d.date.slice(5)} ${d.temp_max != null ? Math.round(d.temp_max) : '–'}°` +
                  `${(d.precip_prob ?? 0) >= 60 ? '☔' : (d.uv ?? 0) >= 8 ? '☀' : ''}`
                ).join('   ·   ')}
              </Text>
            </ScrollView>
          )}
        </View>
        <FoldEdge width={heroW} color={heroInk} />
      </Panel>

      <Panel style={{ marginBottom: S[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={[T.body, s.input]}
            value={aq} onChangeText={setAq}
            placeholder="Ask about this trip"
            placeholderTextColor={P.textMuted} />
          <Pressable disabled={aBusy || aq.trim().length < 3} onPress={async () => {
            setABusy(true); setAnswer(null);
            try { const r = await askTrip(trip.id, aq.trim()); setAnswer(r.answer); }
            catch (e: any) { setAnswer(e.message); }
            finally { setABusy(false); }
          }}>
            <Text style={[T.title, { marginLeft: S[3],
              color: (aBusy || aq.trim().length < 3) ? P.textMuted : chrome }]}>
              {aBusy ? '…' : 'Ask'}
            </Text>
          </Pressable>
        </View>
        {!!answer && <Text style={[T.body, { color: P.textPri, marginTop: S[3] }]}>{answer}</Text>}
      </Panel>

      <TripExtras trip={trip} accent={chrome} onSOS={onSOS} />

      {(() => {
        const endMs = new Date(trip.end_date + 'T23:59:00').getTime();
        const hrsToEnd = (endMs - Date.now()) / 3600000;
        if (hrsToEnd > 24 || hrsToEnd < -24) return null;
        return <DepartureCard trip={trip} accent={chrome} onOpenPacking={onPack} onTripChanged={onTripChanged} />;
      })()}

      <View style={{ marginBottom: S[4] }}>
        {TILES.map((t, i) => {
          const open = openKey === t.key;
          // folders sit tight against each other; an open one gets breathing room
          const gap = open || openKey === TILES[i - 1]?.key ? S[2] : 2;
          const go = () =>
            t.key === 'pack' ? onPack()
            : t.key === 'plan' ? onPlan()
            : t.key === 'journal' ? onJournal()
            : t.key === 'sos' ? onSOS()
            : onGuide(t.key);

          return (
            <Pressable
              key={t.key}
              onPress={() => {
                anim();
                setOpenKey(open ? null : t.key);
              }}
              style={({ pressed }) => [
                s.folder, E.low,
                { marginTop: i === 0 ? 0 : gap, zIndex: i },
                pressed && { opacity: 0.85 },
              ]}>
              <View style={[s.folderTab, { backgroundColor: tint(chrome, 0.34) }]} />
              <View style={s.folderBody}>
                <View style={s.tileHead}>
                  <TileIcon kind={t.key} accent={chrome} size={28} />
                  <Text style={[T.title, { color: P.textPri, marginLeft: S[2] + 2, flex: 1 }]}>
                    {t.label}
                  </Text>
                  <Text style={[T.caption, { color: P.textMuted }]}>{t.sub}</Text>
                </View>

                {open && (
                  <View style={s.inlinePanel}>
                    <Pressable onPress={go}>
                      <Text style={[T.title, { color: chrome }]}>Open {t.label}  ›</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {editing && (
        <Panel style={{ marginTop: S[3] }}>
          <View style={{ flexDirection: 'row', marginBottom: S[2] }}>
            {(['start', 'end'] as const).map(k => (
              <Pressable key={k} onPress={() => setPicking(k)}
                style={[s.dateCell, { marginRight: k === 'start' ? S[2] : 0 },
                  picking === k && { backgroundColor: plateBg }]}>
                <Text style={[T.label, { color: P.textMuted }]}>{k.toUpperCase()}</Text>
                <Text style={[T.title, { color: P.textPri }]}>{k === 'start' ? eStart : eEnd}</Text>
              </Pressable>
            ))}
          </View>
          <DateTimePicker
            value={new Date((picking === 'start' ? eStart : eEnd) + 'T00:00:00')}
            mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              if (!d) return;
              const v = isoDay(d);   // local, not UTC — see tripStatus.isoDay
              if (picking === 'start') { setEStart(v); if (eEnd < v) setEEnd(v); }
              else setEEnd(v);
            }} />
          <Pressable onPress={async () => {
            try {
              const t = await patchTrip(trip.id, { start_date: eStart, end_date: eEnd });
              setEditing(false);
              onTripChanged({ ...trip, ...t });
            } catch (e: any) { Alert.alert('Dates', e.message); }
          }}>
            <Text style={[T.title, { color: chrome, textAlign: 'center', marginTop: S[2] }]}>Save dates</Text>
          </Pressable>
        </Panel>
      )}

      <Pressable onPress={() => setJourneyOpen(true)} style={s.footLink}>
        <Text style={[T.title, { color: chrome }]}>
          Your journey{trip.segments && trip.segments.length ? `  ·  ${trip.segments.length} legs` : ''}  ›
        </Text>
      </Pressable>

      <View style={s.footRow}>
        <Pressable onPress={() => setEditing(v => !v)} hitSlop={8}>
          <Text style={[T.caption, { color: P.textSec }]}>{editing ? 'Cancel' : 'Edit dates'}</Text>
        </Pressable>
      </View>

      {/* Delete sits on its own row, hard left, clear of the floating orbs in
          the bottom-right. It used to be the right half of a centred pair,
          landing around 122-201pt from the right edge — directly under the Home
          orb at 144-190pt — so aiming for it hit Home instead. A destructive
          action should be hard to reach by accident in the layout, not only in
          the dialog.

          The delete is a hard one: api/trips/router.py drops the row and the FK
          cascade takes destinations, guides, guide parts, packing lists, notes,
          phrases and plan items with it. Nothing is recoverable, so the copy
          says so. */}
      <View style={s.dangerRow}>
        <Pressable hitSlop={10} onPress={() =>
          Alert.alert('Delete this trip?',
            'The destinations, guide, packing list, journal and reminders go with it. '
            + 'This cannot be undone.', [
            { text: 'Keep it', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
              try { await deleteTrip(trip.id); onTripChanged(null); }
              catch (e: any) { Alert.alert('Delete', e.message); }
            } },
          ])}>
          {/* Deliberately not red. On a red-flag destination P.danger (#E02D3C)
              is indistinguishable from the accent (Japan is #BC002D), so colour
              stops signalling danger. The confirm dialog carries that weight
              instead, which leaves one accent per screen. */}
          <Text style={[T.caption, { color: P.textSec }]}>Delete trip</Text>
        </Pressable>
      </View>

      {journeyOpen && (
        <JourneyEditor trip={trip} accent={chrome}
          onClose={() => setJourneyOpen(false)} onSaved={onTripChanged} />
      )}
      {past && trip.status !== 'completed' && (
        <Pressable onPress={onDebrief}>
          <Text style={[T.title, { color: chrome, textAlign: 'center', marginTop: S[3] }]}>
            Close out this trip — 60-second debrief  ›
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  panel: {
    backgroundColor: P.card, borderRadius: RA.xl, padding: S[5],
    borderWidth: 1, borderColor: P.hairline,
  },
  input: {
    flex: 1, backgroundColor: P.sunken, borderRadius: RA.md,
    paddingHorizontal: S[4], paddingVertical: S[3], color: P.textPri,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  folder: {
    backgroundColor: P.card, borderRadius: RA.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: P.hairline,
  },
  folderTab:  { height: 8, width: '100%' },
  folderBody: { paddingHorizontal: S[4], paddingVertical: S[3] },
  inlinePanel: {
    marginTop: S[3], paddingTop: S[3],
    borderTopWidth: 1, borderTopColor: P.hairline,
  },

  tileStack: { width: '48.5%', marginBottom: S[3], paddingTop: 7 },
  sliver: {
    position: 'absolute', height: 14, borderTopLeftRadius: RA.lg,
    borderTopRightRadius: RA.lg, borderWidth: 1, borderColor: P.hairline,
  },
  sliverBack:  { top: 0, left: 14, right: 14 },
  sliverFront: { top: 3.5, left: 7,  right: 7  },
  tile: {
    width: '100%', backgroundColor: P.card, borderRadius: RA.lg,
    paddingHorizontal: S[4], paddingVertical: S[3],
    borderWidth: 1, borderColor: P.hairline,
  },
  // icon and label share a baseline row — no tinted plate behind the glyph,
  // which is what kept the grid reading as an app rather than a menu
  tileHead: { flexDirection: 'row', alignItems: 'center' },
  dateCell: { flex: 1, backgroundColor: P.sunken, borderRadius: RA.md, padding: S[3] },
  footLink: { alignItems: 'center', marginTop: S[4] },
  footRow: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: S[4] },
  // Hard left and set apart: the one irreversible control on the screen is now
  // nowhere near the orbs, and not adjacent to 'Edit dates' either.
  dangerRow: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: S[6] },
});
