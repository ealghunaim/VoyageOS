import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  addActivity, addDestination, createTrip, generateList, patchTrip,
  PlaceHit, searchPlaces, Segment, Trip,
} from '../api';
import { Btn, Card, Chip, Field } from '../components/ui';
import JourneyEditor from './JourneyEditor';
import JourneyLoader from '../components/JourneyLoader';
import TripArt from '../components/TripArt';
import { accentForTrip, C, F, titleize } from '../theme';

const ACTIVITIES = [
  'hiking', 'trail_running', 'business', 'beach', 'ski',
  'fishing', 'photo', 'conference', 'general',
];
const MODES: [string, string][] = [['air', '✈ Air'], ['train', '🚆 Train'], ['ship', '🚢 Ship'], ['car', '🚗 Car']];
const MODE_ICON: Record<string, string> = { air: '✈', train: '🚆', ship: '🚢', car: '🚗' };

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function plusDays(base: string, n: number) {
  const d = new Date(base + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d);
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function pretty(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Wizard({ onDone, onCancel }: {
  onDone: (trip: Trip) => void; onCancel: () => void;
}) {
  const today = new Date();
  const defStart = iso(new Date(today.getTime() + 14 * 86400000));

  const [place, setPlace] = useState('');
  const [country, setCountry] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mode, setMode] = useState('air');
  const [stay, setStay] = useState('');
  const [airline, setAirline] = useState('');
  const [cabin, setCabin] = useState('economy');
  const [departTime, setDepartTime] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [withKids, setWithKids] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [chosen, setChosen] = useState(false);
  const [start, setStart] = useState(defStart);
  const [end, setEnd] = useState(plusDays(defStart, 6));
  const [acts, setActs] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);

  const hasDest = chosen || place.trim().length >= 2;
  const accent = hasDest ? accentForTrip(country, place) : C.blue;
  const heroOp = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.timing(heroOp, { toValue: hasDest ? 1 : 0.5, duration: 500, useNativeDriver: true }).start();
  }, [hasDest, heroOp]);

  useEffect(() => {
    if (chosen || place.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => {
      searchPlaces(place).then(res => {
        const seen = new Set<string>();
        setHits(res.filter(h => {
          const k = `${h.name}|${h.admin ?? ''}|${h.country_code}`;
          if (seen.has(k)) return false;
          seen.add(k); return true;
        }));
      }).catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [place, chosen]);

  const flag = (cc: string) =>
    cc.length === 2 ? String.fromCodePoint(...cc.split('').map(c => 127397 + c.charCodeAt(0))) : '';

  const pick = (h: PlaceHit) => {
    setPlace(h.name); setCountry(h.country_code);
    setCoords({ lat: h.lat, lng: h.lng }); setChosen(true); setHits([]);
  };
  const toggleAct = (a: string) => {
    const next = new Set(acts);
    next.has(a) ? next.delete(a) : next.add(a);
    setActs(next);
  };
  const validDates = DATE_RE.test(start) && DATE_RE.test(end) && end >= start;
  const canBuild = !!place.trim() && validDates && acts.size > 0;

  async function build() {
    try {
      setBusy('Creating your trip…');
      const trip = await createTrip({
        title: `${place.trim().toUpperCase()} trip`,
        start_date: start, end_date: end,
        trip_type: acts.values().next().value ?? 'general',
        travel_mode: mode,
        airline: mode === 'air' && airline.trim() ? airline.trim() : undefined,
        cabin_class: mode === 'air' ? cabin : undefined,
        depart_time: mode === 'air' && /^\d{1,2}:\d{2}$/.test(departTime.trim()) ? departTime.trim() : undefined,
        with_kids: withKids,
      });
      setBusy('Adding destination…');
      await addDestination(trip.id, {
        place_name: place,
        country_code: country ? country.toUpperCase().slice(0, 2) : null,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        accommodation: stay.trim() ? { name: stay.trim() } : null,
      });
      for (const a of acts) await addActivity(trip.id, { type: a });
      if (segments.length) { setBusy('Saving your journey…'); await patchTrip(trip.id, { segments }); }
      setBusy('Asking Claude to pack…');
      await generateList(trip.id);
      setBusy('');
      onDone({ ...trip, segments });
    } catch (e: any) {
      setBusy('');
      Alert.alert('Could not build the trip', e.message);
    }
  }

  if (busy) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24 }}>
        <Card><JourneyLoader accent={accent} label={busy} /></Card>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.wrap}
      keyboardShouldPersistTaps="handled">
      {/* The living card — paints itself as you type */}
      <Animated.View style={[s.hero, { opacity: heroOp }]}>
        <TripArt seed={place || 'trip'} accent={accent} height={150} />
        <View style={s.heroBody}>
          <Text style={s.heroTitle}>{place.trim() ? titleize(`${place.trim()} trip`) : 'Where to next?'}</Text>
          <Text style={s.heroMeta}>{pretty(start)} → {pretty(end)}</Text>
          <Text style={[s.heroMeta, { color: accent }]}>
            {MODE_ICON[mode]} {mode}{segments.length ? ` · ${segments.length} legs` : ''}{stay.trim() ? ` · ${stay.trim()}` : ''}
          </Text>
        </View>
      </Animated.View>

      <Card>
        <Text style={s.label}>DESTINATION</Text>
        <Field label="" value={place}
          onChange={(t) => { setPlace(t); setChosen(false); setCoords(null); }}
          placeholder="Start typing — e.g. Chamonix" />
        {hits.map((h, i) => (
          <Pressable key={`${h.name}-${h.lat}-${h.lng}-${i}`} onPress={() => pick(h)} style={s.hit}>
            <Text style={s.hitText}>{flag(h.country_code)}  {h.name}</Text>
            <Text style={s.hitSub}>{[h.admin, h.country_code].filter(Boolean).join(' · ')}</Text>
          </Pressable>
        ))}
        {chosen && <Text style={s.picked}>{flag(country)}  {place} · pinned ✓</Text>}
        {!chosen && place.trim().length >= 2 && (
          <Pressable onPress={() => { setChosen(true); setHits([]); }} style={s.hit}>
            <Text style={{ color: accent, fontFamily: F.bold }}>Use “{place.trim()}” as a region ›</Text>
            <Text style={s.hitSub}>e.g. the Dolomites, the French Riviera</Text>
          </Pressable>
        )}

        <Text style={[s.label, { marginTop: 16 }]}>WHEN</Text>
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          <Pressable style={[s.datePill, picking === 'start' && s.datePillOn]} onPress={() => setPicking(picking === 'start' ? null : 'start')}>
            <Text style={s.datePillLabel}>START</Text><Text style={s.datePillValue}>{start}</Text>
          </Pressable>
          <View style={{ width: 10 }} />
          <Pressable style={[s.datePill, picking === 'end' && s.datePillOn]} onPress={() => setPicking(picking === 'end' ? null : 'end')}>
            <Text style={s.datePillLabel}>END</Text><Text style={s.datePillValue}>{end}</Text>
          </Pressable>
        </View>
        {picking && (
          <DateTimePicker
            value={new Date((picking === 'start' ? start : end) + 'T00:00:00')}
            mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={picking === 'end' ? new Date(start + 'T00:00:00') : new Date()}
            onChange={(_, d) => {
              if (!d) { setPicking(null); return; }
              const v = iso(d);
              if (picking === 'start') { setStart(v); if (end < v) setEnd(plusDays(v, 6)); } else setEnd(v);
              if (Platform.OS !== 'ios') setPicking(null);
            }}
          />
        )}
        {!validDates && <Text style={s.warn}>End must be on or after start.</Text>}

        <Text style={[s.label, { marginTop: 16 }]}>GETTING THERE</Text>
        <View style={s.chipWrap}>
          {MODES.map(([v, l]) => (
            <Chip key={v} label={l} selected={mode === v} onPress={() => setMode(v)} />
          ))}
        </View>
        {mode === 'air' && (
          <>
            <Field label="AIRLINE (OPTIONAL)" value={airline} onChange={setAirline}
              placeholder="e.g. Jazeera, Qatar Airways" />
            <Text style={s.label}>CABIN</Text>
            <View style={s.chipWrap}>
              {[['economy', 'Economy'], ['premium', 'Premium'], ['business', 'Business'], ['first', 'First']].map(([v, l]) => (
                <Chip key={v} label={l} selected={cabin === v} onPress={() => setCabin(v)} />
              ))}
            </View>
            <Field label="RETURN FLIGHT TIME (OPTIONAL, HH:MM)" value={departTime} onChange={setDepartTime}
              placeholder="e.g. 14:20 - powers your leave-by reminder" />
          </>
        )}

        <Text style={[s.label, { marginTop: 16 }]}>ACTIVITIES</Text>
        <Text style={s.sub}>We build your packing list around these.</Text>
        <View style={s.chipWrap}>
          {ACTIVITIES.map(a => (
            <Chip key={a} label={a.replace('_', ' ')} selected={acts.has(a)} onPress={() => toggleAct(a)} />
          ))}
        </View>

        <Pressable onPress={() => setWithKids(v => !v)}
          style={[s.kidsRow, withKids && { borderColor: accent, backgroundColor: '#fff' }]}>
          <Text style={{ fontSize: 16 }}>{withKids ? '👨‍👩‍👧 ' : ''}Traveling with kids?</Text>
          <View style={[s.kidsDot, withKids && { backgroundColor: accent, borderColor: accent }]}>
            {withKids && <Text style={{ color: '#fff', fontSize: 13, fontFamily: F.bold }}>✓</Text>}
          </View>
        </Pressable>
        {withKids && <Text style={[s.sub, { marginTop: -4 }]}>Play will rate every activity by age group — toddlers to teens.</Text>}

        <Text style={[s.label, { marginTop: 16 }]}>YOUR JOURNEY (OPTIONAL)</Text>
        <Pressable onPress={() => setJourneyOpen(true)} style={s.journeyRow}>
          <Text style={{ color: accent, fontFamily: F.bold }}>
            {segments.length ? `✈ ${segments.length} leg${segments.length > 1 ? 's' : ''} — edit ›` : '✈ Add flights, trains, ferries ›'}
          </Text>
          <Text style={s.hitSub}>Enter a flight number to auto-fill times.</Text>
        </Pressable>

        <Field label="WHERE YOU'RE STAYING (OPTIONAL)" value={stay} onChange={setStay}
          placeholder="Hotel or area — tailors your guide" />

        <View style={{ height: 8 }} />
        <Btn label="Create my trip" color={accent} disabled={!canBuild} onPress={build} />
        <View style={{ height: 8 }} />
        <Btn label="Cancel" kind="ghost" onPress={onCancel} />
      </Card>

      {journeyOpen && (
        <JourneyEditor
          trip={{ id: '', title: '', status: 'draft', start_date: start, end_date: end, segments } as Trip}
          accent={accent}
          onSaveLocal={setSegments}
          onClose={() => setJourneyOpen(false)} />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingTop: 20 },
  hero: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 14,
    shadowColor: '#0A0E17', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  heroBody: { padding: 16 },
  heroTitle: { fontSize: 24, fontFamily: F.bold, color: C.text },
  heroMeta: { color: C.sub, marginTop: 3, fontSize: 14 },
  label: { color: C.sub, fontSize: 12, marginBottom: 7, fontFamily: F.bold, letterSpacing: 0.6 },
  sub: { color: C.sub, marginBottom: 10, lineHeight: 20 },
  warn: { color: C.red, marginTop: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  hit: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  hitText: { color: C.text, fontSize: 16, fontWeight: '600' },
  hitSub: { color: C.sub, fontSize: 12, marginTop: 1 },
  picked: { color: C.green, fontFamily: F.bold, marginVertical: 8 },
  kidsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginTop: 16, marginBottom: 8 },
  kidsDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  journeyRow: { paddingVertical: 10, marginBottom: 6 },
  datePill: { flex: 1, backgroundColor: '#F1F4F9', borderRadius: 14, padding: 12 },
  datePillOn: { backgroundColor: C.blueSoft },
  datePillLabel: { color: C.sub, fontSize: 11, fontFamily: F.bold, letterSpacing: 0.6 },
  datePillValue: { color: C.text, fontSize: 16, fontFamily: F.bold, marginTop: 2 },
});
