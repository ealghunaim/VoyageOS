import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addNote, listNotes, Note } from '../api';
import { Btn, Card } from '../components/ui';
import { C, F } from '../theme';

export default function Journal({ tripId, tripTitle, accent, onBack }: {
  tripId: string; tripTitle: string; accent: string; onBack: () => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<{ b64: string; mime: string; uri: string }[]>([]);

  const load = useCallback(() => {
    listNotes(tripId).then(setNotes).catch(() => {});
  }, [tripId]);
  useEffect(load, [load]);

  async function post() {
    setBusy(true);
    try {
      await addNote(tripId, draft.trim(), photos.map(p => ({ b64: p.b64, mime: p.mime })));
      setDraft(''); setPhotos([]); load();
    }
    catch (e: any) { Alert.alert('Journal', e.message); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 10 }}>
        <Text style={{ color: accent, fontSize: 16, fontFamily: F.bold }}>‹ {tripTitle}</Text>
      </Pressable>
      <Text style={s.h1}>Journal</Text>
      <Card>
        <TextInput
          style={s.input} value={draft} onChangeText={setDraft} multiline
          placeholder="A moment worth keeping…" placeholderTextColor="#9AA9BB"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          {photos.map((p, i) => (
            <Pressable key={i} onPress={() => setPhotos(photos.filter((_, j2) => j2 !== i))}>
              <Image source={{ uri: p.uri }} style={sx.thumb} />
            </Pressable>
          ))}
          {photos.length < 2 && (
            <Pressable style={sx.addPhoto} onPress={async () => {
              const r = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'], quality: 0.4, base64: true,
              });
              const a2 = r.assets?.[0];
              if (!r.canceled && a2?.base64) {
                setPhotos([...photos, { b64: a2.base64, mime: a2.mimeType ?? 'image/jpeg', uri: a2.uri }]);
              }
            }}>
              <Text style={{ color: accent, fontSize: 22, fontFamily: F.bold }}>+</Text>
              <Text style={{ color: C.sub, fontSize: 10 }}>photo</Text>
            </Pressable>
          )}
        </View>
        <Btn label={busy ? 'Saving…' : 'Add entry'} color={accent} disabled={busy || !draft.trim()} onPress={post} />
      </Card>
      {notes.map(n => (
        <Card key={n.id}>
          <Text style={s.when}>{new Date(n.created_at).toLocaleString()}</Text>
          <Text style={s.body}>{n.body}</Text>
          {!!n.photos?.length && (
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              {n.photos.map((u, i) => <Image key={i} source={{ uri: u }} style={sx.noteImg} />)}
            </View>
          )}
        </Card>
      ))}
      <Text style={s.hint}>Private for now — sharing your travel blog with friends arrives with the TestFlight release.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 30, fontFamily: F.bold, color: C.text, letterSpacing: -0.6, marginBottom: 14 },
  input: { backgroundColor: '#F1F4F9', borderRadius: 14, padding: 14, minHeight: 90, fontSize: 16, color: C.text, marginBottom: 12, textAlignVertical: 'top' },
  when: { color: '#9AA9BB', fontSize: 11, marginBottom: 6 },
  body: { color: C.text, fontSize: 15, lineHeight: 22 },
  hint: { color: '#9AA9BB', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
});

const sx = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: 12, marginRight: 8 },
  addPhoto: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F1F4F9', alignItems: 'center', justifyContent: 'center' },
  noteImg: { width: 120, height: 120, borderRadius: 14, marginRight: 8 },
});
