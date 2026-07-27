import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addNote, listNotes, Note } from '../api';
import { Btn, Card } from '../components/ui';
import { C } from '../theme';

export default function Journal({ tripId, tripTitle, accent, onBack }: {
  tripId: string; tripTitle: string; accent: string; onBack: () => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listNotes(tripId).then(setNotes).catch(() => {});
  }, [tripId]);
  useEffect(load, [load]);

  async function post() {
    setBusy(true);
    try { await addNote(tripId, draft.trim()); setDraft(''); load(); }
    catch (e: any) { Alert.alert('Journal', e.message); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 10 }}>
        <Text style={{ color: accent, fontSize: 16, fontWeight: '800' }}>‹ {tripTitle}</Text>
      </Pressable>
      <Text style={s.h1}>Journal</Text>
      <Card>
        <TextInput
          style={s.input} value={draft} onChangeText={setDraft} multiline
          placeholder="A moment worth keeping…" placeholderTextColor="#9AA9BB"
        />
        <Btn label={busy ? 'Saving…' : 'Add entry'} color={accent} disabled={busy || !draft.trim()} onPress={post} />
      </Card>
      {notes.map(n => (
        <Card key={n.id}>
          <Text style={s.when}>{new Date(n.created_at).toLocaleString()}</Text>
          <Text style={s.body}>{n.body}</Text>
        </Card>
      ))}
      <Text style={s.hint}>Private for now — sharing your travel blog with friends arrives with the TestFlight release.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -0.6, marginBottom: 14 },
  input: { backgroundColor: '#F1F4F9', borderRadius: 14, padding: 14, minHeight: 90, fontSize: 16, color: C.text, marginBottom: 12, textAlignVertical: 'top' },
  when: { color: '#9AA9BB', fontSize: 11, marginBottom: 6 },
  body: { color: C.text, fontSize: 15, lineHeight: 22 },
  hint: { color: '#9AA9BB', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
});
