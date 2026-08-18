import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Companion, Doc, getProfile, HomeOrigin, listDocuments, PlaceHit, putProfile, searchPlaces } from '../api';
import { getEmail, signOut } from '../auth';
import { SHOW_PURCHASE_HARNESS } from '../config';
import { Btn, Card, Chip, Field } from '../components/ui';
import PurchaseHarness from '../components/PurchaseHarness';
import DeleteAccount from '../components/DeleteAccount';
import WardrobeSheet, { PackingProfile } from '../components/WardrobeSheet';
import SubscriptionCard from '../components/SubscriptionCard';
import Paywall from './Paywall';
import { FAB_CLEARANCE } from '../components/TopBar';
import { isoDay } from '../tripStatus';
import { COUNTRIES, countryName, flagOf } from '../countries';
import { F, P, RA, S, T } from '../theme';

const RELATIONS: Companion['relation'][] = ['partner', 'child', 'parent', 'friend'];

/** What a traveller's row shows about their profile. Deliberately terse: the
 *  row is a signpost, and "no profile" is a legitimate state rather than an
 *  omission to nag about. */
function summarise(p: PackingProfile | null): string {
  if (!p || !p.wardrobe?.length) return 'no packing profile';
  const n = p.wardrobe.length;
  return `${n} clothing categor${n === 1 ? 'y' : 'ies'}`;
}

export default function Profile({ onSignedOut, onDocuments, onBack }: {
  onSignedOut: () => void; onDocuments: () => void; onBack: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [dob, setDob] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [nat, setNat] = useState<string | null>(null);
  const [natQ, setNatQ] = useState('');
  const [members, setMembers] = useState<Companion[]>([]);
  const [packing, setPacking] = useState<PackingProfile | null>(null);
  // null = closed; 'me' = the owner; a number = that member's index.
  const [wardrobeFor, setWardrobeFor] = useState<'me' | number | null>(null);
  const [mName, setMName] = useState('');
  const [mRel, setMRel] = useState<Companion['relation']>('partner');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [home, setHome] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [homeHits, setHomeHits] = useState<PlaceHit[]>([]);
  const [homeChosen, setHomeChosen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Read-only here: the summary earns the tap, the Documents screen owns editing.
  useEffect(() => { listDocuments().then(setDocs).catch(() => {}); }, []);

  useEffect(() => {
    getProfile().then(p => {
      setDob(p.dob); setGender(p.gender); setNat(p.nationality);
      setMembers(p.members ?? []);
      setPacking((p as any).packing ?? null);
      setEcName(p.emergency_contact?.name ?? ''); setEcPhone(p.emergency_contact?.phone ?? '');
      if (p.home_origin?.name) {
        setHome(p.home_origin.name);
        setHomeCountry(p.home_origin.country ?? '');
        setHomeCoords(p.home_origin.lat != null && p.home_origin.lng != null
          ? { lat: p.home_origin.lat, lng: p.home_origin.lng } : null);
        setHomeChosen(true);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (homeChosen || home.trim().length < 2) { setHomeHits([]); return; }
    const t = setTimeout(() => {
      searchPlaces(home).then(res => {
        const seen = new Set<string>();
        setHomeHits(res.filter(h => {
          const k = `${h.name}|${h.admin ?? ''}|${h.country_code}`;
          if (seen.has(k)) return false;
          seen.add(k); return true;
        }));
      }).catch(() => setHomeHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [home, homeChosen]);

  const natHits = natQ.trim().length >= 1 && !nat
    ? COUNTRIES.filter(([c, n]) =>
        n.toLowerCase().includes(natQ.trim().toLowerCase()) || c === natQ.trim().toUpperCase()
      ).slice(0, 6)
    : [];

  async function save() {
    setSaving(true);
    try {
      const home_origin: HomeOrigin | undefined = home.trim()
        ? { name: home.trim(), country: homeCountry ? homeCountry.toUpperCase().slice(0, 2) : null,
            lat: homeCoords?.lat ?? null, lng: homeCoords?.lng ?? null }
        : undefined;
      await putProfile({ dob, gender: gender as any, nationality: nat, members, packing,
        emergency_contact: ecName.trim() && ecPhone.trim() ? { name: ecName.trim(), phone: ecPhone.trim() } : undefined,
        home_origin });
      Alert.alert('Saved', 'Your profile now personalizes visa links and family packing to come.');
    } catch (e: any) { Alert.alert('Could not save', e.message); }
    finally { setSaving(false); }
  }

  if (!loaded) {
    return <View style={s.center}><ActivityIndicator size="large" color={P.brand} /></View>;
  }

  // Worst status wins the callout: an expired document outranks an expiring one.
  const docSummary = (() => {
    if (!docs.length) return { text: 'Nothing tracked yet', warn: '', warnColor: P.textSec };
    const n = docs.length;
    const text = `${n} document${n > 1 ? 's' : ''}`;
    const expired = docs.filter(d => d.expiry.level === 'expired').length;
    const critical = docs.filter(d => d.expiry.level === 'critical').length;
    if (expired) return { text, warn: `${expired} expired`, warnColor: P.danger };
    if (critical) return { text, warn: `${critical} expiring soon`, warnColor: P.warningInk };
    return { text, warn: '', warnColor: P.textSec };
  })();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={{ padding: S[5], paddingTop: S[5], paddingBottom: FAB_CLEARANCE }}>
      {/* Profile is pushed now rather than reached from a floating orb, so it
          needs the way out every other pushed screen has. The orb could be
          tapped from anywhere and so never needed one. */}
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: S[3] }}>
        <Text style={[T.title, { color: P.brand }]}>‹ Back</Text>
      </Pressable>
      <Text style={s.h1}>Profile</Text>
      <Text style={s.email}>{getEmail() || 'Signed in'}</Text>

      <Card>
        <Text style={s.section}>NATIONALITY</Text>
        {nat ? (
          <Pressable onPress={() => { setNat(null); setNatQ(''); }}>
            <Text style={s.natPicked}>{flagOf(nat)}  {countryName(nat)}  ·  change</Text>
          </Pressable>
        ) : (
          <>
            <TextInput style={s.input} value={natQ} onChangeText={setNatQ}
              placeholder="Search country…" placeholderTextColor={P.textMuted} />
            {natHits.map(([c, n]) => (
              <Pressable key={c} style={s.hit} onPress={() => setNat(c)}>
                <Text style={s.hitName}>{flagOf(c)}  {n}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Text style={s.hint}>Used only to link you to official visa sources for each trip.</Text>
      </Card>

      <Card>
        <Text style={s.section}>HOME / STARTING POINT</Text>
        {homeChosen && home.trim() ? (
          <Pressable onPress={() => setHomeChosen(false)}>
            <Text style={s.natPicked}>{homeCountry ? flagOf(homeCountry) + '  ' : ''}{home}  ·  change</Text>
          </Pressable>
        ) : (
          <>
            <TextInput style={s.input} value={home}
              onChangeText={(t) => { setHome(t); setHomeChosen(false); setHomeCoords(null); }}
              placeholder="Your departure city — e.g. Kuwait City" placeholderTextColor={P.textMuted} />
            {homeHits.map((h, i) => (
              <Pressable key={`${h.name}-${h.lat}-${h.lng}-${i}`} style={s.hit}
                onPress={() => { setHome(h.name); setHomeCountry(h.country_code); setHomeCoords({ lat: h.lat, lng: h.lng }); setHomeChosen(true); setHomeHits([]); }}>
                <Text style={s.hitName}>{flagOf(h.country_code)}  {h.name}</Text>
                <Text style={s.hitSub}>{[h.admin, h.country_code].filter(Boolean).join(' · ')}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Text style={s.hint}>Prefilled as “travelling from” on new trips — powers transit tips and departure-day packing. Override it per trip anytime.</Text>
      </Card>

      <Card>
        <Text style={s.section}>DATE OF BIRTH</Text>
        <Pressable style={s.dateRow} onPress={() => setPicking(v => !v)}>
          <Text style={s.dateValue}>{dob ?? 'Tap to pick'}</Text>
        </Pressable>
        {picking && (
          <DateTimePicker
            value={dob ? new Date(dob + 'T00:00:00') : new Date(1990, 0, 1)}
            mode="date" maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              // A DOB shifted a day can cross an age band and change what
              // gets packed for a child. Local, not UTC.
              if (d) setDob(isoDay(d));
              if (Platform.OS !== 'ios') setPicking(false);
            }}
          />
        )}
        <Text style={s.section}>GENDER</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[['female', 'Female'], ['male', 'Male'], ['na', 'Prefer not to say']].map(([v, l]) => (
            <Chip key={v} label={l} selected={gender === v} onPress={() => setGender(v)} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={s.section}>TRAVEL COMPANIONS</Text>
        {/* The owner's own profile sits with the companions, because it is the
            same question asked of the same kind of person. */}
        <Pressable onPress={() => setWardrobeFor('me')} style={s.member}>
          <Text style={s.memberName}>
            You <Text style={s.memberRel}>· {summarise(packing)}</Text>
          </Text>
          <Text style={[s.memberRel, { color: P.brand }]}>Edit ›</Text>
        </Pressable>
        {members.map((m, i) => (
          <View key={i} style={s.member}>
            <Pressable style={{ flex: 1 }} onPress={() => setWardrobeFor(i)}>
              <Text style={s.memberName}>
                {m.name} <Text style={s.memberRel}>
                  · {m.relation} · {summarise((m as any).packing ?? null)}
                </Text>
              </Text>
            </Pressable>
            <Pressable hitSlop={10} onPress={() => setMembers(members.filter((_, j) => j !== i))}>
              <Text style={s.memberX}>✕</Text>
            </Pressable>
          </View>
        ))}
        <Field label="ADD SOMEONE" value={mName} onChange={setMName} placeholder="Name" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: S[2] }}>
          {RELATIONS.map(r => (
            <Chip key={r} label={r} selected={mRel === r} onPress={() => setMRel(r)} />
          ))}
        </View>
        <Btn label="Add companion" kind="ghost" disabled={!mName.trim()} onPress={() => {
          setMembers([...members, { name: mName.trim(), relation: mRel }]);
          setMName('');
        }} />
        <Text style={s.hint}>Companions become shared travelers with their own packing lists in a coming release.</Text>
      </Card>

      <Pressable onPress={onDocuments}>
        <Card>
          <Text style={s.section}>DOCUMENTS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.docSummary}>{docSummary.text}</Text>
            <Text style={s.docChevron}>›</Text>
          </View>
          {!!docSummary.warn && (
            <Text style={[s.docWarn, { color: docSummary.warnColor }]}>{docSummary.warn}</Text>
          )}
          <Text style={s.hint}>Passports, visas and insurance — reminded before they expire.</Text>
        </Card>
      </Pressable>

      <Card>
        <Text style={s.section}>EMERGENCY CONTACT</Text>
        <Field label="NAME" value={ecName} onChange={setEcName} placeholder="Who to call" />
        <Field label="PHONE" value={ecPhone} onChange={setEcPhone} placeholder="+965…" />
        <Text style={s.hint}>Appears as one-tap call on every trip's SOS page.</Text>
      </Card>

      <WardrobeSheet
        /* Remount per traveller. The sheet seeds its checkboxes from `value`
           on mount, so without this, opening You and then a companion would
           show You's selections against their name. */
        key={String(wardrobeFor)}
        visible={wardrobeFor !== null}
        who={wardrobeFor === 'me' ? 'You' : (members[wardrobeFor as number]?.name ?? '')}
        value={wardrobeFor === 'me' ? packing
                                    : ((members[wardrobeFor as number] as any)?.packing ?? null)}
        onSave={(p) => {
          if (wardrobeFor === 'me') setPacking(p);
          else setMembers(ms => ms.map((m, j) =>
            j === wardrobeFor ? ({ ...m, packing: p } as any) : m));
        }}
        onClose={() => setWardrobeFor(null)}
      />

      <SubscriptionCard onUpgrade={() => setPlansOpen(true)} />
      <Paywall visible={plansOpen} onClose={() => setPlansOpen(false)} />

      {/* Gated on a config flag, not __DEV__: sandbox purchases need a real
          device, and an installed build has __DEV__ false. Set
          extra.showPurchaseHarness to false in app.json to hide it — and it
          must be false before any App Store submission.
          Delete this block and the file when phase 3 lands. */}
      {SHOW_PURCHASE_HARNESS && <PurchaseHarness />}

      <Btn label={saving ? 'Saving…' : 'Save profile'} disabled={saving} onPress={save} />
      <Pressable onPress={async () => { await signOut(); onSignedOut(); }}>
        <Text style={s.signout}>Sign out</Text>
      </Pressable>

      {/* Last thing on the screen, below Sign out. Destructive, so nobody
          should arrive at it while reaching for something else. */}
      <DeleteAccount onDeleted={async () => { await signOut(); onSignedOut(); }} />
    </ScrollView>
  );
}

/**
 * Destructive actions use neutral grey, not red. A destination accent can
 * itself be red (Japan, Singapore, Bahrain), so colour-coding danger would
 * collide with it and stop meaning anything — the weight is carried by the
 * confirm dialog instead, where the decision actually happens.
 *
 * SOS emergency affordances are the deliberate exception: they stay red under
 * a separate "urgent" rule, because there the colour signals speed, not
 * consequence.
 */
const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: P.pageBg, alignItems: 'center', justifyContent: 'center' },
  h1: { ...T.display, color: P.textPri },
  email: { ...T.body, color: P.textSec, marginTop: 2, marginBottom: S[4] },
  docSummary: { ...T.title, color: P.textPri },
  docChevron: { ...T.h2, color: P.textMuted },
  docWarn: { ...T.caption, fontFamily: F.med, marginTop: 2 },
  section: { ...T.label, color: P.textSec, marginBottom: S[2], marginTop: S[1] },
  input: {
    ...T.body, backgroundColor: P.sunken, borderRadius: RA.md,
    paddingHorizontal: S[4], paddingVertical: S[3] + 1, color: P.textPri,
  },
  hit: { paddingVertical: S[3], borderBottomWidth: 1, borderBottomColor: P.hairline },
  // search results: the place is the answer, the region only disambiguates it
  hitName: { ...T.title, color: P.textPri },
  hitSub: { ...T.caption, color: P.textSec },
  natPicked: { ...T.title, fontFamily: F.bold, color: P.textPri },
  hint: { ...T.caption, color: P.textMuted, marginTop: S[3], lineHeight: 17 },
  dateRow: { backgroundColor: P.sunken, borderRadius: RA.md, padding: S[3] + 1, marginBottom: S[3] },
  dateValue: { ...T.body, fontFamily: F.bold, color: P.textPri },
  member: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: S[2] + 1,
    borderBottomWidth: 1, borderBottomColor: P.hairline, marginBottom: S[1],
  },
  memberName: { ...T.body, fontFamily: F.med, color: P.textPri, flex: 1 },
  memberRel: { ...T.body, color: P.textSec },
  memberX: { ...T.body, color: P.textSec },
  // Sign out is destructive, so it stays neutral grey — colour is reserved for
  // state (danger/warning), not for marking an action as consequential.
  signout: { ...T.title, fontFamily: F.bold, color: P.textSec, textAlign: 'center', marginVertical: S[5] },
});
