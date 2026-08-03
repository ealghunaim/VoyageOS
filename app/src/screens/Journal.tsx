import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addNote, listNotes, Note } from '../api';
import { Btn, Card } from '../components/ui';
import { F, P, RA, S, T } from '../theme';

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
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={{ padding: S[5] }}
      keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: S[3] }}>
        <Text style={[s.back, { color: accent }]}>‹ {tripTitle}</Text>
      </Pressable>
      <Text style={s.h1}>Journal</Text>
      <Card>
        <TextInput
          style={s.input} value={draft} onChangeText={setDraft} multiline
          placeholder="A moment worth keeping…" placeholderTextColor={P.textMuted}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: S[3] }}>
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
              <Text style={[sx.addPlus, { color: accent }]}>+</Text>
              <Text style={sx.addLabel}>photo</Text>
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
            <View style={{ flexDirection: 'row', marginTop: S[3] }}>
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
  back: { ...T.title, fontFamily: F.bold },
  h1: { ...T.display, color: P.textPri, marginBottom: S[3] + 2 },
  input: {
    backgroundColor: P.sunken, borderRadius: RA.md, padding: S[3] + 2, minHeight: 90,
    ...T.title, fontFamily: F.reg, color: P.textPri, marginBottom: S[3],
    textAlignVertical: 'top',
  },
  when: { ...T.caption, color: P.textMuted, marginBottom: S[1] + 2 },
  body: { ...T.body, color: P.textPri, lineHeight: 22 },
  hint: { ...T.caption, color: P.textMuted, textAlign: 'center', marginTop: S[2] },
});

// Image geometry, deliberately in pixels. A thumbnail grid is sized by what
// looks right at a glance, not by the 4pt spacing rhythm — pushing 56 and 120
// onto the scale would be tokens for their own sake. Only the radii are
// tokenised, so photos round like every other surface.
const sx = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: RA.md, marginRight: S[2] },
  addPhoto: {
    width: 56, height: 56, borderRadius: RA.md, backgroundColor: P.sunken,
    alignItems: 'center', justifyContent: 'center',
  },
  addPlus: { ...T.h1, fontFamily: F.bold },
  addLabel: { ...T.label, letterSpacing: 0, color: P.textSec },
  noteImg: { width: 120, height: 120, borderRadius: RA.md, marginRight: S[2] },
});
