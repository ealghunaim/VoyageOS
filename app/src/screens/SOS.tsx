import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGuide, getProfile, getTrip } from '../api';
import { Card } from '../components/ui';
import { countryName, flagOf } from '../countries';
import { EMERGENCY } from '../emergency';
import { C, tint, F } from '../theme';

export default function SOS({ tripId, tripTitle, place, accent, onBack }: {
  tripId: string; tripTitle: string; place: string; accent: string; onBack: () => void;
}) {
  const [cc, setCc] = useState<string | null>(null);
  const [contact, setContact] = useState<{ name: string; phone: string } | null>(null);
  const [health, setHealth] = useState<string[]>([]);

  useEffect(() => {
    getTrip(tripId).then(t => setCc(t.destinations[0]?.country_code ?? null)).catch(() => {});
    getProfile().then(p => setContact(p.emergency_contact ?? null)).catch(() => {});
    getGuide(tripId).then(r => setHealth(r.guide.health ?? [])).catch(() => {});
  }, [tripId]);

  const nums = cc ? EMERGENCY[cc.toUpperCase()] : undefined;
  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => {});
  const map = (q: string) =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + ' near ' + place)}`).catch(() => {});

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20 }}>
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 10 }}>
        <Text style={{ color: accent, fontSize: 16, fontFamily: F.bold }}>‹ {tripTitle}</Text>
      </Pressable>
      <Text style={s.h1}>SOS</Text>

      <Card style={{ backgroundColor: tint(C.red, 0.07), borderColor: tint(C.red, 0.2) }}>
        <Text style={s.section}>EMERGENCY NUMBERS {cc ? `· ${flagOf(cc)} ${countryName(cc)}` : ''}</Text>
        {nums ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {nums.all && (
              <Pressable style={s.callBtn} onPress={() => call(nums.all!)}>
                <Text style={s.callText}>Call {nums.all}</Text>
              </Pressable>
            )}
            {nums.police && (
              <Pressable style={s.callBtn} onPress={() => call(nums.police!)}>
                <Text style={s.callText}>Police {nums.police}</Text>
              </Pressable>
            )}
            {nums.ambulance && (
              <Pressable style={s.callBtn} onPress={() => call(nums.ambulance!)}>
                <Text style={s.callText}>Ambulance {nums.ambulance}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Text style={s.sub}>Set the trip's country to see its emergency numbers. 112 reaches services in much of the world.</Text>
        )}
        <Text style={s.hint}>Curated data, not AI — still confirm locally on arrival.</Text>
      </Card>

      <Card>
        <Text style={s.section}>YOUR PERSON</Text>
        {contact ? (
          <Pressable style={[s.callBtn, { backgroundColor: tint(accent, 0.12) }]} onPress={() => call(contact.phone)}>
            <Text style={[s.callText, { color: accent }]}>Call {contact.name}</Text>
          </Pressable>
        ) : (
          <Text style={s.sub}>Add an emergency contact in Profile and they'll be one tap away here.</Text>
        )}
      </Card>

      <Card>
        <Text style={s.section}>NEARBY CARE</Text>
        <Pressable onPress={() => map('hospital')}><Text style={[s.link, { color: accent }]}>Hospitals near {place} ›</Text></Pressable>
        <Pressable onPress={() => map('clinic')}><Text style={[s.link, { color: accent }]}>Clinics ›</Text></Pressable>
        <Pressable onPress={() => map('pharmacy')}><Text style={[s.link, { color: accent }]}>Pharmacies ›</Text></Pressable>
      </Card>

      {health.length > 0 && (
        <Card>
          <Text style={s.section}>HEALTH PACKING</Text>
          {health.map((h, i) => <Text key={i} style={s.bullet}>·  {h}</Text>)}
          <Text style={s.hint}>AI suggestions — your doctor outranks your app.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 30, fontFamily: F.bold, color: C.text, letterSpacing: -0.6, marginBottom: 14 },
  section: { color: C.sub, fontSize: 12, fontFamily: F.bold, letterSpacing: 0.6, marginBottom: 10 },
  sub: { color: C.sub, lineHeight: 20 },
  hint: { color: '#9AA9BB', fontSize: 11, marginTop: 10 },
  callBtn: { backgroundColor: tint('#DC2626', 0.12), borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, marginBottom: 8 },
  callText: { color: C.red, fontFamily: F.bold },
  link: { fontFamily: F.bold, marginBottom: 12 },
  bullet: { color: C.text, marginBottom: 7, lineHeight: 20 },
});
