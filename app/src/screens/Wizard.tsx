import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addActivity, addDestination, createTrip, generateList, PlaceHit, searchPlaces, Trip } from '../api';
import { Btn, Card, Chip, Field } from '../components/ui';
import { C } from '../theme';

const ACTIVITIES = [
  'hiking', 'trail_running', 'business', 'beach', 'ski',
  'fishing', 'photo', 'conference', 'general',
];

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function plusDays(base: string, n: number) {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function Wizard({ onDone, onCancel }: {
  onDone: (trip: Trip) => void; onCancel: () => void;
}) {
  const today = new Date();
  const defStart = iso(new Date(today.getTime() + 14 * 86400000));

  const [step, setStep] = useState(1);
  const [place, setPlace] = useState('');
  const [country, setCountry] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mode, setMode] = useState('air');
  const [stay, setStay] = useState('');
  const [airline, setAirline] = useState('');
  const [cabin, setCabin] = useState('economy');
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [chosen, setChosen] = useState(false);
  const [start, setStart] = useState(defStart);
  const [end, setEnd] = useState(plusDays(defStart, 6));
  const [acts, setActs] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);

  React.useEffect(() => {
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
    setPlace(h.name);
    setCountry(h.country_code);
    setCoords({ lat: h.lat, lng: h.lng });
    setChosen(true);
    setHits([]);
  };

  const toggleAct = (a: string) => {
    const next = new Set(acts);
    if (next.has(a)) { next.delete(a); } else { next.add(a); }
    setActs(next);
  };

  const validDates = DATE_RE.test(start) && DATE_RE.test(end) && end >= start;

  async function build() {
    try {
      setBusy('Creating your trip…');
      const trip = await createTrip({
        title: `${place} trip`,
        start_date: start,
        end_date: end,
        trip_type: acts.values().next().value ?? 'general',
      });
      setBusy('Adding destination…');
      await addDestination(trip.id, {
        place_name: place,
        country_code: country ? country.toUpperCase().slice(0, 2) : null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        accommodation: stay.trim() ? { name: stay.trim() } : null,
      });
      for (const a of acts) {
        await addActivity(trip.id, { type: a });
      }
      setBusy('Asking Claude to pack…');
      await generateList(trip.id);
      setBusy('');
      onDone(trip);
    } catch (e: any) {
      setBusy('');
      Alert.alert('Could not build the trip', e.message);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.wrap}>
      <View style={s.dots}>
        {[1, 2, 3, 4].map(n => (
          <View key={n} style={[s.dot, n <= step && { backgroundColor: C.blue }]} />
        ))}
      </View>

      {step === 1 && (
        <Card>
          <Text style={s.h1}>Where is VoyageOS taking you?</Text>
          <Field label="DESTINATION" value={place}
            onChange={(t) => { setPlace(t); setChosen(false); setCoords(null); }}
            placeholder="Start typing — e.g. Chamonix" />
          {hits.map((h, i) => (
            <Pressable key={`${h.name}-${h.lat}-${h.lng}-${i}`} onPress={() => pick(h)} style={s.hit}>
              <Text style={s.hitText}>{flag(h.country_code)}  {h.name}</Text>
              <Text style={s.hitSub}>{[h.admin, h.country_code].filter(Boolean).join(' · ')}</Text>
            </Pressable>
          ))}
          {chosen && (
            <Text style={s.picked}>{flag(country)}  {place} · pinned ✓</Text>
          )}
          <Text style={s.modeLabel}>HOW ARE YOU GETTING THERE?</Text>
          <View style={s.chipWrap}>
            {[['air', '✈ Air'], ['train', '🚆 Train'], ['ship', '🚢 Ship'], ['car', '🚗 Car']].map(([v, l]) => (
              <Chip key={v} label={l} selected={mode === v} onPress={() => setMode(v)} />
            ))}
          </View>
          {mode === 'air' && (
            <>
            <Field label="AIRLINE (OPTIONAL)" value={airline} onChange={setAirline}
              placeholder="e.g. Jazeera, Qatar Airways" />
            <Text style={s.modeLabel}>CABIN</Text>
            <View style={s.chipWrap}>
              {[['economy','Economy'],['premium','Premium'],['business','Business'],['first','First']].map(([v,l]) => (
                <Chip key={v} label={l} selected={cabin === v} onPress={() => setCabin(v)} />
              ))}
            </View>
            </>
          )}
          <Field label="WHERE ARE YOU STAYING? (OPTIONAL)" value={stay} onChange={setStay}
            placeholder="Hotel or area — tailors your guide" />
          {!chosen && place.trim().length >= 2 && (
            <Pressable onPress={() => { setChosen(true); setHits([]); }} style={s.hit}>
              <Text style={{ color: C.blue, fontWeight: '800' }}>Use “{place.trim()}” as a region ›</Text>
              <Text style={s.hitSub}>e.g. the Dolomites, the French Riviera</Text>
            </Pressable>
          )}
          <Btn label="Continue" disabled={!place.trim()} onPress={() => setStep(2)} />
          <View style={{ height: 8 }} />
          <Btn label="Cancel" kind="ghost" onPress={onCancel} />
        </Card>
      )}

      {step === 2 && (
        <Card>
          <Text style={s.h1}>Select your dates</Text>
          <Text style={s.sub}>Tap a date to open the calendar.</Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Pressable style={[s.datePill, picking === 'start' && s.datePillOn]} onPress={() => setPicking(picking === 'start' ? null : 'start')}>
              <Text style={s.datePillLabel}>START</Text>
              <Text style={s.datePillValue}>{start}</Text>
            </Pressable>
            <View style={{ width: 10 }} />
            <Pressable style={[s.datePill, picking === 'end' && s.datePillOn]} onPress={() => setPicking(picking === 'end' ? null : 'end')}>
              <Text style={s.datePillLabel}>END</Text>
              <Text style={s.datePillValue}>{end}</Text>
            </Pressable>
          </View>
          {picking && (
            <DateTimePicker
              value={new Date((picking === 'start' ? start : end) + 'T00:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={picking === 'end' ? new Date(start + 'T00:00:00') : new Date()}
              onChange={(_, d) => {
                if (!d) { setPicking(null); return; }
                const v = iso(d);
                if (picking === 'start') { setStart(v); if (end < v) setEnd(plusDays(v, 6)); }
                else setEnd(v);
                if (Platform.OS !== 'ios') setPicking(null);
              }}
            />
          )}
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>

          </View>
          {!validDates && <Text style={s.warn}>Check the dates — end must be on/after start.</Text>}
          <Btn label="Continue" disabled={!validDates} onPress={() => setStep(3)} />
          <View style={{ height: 8 }} />
          <Btn label="Back" kind="ghost" onPress={() => setStep(1)} />
        </Card>
      )}

      {step === 3 && (
        <Card>
          <Text style={s.h1}>What are your primary activities?</Text>
          <Text style={s.sub}>We'll build your packing list around these.</Text>
          <View style={s.chipWrap}>
            {ACTIVITIES.map(a => (
              <Chip key={a} label={a.replace('_', ' ')} selected={acts.has(a)} onPress={() => toggleAct(a)} />
            ))}
          </View>
          <Btn label="Build My Trip" disabled={acts.size === 0} onPress={() => { setStep(4); build(); }} />
          <View style={{ height: 8 }} />
          <Btn label="Back" kind="ghost" onPress={() => setStep(2)} />
        </Card>
      )}

      {step === 4 && (
        <Card>
          <Text style={s.h1}>{busy || 'Trip created.'}</Text>
          <Text style={s.sub}>
            {busy
              ? 'Reading your trip · Asking Claude · Applying your quantities'
              : 'Your packing list is ready.'}
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingTop: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  dot: { width: 26, height: 6, borderRadius: 3, backgroundColor: C.border, marginHorizontal: 4 },
  h1: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
  sub: { color: C.sub, marginBottom: 14, lineHeight: 20 },
  warn: { color: C.red, marginBottom: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  hit: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  hitText: { color: C.text, fontSize: 16, fontWeight: '600' },
  hitSub: { color: C.sub, fontSize: 12, marginTop: 1 },
  picked: { color: C.green, fontWeight: '800', marginBottom: 10 },
  datePill: { flex: 1, backgroundColor: '#F1F4F9', borderRadius: 14, padding: 12 },
  datePillOn: { backgroundColor: C.blueSoft },
  datePillLabel: { color: C.sub, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  datePillValue: { color: C.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
  modeLabel: { color: C.sub, fontSize: 12, marginBottom: 7, fontWeight: '800', letterSpacing: 0.6 },
});
