import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { getGuide, getProfile, Guide as GuideT } from '../api';
import { countryName, flagOf } from '../countries';
import { Card, Chip } from '../components/ui';
import { C, tint } from '../theme';

const SECTIONS = ['know', 'eat', 'play', 'visit', 'go'];

export default function Guide({ tripId, tripTitle, section, accent, country, place, onBack }: {
  tripId: string; tripTitle: string; section: string; accent: string;
  country: string | null; place: string; onBack: () => void;
}) {
  const [tab, setTab] = useState(section);
  const [g, setG] = useState<GuideT | null>(null);
  const [nat, setNat] = useState<string | null>(null);

  const load = useCallback(async (regen = false) => {
    try {
      const r = await getGuide(tripId, regen);
      setG(r.guide);
    } catch (e: any) { Alert.alert('Guide', e.message); }
  }, [tripId]);
  useEffect(() => { load(); getProfile().then(p => setNat(p.nationality)).catch(() => {}); }, [load]);

  const open = (url: string) => Linking.openURL(url).catch(() => {});
  const q = encodeURIComponent(place);

  if (!g) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={s.loading}>Writing your {tripTitle} guide…</Text>
      </View>
    );
  }

  const Rows = ({ items }: { items: { name: string; note: string }[] }) => (
    <>
      {items.length === 0 && <Text style={s.sub}>Nothing here yet — try ↻ regenerate.</Text>}
      {items.map((it, i) => (
        <View key={i} style={s.row}>
          <Text style={s.rowName}>{it.name}</Text>
          {!!it.note && <Text style={s.sub}>{it.note}</Text>}
        </View>
      ))}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 20, paddingBottom: 8 }}>
        <View style={s.header}>
          <Pressable onPress={onBack} hitSlop={10}>
            <Text style={{ color: accent, fontSize: 16, fontWeight: '800' }}>‹ {tripTitle}</Text>
          </Pressable>
          <Pressable hitSlop={10} onPress={() =>
            Alert.alert('Rewrite guide?', 'Calls the model again (a few cents).', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Rewrite', onPress: () => { setG(null); load(true); } },
            ])}>
            <Text style={{ color: accent, fontSize: 18 }}>↻</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SECTIONS.map(k => (
            <Chip key={k} label={k[0].toUpperCase() + k.slice(1)} selected={tab === k}
              color={accent} onPress={() => setTab(k)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
        {tab === 'know' && (
          <>
            <Card style={{ backgroundColor: tint(accent, 0.10), borderColor: tint(accent, 0.2) }}>
              <Text style={s.h}>Entry & visa</Text>
              <Text style={s.sub}>
                {nat
                  ? `For ${flagOf(nat)} ${countryName(nat)} passport holders — rules change often, so VoyageOS links official sources instead of guessing.`
                  : 'Rules depend on your nationality — set it in Profile and this card gets personal. Meanwhile, the official sources:'}
              </Text>
              <Pressable onPress={() => open('https://www.iatatravelcentre.com/')}>
                <Text style={[s.link, { color: accent }]}>IATA Travel Centre ›</Text>
              </Pressable>
              <Pressable onPress={() => open(`https://www.google.com/search?q=visa+requirements+for+${encodeURIComponent(nat ? countryName(nat) : '')}+citizens+${encodeURIComponent(country || place)}+official`)}>
                <Text style={[s.link, { color: accent }]}>Search official sources ›</Text>
              </Pressable>
            </Card>
            <Card>
              <Text style={s.h}>Power & plugs</Text>
              <Text style={s.rowName}>{g.power.plugs || '—'}</Text>
              {!!g.power.note && <Text style={s.sub}>{g.power.note}</Text>}
            </Card>
            <Card>
              <Text style={s.h}>Etiquette</Text>
              {g.etiquette.map((e, i) => <Text key={i} style={s.bullet}>·  {e}</Text>)}
            </Card>
            <Card>
              <Text style={s.h}>Local sensitivities</Text>
              {g.customs_flags.map((e, i) => <Text key={i} style={s.bullet}>·  {e}</Text>)}
              <Text style={s.disclaimer}>Cultural guidance, not legal advice — verify locally.</Text>
            </Card>
          </>
        )}
        {tab === 'eat' && <Card><Text style={s.h}>Worth the trip alone</Text><Rows items={g.eat} /></Card>}
        {tab === 'play' && <Card><Text style={s.h}>Experiences</Text><Rows items={g.play} /></Card>}
        {tab === 'visit' && <Card><Text style={s.h}>Sights & districts</Text><Rows items={g.visit} /></Card>}
        {tab === 'go' && (
          <>
            <Card>
              <Text style={s.h}>From the airport</Text>
              {g.go.from_airport.map((e, i) => <Text key={i} style={s.bullet}>·  {e}</Text>)}
              <Pressable onPress={() => open(`https://www.google.com/maps/dir/?api=1&destination=${q}`)}>
                <Text style={[s.link, { color: accent }]}>Directions to {place} ›</Text>
              </Pressable>
            </Card>
            <Card>
              <Text style={s.h}>Getting around</Text>
              {g.go.around.map((e, i) => <Text key={i} style={s.bullet}>·  {e}</Text>)}
              <Pressable onPress={() => open(`https://www.google.com/maps/search/?api=1&query=public+transport+${q}`)}>
                <Text style={[s.link, { color: accent }]}>Open the map ›</Text>
              </Pressable>
            </Card>
          </>
        )}
        <Text style={s.disclaimer}>Written by AI from general knowledge — taste is opinion, logistics deserve a double-check.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  loading: { color: C.sub, marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 8 },
  row: { marginBottom: 12 },
  rowName: { fontSize: 15, fontWeight: '700', color: C.text },
  sub: { color: C.sub, marginTop: 3, lineHeight: 19 },
  bullet: { color: C.text, marginBottom: 7, lineHeight: 20 },
  link: { fontWeight: '800', marginTop: 10 },
  disclaimer: { color: '#9AA9BB', fontSize: 11, marginTop: 10, textAlign: 'center', lineHeight: 16 },
});
