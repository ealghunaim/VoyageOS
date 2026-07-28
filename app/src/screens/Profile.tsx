import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Companion, getProfile, putProfile } from '../api';
import { getEmail, signOut } from '../auth';
import { Btn, Card, Chip, Field } from '../components/ui';
import { COUNTRIES, countryName, flagOf } from '../countries';
import { C, F } from '../theme';

const RELATIONS: Companion['relation'][] = ['partner', 'child', 'parent', 'friend'];

export default function Profile({ onSignedOut }: { onSignedOut: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [dob, setDob] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [nat, setNat] = useState<string | null>(null);
  const [natQ, setNatQ] = useState('');
  const [members, setMembers] = useState<Companion[]>([]);
  const [mName, setMName] = useState('');
  const [mRel, setMRel] = useState<Companion['relation']>('partner');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then(p => {
      setDob(p.dob); setGender(p.gender); setNat(p.nationality);
      setMembers(p.members ?? []);
      setEcName(p.emergency_contact?.name ?? ''); setEcPhone(p.emergency_contact?.phone ?? '');
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const natHits = natQ.trim().length >= 1 && !nat
    ? COUNTRIES.filter(([c, n]) =>
        n.toLowerCase().includes(natQ.trim().toLowerCase()) || c === natQ.trim().toUpperCase()
      ).slice(0, 6)
    : [];

  async function save() {
    setSaving(true);
    try {
      await putProfile({ dob, gender: gender as any, nationality: nat, members,
        emergency_contact: ecName.trim() && ecPhone.trim() ? { name: ecName.trim(), phone: ecPhone.trim() } : undefined });
      Alert.alert('Saved', 'Your profile now personalizes visa links and family packing to come.');
    } catch (e: any) { Alert.alert('Could not save', e.message); }
    finally { setSaving(false); }
  }

  if (!loaded) {
    return <View style={s.center}><ActivityIndicator size="large" color={C.blue} /></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
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
              placeholder="Search country…" placeholderTextColor="#9AA9BB" />
            {natHits.map(([c, n]) => (
              <Pressable key={c} style={s.hit} onPress={() => setNat(c)}>
                <Text style={{ color: C.text, fontWeight: '600' }}>{flagOf(c)}  {n}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Text style={s.hint}>Used only to link you to official visa sources for each trip.</Text>
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
              if (d) setDob(d.toISOString().slice(0, 10));
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
        {members.map((m, i) => (
          <View key={i} style={s.member}>
            <Text style={{ color: C.text, fontFamily: F.med, flex: 1 }}>
              {m.name} <Text style={{ color: C.sub, fontWeight: '400' }}>· {m.relation}</Text>
            </Text>
            <Pressable hitSlop={10} onPress={() => setMembers(members.filter((_, j) => j !== i))}>
              <Text style={{ color: C.sub }}>✕</Text>
            </Pressable>
          </View>
        ))}
        <Field label="ADD SOMEONE" value={mName} onChange={setMName} placeholder="Name" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
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

      <Card>
        <Text style={s.section}>EMERGENCY CONTACT</Text>
        <Field label="NAME" value={ecName} onChange={setEcName} placeholder="Who to call" />
        <Field label="PHONE" value={ecPhone} onChange={setEcPhone} placeholder="+965…" />
        <Text style={s.hint}>Appears as one-tap call on every trip's SOS page.</Text>
      </Card>

      <Btn label={saving ? 'Saving…' : 'Save profile'} disabled={saving} onPress={save} />
      <Pressable onPress={async () => { await signOut(); onSignedOut(); }}>
        <Text style={s.signout}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 30, fontFamily: F.bold, color: C.text, letterSpacing: -0.6 },
  email: { color: C.sub, marginTop: 2, marginBottom: 16 },
  section: { color: C.sub, fontSize: 12, fontFamily: F.bold, letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#F1F4F9', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, color: C.text },
  hit: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  natPicked: { color: C.text, fontSize: 17, fontFamily: F.bold },
  hint: { color: '#9AA9BB', fontSize: 12, marginTop: 10, lineHeight: 17 },
  dateRow: { backgroundColor: '#F1F4F9', borderRadius: 14, padding: 13, marginBottom: 12 },
  dateValue: { color: C.text, fontSize: 16, fontFamily: F.bold },
  member: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4 },
  signout: { color: C.red, fontFamily: F.bold, textAlign: 'center', marginVertical: 18 },
});
