import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Image as RNImage,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getFamilyPlay, FamilyActivity, addFoodTip, deleteFoodTip, dishPhoto, FoodTip, getGuidePart, getProfile, getTrip, Guide as GuideT, listFoodTips, patchTrip, placePhotos, PlacePhoto, TipCategory, Trip, TripDetail } from '../api';
import { transitFor } from '../airlines';
import JourneyLoader from '../components/JourneyLoader';
import PlugArt from '../components/PlugArt';
import { countryName, flagOf } from '../countries';
import { Card, Chip } from '../components/ui';
import { tint, F, P, S, RA, T } from '../theme';

const SECTIONS = ['know', 'eat', 'play', 'visit', 'go'];

// Full-shape guide with empty defaults, so a half-loaded (phase A or B only)
// guide renders without touching an undefined field.
const _emptyGw = { kind: 'airport', code: '', name: '', to_city: '', highlights: [], duty_free: '', smoking: '', tips: [] };
const blankGuide = (): GuideT => ({
  power: { plugs: '', note: '' },
  etiquette: [], customs_flags: [], task_suggestions: [], health: [],
  dishes: [], restaurants: [], eat: [], play: [], visit: [], souvenirs: [],
  visa_hint: { status: 'unknown', note: '' },
  gateways: [], gateway: { ..._emptyGw }, airport: { ..._emptyGw },
  go: { from_origin: [], from_airport: [], around: [] },
} as any);

export default function Guide({ trip, tripId, tripTitle, section, accent, country: countryProp, place: placeProp, onBack, onTripChanged }: {
  trip: Trip; tripId: string; tripTitle: string; section: string; accent: string;
  country: string | null; place: string; onBack: () => void; onTripChanged: (t: Trip) => void;
}) {
  const [air, setAir] = useState(trip.airline ?? '');
  const [arrivalKind, setArrivalKind] = useState<string | null>(null);
  // findings are per guide section; keyed so switching tabs doesn't mix them
  const [tips, setTips] = useState<Record<string, FoodTip[]>>({});
  const [tName, setTName] = useState('');
  const [tNote, setTNote] = useState('');
  const [tOrder, setTOrder] = useState('');
  const [tWhen, setTWhen] = useState('');
  const [tPhotos, setTPhotos] = useState<{ b64: string; mime: string; uri: string }[]>([]);
  const [tab, setTab] = useState(section);
  const [familyPlay, setFamilyPlay] = useState<{ activities: FamilyActivity[] } | null>(null);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [dishPhotos, setDishPhotos] = useState<Record<string, string>>({});
  // Landmark photos for Visit and Play. null is cached deliberately: about a
  // third of items have no publishable photo, and without keeping the misses
  // every re-render would ask again to be told the same thing.
  const [placePics, setPlacePics] = useState<Record<string, PlacePhoto | null>>({});
  const [g2, setG] = useState<GuideT | null>(null);
  const [aReady, setAReady] = useState(false);
  const [bReady, setBReady] = useState(false);
  const [nat, setNat] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<TripDetail['destinations']>([]);
  const [destId, setDestId] = useState<string | undefined>(undefined);

  // Which stop is showing. destId stays undefined until the user actually
  // switches, so the very first load matches the old single-destination
  // behavior exactly (backend defaults to the first stop by seq).
  const activeDestId = destId ?? destinations[0]?.id;
  const selectedDest = destinations.find(d => d.id === activeDestId);
  const place = selectedDest?.place_name ?? placeProp;
  const country = selectedDest?.country_code ?? countryProp;

  useEffect(() => {
    getTrip(tripId).then(t => setDestinations(t.destinations ?? [])).catch(() => {});
  }, [tripId]);

  const selectDestination = (id: string) => {
    if (id === activeDestId) return;
    setDestId(id);
    setG(null);
    setAReady(false);
    setBReady(false);
    setDishPhotos({});
  };

  const load = useCallback(async (regen = false) => {
    if (regen) { setAReady(false); setBReady(false); }
    // Two-phase: A (Know+Eat, fast) and B (Play/Visit/Go) fetch in parallel and
    // merge as each lands. A and B write disjoint fields, so merge order is safe.
    const merge = (part: Partial<GuideT>) => setG(prev => ({ ...(prev ?? blankGuide()), ...part } as GuideT));
    const pa = getGuidePart(tripId, 'a', destId, regen)
      .then(r => { merge(r.guide); setAReady(true); })
      .catch(e => Alert.alert('Guide', e.message));
    getGuidePart(tripId, 'b', destId, regen)
      .then(r => { merge(r.guide); setBReady(true); })
      .catch(() => {});   // a phase-B hiccup shouldn't block the whole guide
    await pa;
  }, [tripId, destId]);
  const hasParty = (trip.traveler_types?.length ?? 0) > 0 || !!trip.with_kids;
  useEffect(() => {
    if (tab !== 'play' || !hasParty || familyPlay) return;
    setFamilyBusy(true);
    getFamilyPlay(trip.id)
      .then(setFamilyPlay)
      .catch(() => setFamilyPlay({ activities: [] }))
      .finally(() => setFamilyBusy(false));
  }, [tab, hasParty, trip.id, familyPlay]);

  const redoFamily = () => {
    setFamilyBusy(true);
    getFamilyPlay(trip.id, true).then(setFamilyPlay).catch(() => {}).finally(() => setFamilyBusy(false));
  };
  const COHORT_LABEL: Record<string, string> = {
    toddlers: '0–3', young: '4–7', older: '8–12', teens: 'Teens',
    solo: 'Solo', partner: 'Partner', adults: 'Adults', elderly: 'Elderly',
  };
  const COHORT_ORDER = ['toddlers', 'young', 'older', 'teens', 'solo', 'partner', 'adults', 'elderly'];

  useEffect(() => {
    const dishes = g2?.dishes ?? [];
    if (!dishes.length) return;
    let cancelled = false;
    (async () => {
      for (const d of dishes) {
        if (dishPhotos[d.name]) continue;
        try {
          const r = await dishPhoto(d.name, place);
          if (!cancelled && r.url) setDishPhotos(p => ({ ...p, [d.name]: r.url as string }));
        } catch { /* skip */ }
      }
    })();
    return () => { cancelled = true; };
  }, [g2?.dishes, place]);

  // One batch call rather than one request per item: a guide carries roughly
  // 20 sights and experiences, and several of them are the same entity in both
  // sections, so the server deduplicates and answers in a single round trip.
  useEffect(() => {
    const names = [...(g2?.visit ?? []).map(v => v.name),
                   ...(g2?.play ?? []).map(v => v.name)];
    const wanted = names.filter(n => !(n in placePics));
    if (!activeDestId || !wanted.length) return;
    let cancelled = false;
    placePhotos(activeDestId, wanted)
      .then(r => { if (!cancelled) setPlacePics(p => ({ ...p, ...r })); })
      .catch(() => { /* no photo is an acceptable outcome */ });
    return () => { cancelled = true; };
  }, [g2?.visit, g2?.play, activeDestId]);

  useEffect(() => {
    load();
    getProfile().then(p => setNat(p.nationality)).catch(() => {});
    (['eat', 'play', 'visit', 'go'] as TipCategory[]).forEach(c =>
      listFoodTips(place, country, c)
        .then(rows => setTips(prev => ({ ...prev, [c]: rows })))
        .catch(() => {}));
  }, [load, place, country]);

  const open = (url: string) => Linking.openURL(url).catch(() => {});
  const q = encodeURIComponent(place);

  if (!g2) {
    return (
      <View style={s.center}>
        <JourneyLoader accent={accent} label="Writing your guide..." />
        <Text style={s.loading}>Writing your {tripTitle} guide…</Text>
      </View>
    );
  }


  /** What a find is called in each section, so the form never says
   *  "Restaurant name" under Visit. */
  const FIND_COPY: Record<TipCategory, { head: string; name: string; a: string; b: string }> = {
    eat:   { head: 'FROM TRAVELERS', name: 'Restaurant name', a: 'What to order', b: 'When to go' },
    play:  { head: 'TRAVELER FINDS', name: 'Experience name', a: 'What to book',  b: 'Best time' },
    visit: { head: 'TRAVELER FINDS', name: 'Place name',      a: 'What to see',   b: 'Best time' },
    go:    { head: 'TRAVELER TIPS',  name: 'Route or stop',    a: 'Which line / pass', b: 'When it runs' },
  };

  /** Search links rather than model-supplied URLs — the guide prompts forbid
   *  inventing addresses, and a wrong link is worse than one extra tap. */
  const linksFor = (name: string) => (
    <View style={{ flexDirection: 'row', marginTop: S[1] }}>
      <Pressable onPress={() => open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + place)}`)}>
        <Text style={[s.link, { color: accent, marginRight: S[6] }]}>Map ›</Text>
      </Pressable>
      <Pressable onPress={() => open(`https://www.google.com/search?q=${encodeURIComponent(name + ' ' + place + ' official site')}`)}>
        <Text style={[s.link, { color: accent }]}>Website ›</Text>
      </Pressable>
    </View>
  );

  const Findings = ({ category }: { category: TipCategory }) => {
    const copy = FIND_COPY[category];
    const rows = tips[category] ?? [];
    return (
      <>
        <Text style={sx.tipHead}>{copy.head} · {place.toUpperCase()}</Text>
        {rows.map(t => (
          <Card key={t.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[s.h, { flex: 1, marginBottom: 0 }]}>{t.restaurant}</Text>
              {t.is_mine && (
                <Pressable hitSlop={10} onPress={async () => {
                  try {
                    await deleteFoodTip(t.id);
                    setTips(prev => ({ ...prev, [category]: (prev[category] ?? []).filter(x => x.id !== t.id) }));
                  } catch {}
                }}>
                  <Text style={{ color: P.textSec }}>✕</Text>
                </Pressable>
              )}
            </View>
            <Text style={[s.sub, { fontFamily: F.med }]}>{t.author}</Text>
            {!!t.note && <Text style={s.sub}>{t.note}</Text>}
            {!!t.order_rec && <Text style={[s.bullet, { marginTop: S[2] }]}>·  {t.order_rec}</Text>}
            {!!t.when_rec && <Text style={s.bullet}>·  {t.when_rec}</Text>}
            {!!t.photos?.length && (
              <View style={{ flexDirection: 'row', marginTop: S[2] }}>
                {t.photos.map((u, pi) => <RNImage key={pi} source={{ uri: u }} style={sx.tipImg} />)}
              </View>
            )}
            {linksFor(t.restaurant)}
          </Card>
        ))}
        <Card style={{ backgroundColor: tint(accent, 0.06) }}>
          <Text style={s.h}>Share a find</Text>
          <TextInput style={sx.tipInput} value={tName} onChangeText={setTName}
            placeholder={copy.name} placeholderTextColor={P.textMuted} />
          <TextInput style={sx.tipInput} value={tOrder} onChangeText={setTOrder}
            placeholder={copy.a} placeholderTextColor={P.textMuted} />
          <TextInput style={sx.tipInput} value={tWhen} onChangeText={setTWhen}
            placeholder={copy.b} placeholderTextColor={P.textMuted} />
          <TextInput style={[sx.tipInput, { minHeight: 60 }]} value={tNote} onChangeText={setTNote}
            multiline placeholder="Why it's worth it…" placeholderTextColor={P.textMuted} />
          <View style={{ flexDirection: 'row', marginBottom: S[2] }}>
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
                <Text style={[s.addPlus, { color: accent }]}>+</Text>
              </Pressable>
            )}
          </View>
          <Pressable disabled={tName.trim().length < 2} onPress={async () => {
            try {
              const t = await addFoodTip({ category, place_name: place, country_code: country,
                restaurant: tName.trim(), note: tNote.trim(), order_rec: tOrder.trim(),
                when_rec: tWhen.trim(), photos: tPhotos.map(p => ({ b64: p.b64, mime: p.mime })) });
              setTips(prev => ({ ...prev, [category]: [t, ...(prev[category] ?? [])] }));
              setTName(''); setTNote(''); setTOrder(''); setTWhen(''); setTPhotos([]);
            } catch (e: any) { Alert.alert('Find', e.message); }
          }}>
            <Text style={[s.link, { color: accent, textAlign: 'center' }]}>Post it ›</Text>
          </Pressable>
          <Text style={s.disclaimer}>Visible to every VoyageOS traveler headed to {place}.</Text>
        </Card>
      </>
    );
  };

  // The photo is labelled with the Wikimedia article it came from, not with
  // the guide item. A confident match can legitimately be the containing
  // district — Arashiyama for its bamboo grove — which is true and useful when
  // named honestly, and a false claim about a real place when captioned as the
  // item. Attribution is not decoration: CC BY and CC BY-SA both require the
  // author and licence, so the server withholds any photo it cannot attribute.
  const PlaceImage = ({ name }: { name: string }) => {
    const ph = placePics[name];
    if (!ph) return null;
    return (
      <View style={sx.photoWrap}>
        <RNImage source={{ uri: ph.url }} style={sx.photo} resizeMode="cover" />
        <Pressable onPress={() => ph.page && open(ph.page)} hitSlop={6}>
          <Text style={sx.photoCredit} numberOfLines={1}>
            {ph.title} · {ph.credit} · {ph.license}
          </Text>
        </Pressable>
      </View>
    );
  };

  const Rows = ({ items }: { items: { name: string; note: string }[] }) => (
    <>
      {items.length === 0 && <Text style={s.sub}>Nothing here yet — try ↻ regenerate.</Text>}
      {items.map((it, i) => (
        <View key={i} style={s.row}>
          <Text style={s.rowName}>{it.name}</Text>
          {!!it.note && <Text style={s.sub}>{it.note}</Text>}
          <PlaceImage name={it.name} />
          {linksFor(it.name)}
        </View>
      ))}
    </>
  );

  const FEE_LABEL: Record<string, string> = { free: 'Free', low: '$', mid: '$$', high: '$$$' };
  const VisitRows = ({ items }: { items: GuideT['visit'] }) => (
    <>
      {items.length === 0 && <Text style={s.sub}>Nothing here yet — try ↻ regenerate.</Text>}
      {items.map((it, i) => (
        <View key={i} style={s.row}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[s.rowName, { flex: 1 }]}>{it.name}</Text>
            {typeof it.rating === 'number' && (
              <Text style={s.rating}>★ {it.rating.toFixed(1)}</Text>
            )}
          </View>
          {!!it.note && <Text style={s.sub}>{it.note}</Text>}
          {(!!it.fee || !!it.access) && (
            <Text style={[s.sub, { marginTop: S[1] }]}>
              {[it.fee ? (FEE_LABEL[it.fee] ?? it.fee) : '', it.access ? '♿ ' + it.access : ''].filter(Boolean).join('  ·  ')}
            </Text>
          )}
          <PlaceImage name={it.name} />
        </View>
      ))}
      {items.length > 0 && <Text style={[s.disclaimer, { marginTop: S[1] }]}>Ratings & fees are AI estimates — confirm before you go.</Text>}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: P.pageBg }}>
      <View style={{ padding: 20, paddingBottom: 8 }}>
        <View style={s.header}>
          <Pressable onPress={onBack} hitSlop={10}>
            <Text style={[s.back, { color: accent }]}>‹ {tripTitle}</Text>
          </Pressable>
          <Pressable hitSlop={10} onPress={() =>
            Alert.alert('Rewrite guide?', 'Calls the model again (a few cents).', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Rewrite', onPress: () => { setG(null); load(true); } },
            ])}>
            <Text style={[s.regen, { color: accent }]}>↻</Text>
          </Pressable>
        </View>
        {destinations.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {destinations.map(d => (
              <Pressable key={d.id} onPress={() => selectDestination(d.id)}
                style={[sx.vChip, d.id === activeDestId && { backgroundColor: accent, borderColor: accent }]}>
                <Text style={[sx.vChipText, d.id === activeDestId && { color: P.textOnDark }]}>{d.place_name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SECTIONS.map(k => (
            <Chip key={k} label={k[0].toUpperCase() + k.slice(1)} selected={tab === k}
              color={accent} onPress={() => setTab(k)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
        {tab === 'know' && !aReady && <Card><JourneyLoader accent={accent} label="Loading essentials…" /></Card>}
        {tab === 'know' && aReady && (
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
                    <Text style={[sx.vChipText, trip.visa_status === v && { color: P.textOnDark }]}>{l}{suggested ? ' · suggested' : ''}</Text>
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
            {/*
              Driving. Every word here is written by us, not the model, and the
              card takes nothing from the guide payload on purpose.

              Whether a given licence is accepted somewhere is a regulatory
              fact set by bilateral agreement and the two IDP conventions. A
              model asked for it will answer fluently and sometimes wrongly,
              and someone acting on "your licence is fine here" can end up
              driving uninsured or illegally. So the guidance stays generic —
              true everywhere, specific nowhere — and the only destination
              input is the country name in a search query.
            */}
            <Card>
              <Text style={s.h}>Driving</Text>
              <Text style={s.sub}>
                Most countries expect an International Driving Permit alongside your
                home licence. Whether yours is accepted on its own depends on which
                country issued it and the agreements between the two — so this is one
                to confirm at the source, before you book a car.
              </Text>
              {(() => {
                // `country` is a two-letter code, so it must be expanded before it
                // reaches either the label or the query — "rules for JP" reads like
                // a bug, and a bare code is a poor search term.
                const dest = country ? countryName(country) : place;
                return (
                  <>
                    <Pressable onPress={() => open(`https://www.google.com/search?q=${encodeURIComponent(`${dest} official driving licence requirements for foreign visitors international driving permit`)}`)}>
                      <Text style={[s.link, { color: accent }]}>Official driving rules for {dest} ›</Text>
                    </Pressable>
                    <Pressable onPress={() => open(`https://www.google.com/search?q=${encodeURIComponent(`${dest} embassy ${nat ? countryName(nat) : ''} driving licence`.trim())}`)}>
                      <Text style={[s.link, { color: accent }]}>Embassy guidance ›</Text>
                    </Pressable>
                  </>
                );
              })()}
              <Text style={s.disclaimer}>
                Generic guidance — VoyageOS does not decide whether your licence is valid abroad.
              </Text>
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
            {(() => {
              const list = (g2.gateways && g2.gateways.length
                ? g2.gateways
                : (g2.gateway?.name || g2.gateway?.code) ? [g2.gateway!]
                : (g2.airport?.code ? [{ ...g2.airport, kind: 'airport' }] : []));
              if (!list.length) return null;
              const KINDS: Record<string, [string, string]> = {
                airport: ['\u2708', 'Arrival airport'], port: ['\u2693', 'Arrival port'],
                station: ['\ud83d\ude89', 'Arrival station'], road: ['\ud83d\udee3', 'Arriving by road'],
              };
              const MODEK: Record<string, string> = { air: 'airport', ship: 'port', train: 'station', car: 'road' };
              const modeKind = MODEK[trip.travel_mode ?? ''] ?? null;
              const sel = arrivalKind ?? (list.find(x => x.kind === modeKind)?.kind) ?? list[0].kind;
              const gw = list.find(x => x.kind === sel) ?? list[0];
              const [ic, lb] = KINDS[gw.kind] ?? KINDS.airport;
              return (
                <Card>
                  {list.length > 1 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                      {list.map(x => {
                        const on = x.kind === sel;
                        const km = KINDS[x.kind] ?? KINDS.airport;
                        return (
                          <Pressable key={x.kind} onPress={() => setArrivalKind(x.kind)}
                            style={[sx.vChip, on && { backgroundColor: accent, borderColor: accent }]}>
                            <Text style={[sx.vChipText, on && { color: P.textOnDark }]}>{km[0]} {km[1].replace('Arrival ', '').replace('Arriving by ', '')}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  <Text style={s.h}>{ic} {lb} · {gw.code ? gw.code + ' ' : ''}{gw.name}</Text>
                  {!!gw.to_city && <Text style={s.sub}>{gw.to_city}</Text>}
                  {gw.highlights.map((h, i) => <Text key={i} style={s.bullet}>·  {h}</Text>)}
                  {!!gw.duty_free && <Text style={s.sub}>Duty free: {gw.duty_free}</Text>}
                  {!!gw.smoking && <Text style={s.sub}>Smoking: {gw.smoking}</Text>}
                  {gw.tips.map((h, i) => <Text key={`t${i}`} style={s.bullet}>·  {h}</Text>)}
                  <Pressable onPress={() => open(`https://www.google.com/search?q=${encodeURIComponent((gw.code || gw.name) + ' ' + (gw.kind === 'airport' ? 'airport' : gw.kind) + ' guide updates')}`)}>
                    <Text style={[s.link, { color: accent }]}>Latest {gw.code || gw.name} updates ›</Text>
                  </Pressable>
                </Card>
              );
            })()}
            {trip.travel_mode === 'air' && (
              <Card>
                <Text style={s.h}>Your flight</Text>
                <TextInput style={sx.airInput} value={air} onChangeText={setAir}
                  placeholder="Airline name" placeholderTextColor={P.textMuted} />
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
        {tab === 'eat' && !aReady && <Card><JourneyLoader accent={accent} label="Loading food picks…" /></Card>}
        {tab === 'eat' && aReady && (
          <>
            {(() => {
              const dishes = g2.dishes ?? [];
              const restaurants = (g2.restaurants && g2.restaurants.length ? g2.restaurants : g2.eat) ?? [];
              return (
                <>
                  {dishes.length === 0 && restaurants.length === 0 &&
                    <Card><Text style={s.sub}>Nothing yet — tap ↻ to write the food guide.</Text></Card>}
                  {dishes.length > 0 && <Text style={sx.tipHead}>LOCAL FOOD · {place.toUpperCase()}</Text>}
                  {dishes.length > 0 && (
                    <Card>
                      {dishes.map((d, i) => (
                        <View key={`d${i}`} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }, i > 0 && { borderTopWidth: 1, borderTopColor: P.hairline }]}>
                          {!!dishPhotos[d.name] && <RNImage source={{ uri: dishPhotos[d.name] }} style={s.dishThumb} />}
                          <View style={{ flex: 1 }}>
                            <Text style={s.h}>{d.name}</Text>
                            {!!d.note && <Text style={[s.sub, { marginTop: 2 }]}>{d.note}</Text>}
                          </View>
                        </View>
                      ))}
                    </Card>
                  )}
                  {restaurants.length > 0 && <Text style={sx.tipHead}>RESTAURANTS</Text>}
                  {restaurants.map((r, i) => (
                    <Card key={`r${i}`}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[s.h, { flex: 1 }]}>{r.name}</Text>
                        <Text style={s.coins}>{'🪙'.repeat((r as any).price ?? 2)}</Text>
                      </View>
                      {!!r.area && <Text style={[s.sub, { fontFamily: F.med }]}>{r.area}</Text>}
                      {!!r.note && <Text style={s.sub}>{r.note}</Text>}
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
                  {restaurants.length > 0 && <Text style={[s.disclaimer, { marginTop: 0, marginBottom: S[1] }]}>Rankings & prices are impressions — confirm before you go.</Text>}
                </>
              );
            })()}
            <Findings category="eat" />
          </>
        )}
        {tab === 'play' && (hasParty ? (
          familyBusy && !familyPlay ? (
            <Card><JourneyLoader accent={accent} label="Planning family activities…" /></Card>
          ) : (familyPlay?.activities.length ? (
            <>
              <Text style={sx.tipHead}>PARTY PICKS · {place.toUpperCase()}</Text>
              <Text style={[s.sub, { marginBottom: 8 }]}>Each rated for your party — great · okay · skip.</Text>
              {familyPlay.activities.map((a, i) => (
                <Card key={i}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={[s.h, { flex: 1 }]}>{a.name}</Text>
                    <Text style={s.coinsSm}>{'🪙'.repeat(a.price)}</Text>
                  </View>
                  {!!a.note && <Text style={s.sub}>{a.note}</Text>}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: S[2] }}>
                    {COHORT_ORDER.filter(k => (a.bands as any)[k]).map(k => {
                      const fit = (a.bands as any)[k] as string;
                      const col = fit === 'great' ? P.success : fit === 'okay' ? P.warningInk : P.textMuted;
                      return (
                        <View key={k} style={[s.band, { backgroundColor: tint(col, 0.16) }]}>
                          <Text style={[s.bandText, { color: fit === 'skip' ? P.textMuted : col }]}>{COHORT_LABEL[k]} · {fit}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={[s.sub, { marginTop: S[1] }]}>
                    {[a.duration, a.indoor, a.stroller ? '🚼 stroller-ok' : '', a.food_onsite ? '🍽 food on-site' : '', a.booking].filter(Boolean).join('  ·  ')}
                  </Text>
                  {!!a.verdict && <Text style={{ marginTop: 8, color: P.textPri, fontFamily: F.med, lineHeight: 20 }}>💬 {a.verdict}</Text>}
                </Card>
              ))}
              <Pressable onPress={redoFamily}><Text style={[s.link, { color: accent, marginBottom: S[2] }]}>↻ Redo picks ›</Text></Pressable>
              <Text style={[s.disclaimer, { marginTop: 0 }]}>Fit & prices are impressions — confirm before you go.</Text>
              <Findings category="play" />
            </>
          ) : (
            <Card><Text style={s.sub}>Couldn't load family picks. </Text><Pressable onPress={redoFamily}><Text style={[s.link, { color: accent }]}>Try again ›</Text></Pressable></Card>
          ))
        ) : (
          bReady
            ? <><Card><Text style={s.h}>Experiences</Text><Rows items={g2.play} /></Card>
                <Findings category="play" /></>
            : <Card><JourneyLoader accent={accent} label="Finding experiences…" /></Card>
        ))}
        {tab === 'visit' && (bReady
          ? <><Card><Text style={s.h}>Sights & districts</Text><VisitRows items={g2.visit} /></Card>
              <Findings category="visit" /></>
          : <Card><JourneyLoader accent={accent} label="Mapping sights…" /></Card>)}
        {tab === 'go' && !bReady && <Card><JourneyLoader accent={accent} label="Working out transit…" /></Card>}
        {tab === 'go' && bReady && (
          <>
            {!!g2.go.from_origin?.length && (
              <Card>
                <Text style={s.h}>{trip.origin ? `From ${trip.origin}` : 'Getting there'}</Text>
                {g2.go.from_origin.map((e, i) => <Text key={i} style={s.bullet}>·  {e}</Text>)}
                <Text style={[s.disclaimer, { marginTop: S[1] + 2 }]}>Routes are impressions — check live schedules & fares.</Text>
              </Card>
            )}
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
            <Findings category="go" />
          </>
        )}
        <Text style={s.disclaimer}>Written by AI from general knowledge — taste is opinion, logistics deserve a double-check.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: P.pageBg, alignItems: 'center', justifyContent: 'center' },
  loading: { ...T.body, color: P.textSec, marginTop: S[3] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S[3] },
  h: { ...T.h2, color: P.textPri, marginBottom: S[2] },
  back: { ...T.title, fontFamily: F.bold },
  regen: { ...T.h2 },
  addPlus: { ...T.h2, fontFamily: F.bold },
  // P.warningInk, not P.warning: a star rating is type, and P.warning reaches
  // only 2.1:1 on white. The darker amber is the readable one.
  rating: { ...T.caption, fontFamily: F.bold, color: P.warningInk },
  dishThumb: { width: 58, height: 58, borderRadius: RA.sm, marginRight: S[3] },
  coins: { ...T.body },
  coinsSm: { ...T.caption },
  band: { borderRadius: RA.sm, paddingHorizontal: 9, paddingVertical: 5, marginRight: S[1] + 2, marginBottom: S[1] + 2 },
  bandText: { ...T.caption, fontFamily: F.bold },
  row: { marginBottom: S[3] },
  rowName: { ...T.title, color: P.textPri },
  sub: { ...T.caption, color: P.textSec, marginTop: S[1] },
  bullet: { ...T.body, color: P.textPri, marginBottom: S[2] },
  link: { ...T.title, marginTop: S[2] },
  disclaimer: { ...T.caption, color: P.textMuted, marginTop: S[3],
                textAlign: 'center', lineHeight: 16 },
});

const sx = StyleSheet.create({
  photoWrap: { marginTop: S[2] },
  photo: { width: '100%', height: 150, borderRadius: RA.sm, backgroundColor: P.sunken },
  // Attribution is a licence condition, not a caption — it must stay legible
  // and must not be clipped away, so it sits under the image rather than over it.
  photoCredit: { ...T.caption, color: P.textMuted, marginTop: S[1] },

  vChip: { borderWidth: 1, borderColor: P.hairlineStrong, backgroundColor: P.card,
           paddingHorizontal: S[3], paddingVertical: S[2], borderRadius: RA.pill,
           marginRight: S[2], marginBottom: S[2] },
  vChipText: { ...T.caption, color: P.textPri },
  tipHead: { ...T.label, color: P.textMuted, marginTop: S[2], marginBottom: S[3] },
  tipImg: { width: 110, height: 110, borderRadius: RA.md, marginRight: S[2] },
  tipThumb: { width: 50, height: 50, borderRadius: RA.sm, marginRight: S[2] },
  tipAdd: { width: 50, height: 50, borderRadius: RA.sm, backgroundColor: P.card,
            borderWidth: 1, borderColor: P.hairline, alignItems: 'center', justifyContent: 'center' },
  tipInput: { ...T.body, backgroundColor: P.sunken, borderRadius: RA.md,
              paddingHorizontal: S[4], paddingVertical: S[3], color: P.textPri,
              marginBottom: S[2] },
  airInput: { ...T.body, backgroundColor: P.sunken, borderRadius: RA.md,
              paddingHorizontal: S[4], paddingVertical: S[3], color: P.textPri },
});
