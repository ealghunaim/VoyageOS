import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addActivity, addDestination, createTrip, generateList, PlaceHit, searchPlaces } from '../api';
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
  onDone: (tripId: string) => void; onCancel: () => void;
}) {
  const today = new Date();
  const defStart = iso(new Date(today.getTime() + 14 * 86400000));

  const [step, setStep] = useState(1);
  const [place, setPlace] = useState('');
  const [country, setCountry] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [chosen, setChosen] = useState(false);
  const [start, setStart] = useState(defStart);
  const [end, setEnd] = useState(plusDays(defStart, 6));
  const [acts, setActs] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');

  React.useEffect(() => {
    if (chosen || place.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => {
      searchPlaces(place).then(setHits).catch(() => setHits([]));
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
      });
      for (const a of acts) {
        await addActivity(trip.id, { type: a });
      }
      setBusy('Asking Claude to pack…');
      await generateList(trip.id);
      setBusy('');
      onDone(trip.id);
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
          {hits.map(h => (
            <Pressable key={`${h.name}-${h.lat}`} onPress={() => pick(h)} style={s.hit}>
              <Text style={s.hitText}>{flag(h.country_code)}  {h.name}</Text>
              <Text style={s.hitSub}>{[h.admin, h.country_code].filter(Boolean).join(' · ')}</Text>
            </Pressable>
          ))}
          {chosen && (
            <Text style={s.picked}>{flag(country)}  {place} · pinned ✓</Text>
          )}
          <Btn label="Continue" disabled={!place.trim()} onPress={() => setStep(2)} />
          <View style={{ height: 8 }} />
          <Btn label="Cancel" kind="ghost" onPress={onCancel} />
        </Card>
      )}

      {step === 2 && (
        <Card>
          <Text style={s.h1}>Select your dates</Text>
          <Text style={s.sub}>Format: YYYY-MM-DD</Text>
          <Field label="START" value={start} onChange={setStart} placeholder="2026-08-10" />
          <Field label="END" value={end} onChange={setEnd} placeholder="2026-08-17" />
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Chip label="3 days" selected={false} onPress={() => setEnd(plusDays(start, 2))} />
            <Chip label="1 week" selected={false} onPress={() => setEnd(plusDays(start, 6))} />
            <Chip label="2 weeks" selected={false} onPress={() => setEnd(plusDays(start, 13))} />
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
});
