import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createDocument, deleteDocument, Doc, listDocuments } from '../api';
import { Btn, Card, Chip } from '../components/ui';
import { C } from '../theme';

const TYPES = ['passport', 'visa', 'insurance', 'vaccination', 'permit', 'other'];
const LEVEL_COLOR: Record<string, string> = {
  ok: C.green, soon: '#b45309', critical: C.red, expired: C.red, none: C.sub,
};

export default function Documents({ onBack }: { onBack: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [type, setType] = useState('passport');
  const [label, setLabel] = useState('');
  const [expiry, setExpiry] = useState('');

  const load = useCallback(async () => {
    try { setDocs(await listDocuments()); } catch (e: any) { Alert.alert('Error', e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.wrap}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={10}><Text style={s.back}>‹ Home</Text></Pressable>
        <Text style={s.h2}>Documents</Text>
        <View style={{ width: 48 }} />
      </View>

      {docs.map(d => (
        <Card key={d.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.name}>{d.label}</Text>
            <Pressable hitSlop={10} onPress={() =>
              Alert.alert('Delete document?', d.label, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive',
                  onPress: async () => { await deleteDocument(d.id); load(); } },
              ])}>
              <Text style={{ color: C.sub }}>✕</Text>
            </Pressable>
          </View>
          <Text style={s.sub}>{d.type}{d.country_code ? ` · ${d.country_code}` : ''}</Text>
          <Text style={{ color: LEVEL_COLOR[d.expiry.level] ?? C.sub, fontWeight: '700', marginTop: 4 }}>
            {d.expiry.message}
          </Text>
        </Card>
      ))}

      <Card>
        <Text style={s.q}>Add a document</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {TYPES.map(t => <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />)}
        </View>
        <TextInput style={s.input} value={label} onChangeText={setLabel}
          placeholder="Label (e.g. My passport)" placeholderTextColor="#9aa7b8" />
        <TextInput style={s.input} value={expiry} onChangeText={setExpiry}
          placeholder="Expiry YYYY-MM-DD (optional)" placeholderTextColor="#9aa7b8" autoCapitalize="none" />
        <Btn label="Save" disabled={!label.trim()} onPress={async () => {
          try {
            await createDocument({
              type, label: label.trim(),
              expiry_date: /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : null,
            });
            setLabel(''); setExpiry(''); load();
          } catch (e: any) { Alert.alert('Error', e.message); }
        }} />
      </Card>
      <Text style={s.foot}>Expiry-only in v0.5 — photos arrive with the security foundation.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  back: { color: C.blue, fontSize: 16, fontWeight: '700' },
  h2: { fontSize: 17, fontWeight: '800', color: C.text },
  name: { color: C.text, fontSize: 16, fontWeight: '700' },
  sub: { color: C.sub, marginTop: 2 },
  q: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, marginBottom: 10 },
  foot: { color: '#9aa7b8', textAlign: 'center', marginTop: 12, fontSize: 12 },
});
