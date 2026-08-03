import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getGuide, patchTrip, Trip } from '../api';
import { F, P, RA, S, T } from '../theme';

const MODEK: Record<string, string> = { air: 'airport', ship: 'port', train: 'station', car: 'road' };

function fmt(mins: number) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export default function DepartureCard({ trip, accent, onOpenPacking, onTripChanged }: {
  trip: Trip; accent: string; onOpenPacking: () => void; onTripChanged: (t: Trip) => void;
}) {
  const [souvenirs, setSouvenirs] = useState<{ name: string; note: string; price_band: string }[]>([]);
  const [gatewayName, setGatewayName] = useState<string>('the airport');
  const [timeInput, setTimeInput] = useState(trip.depart_time ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGuide(trip.id).then(r => {
      setSouvenirs(r.guide.souvenirs ?? []);
      const gws = r.guide.gateways ?? [];
      const want = MODEK[trip.travel_mode ?? ''] ?? null;
      const gw = gws.find(g => g.kind === want) ?? gws[0];
      if (gw?.name) setGatewayName(gw.name);
    }).catch(() => {});
  }, [trip.id, trip.travel_mode]);

  const isAir = trip.travel_mode === 'air' || !trip.travel_mode;
  let leaveLine: string;
  if (trip.depart_time && /^\d{1,2}:\d{2}$/.test(trip.depart_time)) {
    const [h, m] = trip.depart_time.split(':').map(Number);
    const dep = h * 60 + m;
    const buffer = isAir ? 180 : 60;
    const ride = 45;
    leaveLine = `Be at ${gatewayName} by ~${fmt(dep - buffer)} for your ${trip.depart_time} departure — leave your stay around ${fmt(dep - buffer - ride)} to cover the ride and enjoy the airport.`;
  } else {
    leaveLine = isAir
      ? `Aim to reach ${gatewayName} about 3 hours before an international flight (2 for domestic); leave your stay earlier to cover the ride.`
      : `Give yourself a comfortable buffer to reach ${gatewayName} and check in.`;
  }

  async function saveTime() {
    if (!/^\d{1,2}:\d{2}$/.test(timeInput.trim())) {
      Alert.alert('Return time', 'Use HH:MM, e.g. 14:20.');
      return;
    }
    setSaving(true);
    try {
      const t = await patchTrip(trip.id, { depart_time: timeInput.trim() });
      onTripChanged({ ...trip, ...t });
    } catch (e: any) { Alert.alert('Return time', e.message); }
    finally { setSaving(false); }
  }

  return (
    <View style={[s.card, { borderColor: accent }]}>
      <Text style={[s.kicker, { color: accent }]}>HEADING HOME</Text>

      <Text style={s.h}>Leave-by</Text>
      <Text style={s.body}>{leaveLine}</Text>
      {!trip.depart_time && (
        <View style={s.row}>
          <TextInput style={s.input} value={timeInput} onChangeText={setTimeInput}
            placeholder="Return flight time (HH:MM)" placeholderTextColor={P.textMuted} />
          <Pressable disabled={saving} onPress={saveTime}>
            <Text style={[s.save, { color: accent }]}>{saving ? '…' : 'Set'}</Text>
          </Pressable>
        </View>
      )}

      <Text style={[s.h, { marginTop: 16 }]}>Pack-out</Text>
      <Text style={s.body}>Still in use — grab these last: charger, meds, glasses, anything on the nightstand or in the bathroom.</Text>
      <Pressable onPress={onOpenPacking}>
        <Text style={[s.link, { color: accent }]}>Re-check your packing list ›</Text>
      </Pressable>

      {souvenirs.length > 0 && (
        <>
          <Text style={[s.h, { marginTop: 16 }]}>Bring home</Text>
          {souvenirs.map((sv, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={s.svName}>{sv.name}{sv.price_band ? `  ·  ${sv.price_band}` : ''}</Text>
              {!!sv.note && <Text style={s.body}>{sv.note}</Text>}
            </View>
          ))}
          <Text style={s.disclaimer}>Typical prices for orientation — confirm at the shop.</Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: P.card, borderRadius: RA.xl, padding: S[4] + 2,
    marginBottom: S[3], borderWidth: 2,
  },
  // Every weight here was a fontWeight literal — 800 four times, 700 once —
  // with no fontFamily at all. Against a single-weight Satoshi that makes the
  // renderer smear the regular cut rather than reach for the bold one it
  // ships. The T scale carries the real faces.
  kicker: { ...T.label },
  h: { ...T.title, fontFamily: F.bold, color: P.textPri, marginBottom: S[1] },
  body: { ...T.body, color: P.textSec, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: S[2] },
  input: {
    flex: 1, backgroundColor: P.sunken, borderRadius: RA.md,
    paddingHorizontal: S[3] + 2, paddingVertical: S[2] + 2, ...T.body, color: P.textPri,
  },
  save: { ...T.body, fontFamily: F.bold, marginLeft: S[3] },
  link: { ...T.body, fontFamily: F.bold, marginTop: S[2] },
  svName: { ...T.body, fontFamily: F.bold, color: P.textPri },
  disclaimer: { ...T.caption, color: P.textMuted, marginTop: S[1] + 2 },
});
