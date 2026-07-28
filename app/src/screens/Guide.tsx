import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Image as RNImage,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { addFoodTip, deleteFoodTip, FoodTip, getGuide, getProfile, Guide as GuideT, listFoodTips, patchTrip, Trip } from '../api';
import { transitFor } from '../airlines';
import PlugArt from '../components/PlugArt';
import { countryName, flagOf } from '../countries';
import { Card, Chip } from '../components/ui';
import { C, tint, F } from '../theme';

const SECTIONS = ['know', 'eat', 'play', 'visit', 'go'];

export default function Guide({ trip, tripId, tripTitle, section, accent, country, place, onBack, onTripChanged }: {
  trip: Trip; tripId: string; tripTitle: string; section: string; accent: string;
  country: string | null; place: string; onBack: () => void; onTripChanged: (t: Trip) => void;
}) {
  const [air, setAir] = useState(trip.airline ?? '');
  const [tips, setTips] = useState<FoodTip[]>([]);
  const [tName, setTName] = useState('');
  const [tNote, setTNote] = useState('');
  const [tOrder, setTOrder] = useState('');
  const [tWhen, setTWhen] = useState('');
  const [tPhotos, setTPhotos] = useState<{ b64: string; mime: string; uri: string }[]>([]);
  const [tab, setTab] = useState(section);
  const [g2, setG] = useState<GuideT | null>(null);
  const [nat, setNat] = useState<string | null>(null);

  const load = useCallback(async (regen = false) => {
    try {
      const r = await getGuide(tripId, regen);
      setG(r.guide);
    } catch (e: any) { Alert.alert('Guide', e.message); }
  }, [tripId]);
  useEffect(() => {
    load();
    getProfile().then(p => setNat(p.nationality)).catch(() => {});
    listFoodTips(place, country).then(setTips).catch(() => {});
  }, [load, place, country]);

  const open = (url: string) => Linking.openURL(url).catch(() => {});
  const q = encodeURIComponent(place);

  if (!g2) {
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
            <Text style={{ color: accent, fontSize: 16, fontFamily: F.bold }}>‹ {tripTitle}</Text>
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
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                {[['none', 'No visa'], ['evisa', 'eVisa'], ['arrival', 'On arrival'], ['required', 'Visa required']].map(([v, l]) => {
                  const suggested = !trip.visa_status && g2?.visa_hint?.status === v;
                  return (
                  <Pressable key={v}
                    style={[sx.vChip,
                      suggested && { borderColor: accent, borderStyle: 'dashed' as const, backgroundColor: tint(accent, 0.08) },
                      trip.visa_status === v && { backgroundColor: accent, borderColor: accent }]}
                    onPress={async () => {
                      try { const t = await patchTrip(trip.id, { visa_status: v }); onTripChanged({ ...trip, ...t }); }
                      catch (e: any) { Alert.alert('Visa', e.message); }
                    }}>
                    <Text style={[sx.vChipText, trip.visa_status === v && { color: '#fff' }]}>{l}{suggested ? ' · suggested' : ''}</Text>
                  </Pressable>
                  );
                })}
              </View>
              {!trip.visa_status && !!g2?.visa_hint?.note && g2.visa_hint.status !== 'unknown' && (
                <Text style={[s.sub, { marginTop: 8 }]}>{g2.visa_hint.note}</Text>
              )}
              {!!trip.visa_status && (
                <Text style={[s.sub, { marginTop: 8, fontFamily: F.med }]}>Verified by you — from the official sources above.</Text>
              )}
              <Pressable onPress={() => open(`https://www.google.com/search?q=visa+requirements+for+${encodeURIComponent(nat ? countryName(nat) : '')}+citizens+${encodeURIComponent(country || place)}+official`)}>
                <Text style={[s.link, { color: accent }]}>Search official sources ›</Text>
              </Pressable>
            </Card>
            <Card>
              <Text style={s.h}>Power & plugs</Text>
              <Text style={s.rowName}>{g2.power.plugs || '—'}</Text>
              <PlugArt plugs={g2.power.plugs || ''} accent={accent} />
              {!!g2.power.note && <Text style={s.sub}>{g2.power.note}</Text>}
            </Card>
            <Card>
              <Text style={s.h}>Etiquette</Text>
              {g2.etiquette.map((e, i) => <Text key={i} style={s.bullet}>·  {e}</Text>)}
            </Card>
            <Card>
              <Text style={s.h}>Local sensitivities</Text>
              {g2.customs_flags.map((e, i) => <Text key={i} style={s.bullet}>·  {e}</Text>)}
              <Text style={s.disclaimer}>Cultural guidance, not legal advice — verify locally.</Text>
            </Card>
            {!!g2.airport?.code && (
              <Card>
                <Text style={s.h}>✈ Arrival · {g2.airport.code} {g2.airport.name}</Text>
                {!!g2.airport.to_city && <Text style={s.sub}>{g2.airport.to_city}</Text>}
                {g2.airport.highlights.map((h, i) => <Text key={i} style={s.bullet}>·  {h}</Text>)}
                {!!g2.airport.duty_free && <Text style={s.sub}>Duty free: {g2.airport.duty_free}</Text>}
                {!!g2.airport.smoking && <Text style={s.sub}>Smoking: {g2.airport.smoking}</Text>}
                {g2.airport.tips.map((h, i) => <Text key={`t${i}`} style={s.bullet}>·  {h}</Text>)}
                <Pressable onPress={() => open(`https://www.google.com/search?q=${g2.airport!.code}+airport+news+updates`)}>
                  <Text style={[s.link, { color: accent }]}>Latest {g2.airport.code} updates ›</Text>
                </Pressable>
              </Card>
            )}
            {trip.travel_mode === 'air' && (
              <Card>
                <Text style={s.h}>Your flight</Text>
                <TextInput style={sx.airInput} value={air} onChangeText={setAir}
                  placeholder="Airline name" placeholderTextColor="#9AA9BB" />
                {air.trim() !== (trip.airline ?? '') && (
                  <Pressable onPress={async () => {
                    try { const t = await patchTrip(trip.id, { airline: air.trim() }); onTripChanged({ ...trip, ...t }); }
                    catch (e: any) { Alert.alert('Airline', e.message); }
                  }}>
                    <Text style={[s.link, { color: accent }]}>Save airline ›</Text>
                  </Pressable>
                )}
                {!!(trip.airline ?? '').trim() && (
                  <Pressable onPress={() => open(`https://www.google.com/search?q=${encodeURIComponent(((trip.airline ?? '') + ' ' + (trip.cabin_class ?? '') + ' baggage allowance').trim())}`)}>
                    <Text style={[s.link, { color: accent }]}>{trip.airline} baggage policy ›</Text>
                  </Pressable>
                )}
                {(() => {
                  const hub = transitFor(trip.airline, country, nat);
                  return hub ? (
                    <>
                      <Text style={[s.sub, { marginTop: 8, fontFamily: F.med }]}>Likely transit via {hub.iata} · {hub.city} — based on {trip.airline}'s hub.</Text>
                      <Pressable onPress={() => open(`https://www.google.com/search?q=${hub.iata}+airport+transit+guide`)}>
                        <Text style={[s.link, { color: accent }]}>{hub.iata} transit guide ›</Text>
                      </Pressable>
                    </>
                  ) : null;
                })()}
                <Text style={s.disclaimer}>Allowances vary by fare and route — the official page is the truth; VoyageOS never guesses limits. Set your own bag target in Pack.</Text>
              </Card>
            )}
          </>
        )}
        {tab === 'eat' && (
          <>
            {g2.eat.length === 0 && <Card><Text style={s.sub}>Nothing yet — tap ↻ to write the food guide.</Text></Card>}
            {g2.eat.map((r, i) => (
              <Card key={i}>
                <Text style={s.h}>{r.name}</Text>
                {!!r.area && <Text style={[s.sub, { fontFamily: F.med }]}>{r.area}</Text>}
                {!!r.note && <Text style={s.sub}>{r.note}</Text>}
                {!!r.order && <Text style={[s.bullet, { marginTop: 8 }]}>·  Order: {r.order}</Text>}
                {!!r.when && <Text style={s.bullet}>·  Go: {r.when}</Text>}
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  <Pressable onPress={() => open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + ' ' + place)}`)}>
                    <Text style={[s.link, { color: accent, marginRight: 22 }]}>Map ›</Text>
                  </Pressable>
                  <Pressable onPress={() => open(`https://www.google.com/search?q=${encodeURIComponent(r.name + ' ' + place + ' reservation')}`)}>
                    <Text style={[s.link, { color: accent }]}>Reserve ›</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
            <Text style={sx.tipHead}>FROM TRAVELERS · {place.toUpperCase()}</Text>
            {tips.map(t => (
              <Card key={t.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[s.h, { flex: 1, marginBottom: 0 }]}>{t.restaurant}</Text>
                  {t.is_mine && (
                    <Pressable hitSlop={10} onPress={async () => {
                      try { await deleteFoodTip(t.id); setTips(tips.filter(x => x.id !== t.id)); } catch {}
                    }}>
                      <Text style={{ color: C.sub }}>✕</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={[s.sub, { fontFamily: F.med }]}>{t.author}</Text>
                {!!t.note && <Text style={s.sub}>{t.note}</Text>}
                {!!t.order_rec && <Text style={[s.bullet, { marginTop: 6 }]}>·  Order: {t.order_rec}</Text>}
                {!!t.when_rec && <Text style={s.bullet}>·  Go: {t.when_rec}</Text>}
                {!!t.photos?.length && (
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    {t.photos.map((u, pi) => <RNImage key={pi} source={{ uri: u }} style={sx.tipImg} />)}
                  </View>
                )}
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  <Pressable onPress={() => open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.restaurant + ' ' + place)}`)}>
                    <Text style={[s.link, { color: accent, marginRight: 22 }]}>Map ›</Text>
                  </Pressable>
                  <Pressable onPress={() => open(`https://www.google.com/search?q=${encodeURIComponent(t.restaurant + ' ' + place + ' reservation')}`)}>
                    <Text style={[s.link, { color: accent }]}>Reserve ›</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
            <Card style={{ backgroundColor: tint(accent, 0.06) }}>
              <Text style={s.h}>Share a find</Text>
              <TextInput style={sx.tipInput} value={tName} onChangeText={setTName}
                placeholder="Restaurant name" placeholderTextColor="#9AA9BB" />
              <TextInput style={sx.tipInput} value={tOrder} onChangeText={setTOrder}
                placeholder="What to order" placeholderTextColor="#9AA9BB" />
              <TextInput style={sx.tipInput} value={tWhen} onChangeText={setTWhen}
                placeholder="When to go" placeholderTextColor="#9AA9BB" />
              <TextInput style={[sx.tipInput, { minHeight: 60 }]} value={tNote} onChangeText={setTNote}
                multiline placeholder="Why it's worth it…" placeholderTextColor="#9AA9BB" />
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {tPhotos.map((p, pi) => (
                  <Pressable key={pi} onPress={() => setTPhotos(tPhotos.filter((_, j) => j !== pi))}>
                    <RNImage source={{ uri: p.uri }} style={sx.tipThumb} />
                  </Pressable>
                ))}
                {tPhotos.length < 2 && (
                  <Pressable style={sx.tipAdd} onPress={async () => {
                    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.4, base64: true });
                    const a2 = r.assets?.[0];
                    if (!r.canceled && a2?.base64) setTPhotos([...tPhotos, { b64: a2.base64, mime: a2.mimeType ?? 'image/jpeg', uri: a2.uri }]);
                  }}>
                    <Text style={{ color: accent, fontSize: 20, fontFamily: F.bold }}>+</Text>
                  </Pressable>
                )}
              </View>
              <Pressable disabled={tName.trim().length < 2} onPress={async () => {
                try {
                  const t = await addFoodTip({ place_name: place, country_code: country,
                    restaurant: tName.trim(), note: tNote.trim(), order_rec: tOrder.trim(), when_rec: tWhen.trim(),
                    photos: tPhotos.map(p => ({ b64: p.b64, mime: p.mime })) });
                  setTips([t, ...tips]); setTName(''); setTNote(''); setTOrder(''); setTWhen(''); setTPhotos([]);
                } catch (e: any) { Alert.alert('Tip', e.message); }
              }}>
                <Text style={[s.link, { color: accent, textAlign: 'center' }]}>Post it ›</Text>
              </Pressable>
              <Text style={s.disclaimer}>Visible to every VoyageOS traveler headed to {place}.</Text>
            </Card>
          </>
        )}
        {tab === 'play' && <Card><Text style={s.h}>Experiences</Text><Rows items={g2.play} /></Card>}
        {tab === 'visit' && <Card><Text style={s.h}>Sights & districts</Text><Rows items={g2.visit} /></Card>}
        {tab === 'go' && (
          <>
            <Card>
              <Text style={s.h}>From the airport</Text>
              {g2.go.from_airport.map((e, i) => <Text key={i} style={s.bullet}>·  {e}</Text>)}
              <Pressable onPress={() => open(`https://www.google.com/maps/dir/?api=1&destination=${q}`)}>
                <Text style={[s.link, { color: accent }]}>Directions to {place} ›</Text>
              </Pressable>
            </Card>
            <Card>
              <Text style={s.h}>Getting around</Text>
              {g2.go.around.map((e, i) => <Text key={i} style={s.bullet}>·  {e}</Text>)}
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
  h: { fontSize: 16, fontFamily: F.bold, color: C.text, marginBottom: 8 },
  row: { marginBottom: 12 },
  rowName: { fontSize: 15, fontFamily: F.med, color: C.text },
  sub: { color: C.sub, marginTop: 3, lineHeight: 19 },
  bullet: { color: C.text, marginBottom: 7, lineHeight: 20 },
  link: { fontFamily: F.bold, marginTop: 10 },
  disclaimer: { color: '#9AA9BB', fontSize: 11, marginTop: 10, textAlign: 'center', lineHeight: 16 },
});

const sx = StyleSheet.create({
  vChip: { borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginRight: 6, marginBottom: 6 },
  vChipText: { color: C.text, fontFamily: F.bold, fontSize: 12 },
  tipHead: { color: C.sub, fontSize: 12, fontFamily: F.bold, letterSpacing: 0.8, marginTop: 6, marginBottom: 10 },
  tipImg: { width: 110, height: 110, borderRadius: 12, marginRight: 8 },
  tipThumb: { width: 50, height: 50, borderRadius: 10, marginRight: 8 },
  tipAdd: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  tipInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.text, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  airInput: { backgroundColor: '#F1F4F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.text },
});
