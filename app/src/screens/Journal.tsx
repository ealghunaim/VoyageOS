import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { addNote, listNotes, Note, patchNote } from '../api';
import { Btn, Card } from '../components/ui';
import { clampDay, classify, dayLabel, isoDay } from '../tripStatus';
import { F, P, RA, S, T } from '../theme';
import { FAB_CLEARANCE } from '../components/TopBar';

/** Which day is being picked: the one the draft will be filed under, or the
 *  one an already-saved entry should move to. */
type Picking = { kind: 'draft' } | { kind: 'note'; note: Note };

export default function Journal({ tripId, tripTitle, accent, startDate, endDate, status, onBack }: {
  tripId: string; tripTitle: string; accent: string;
  startDate: string; endDate: string; status?: string | null;
  onBack: () => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<{ b64: string; mime: string; uri: string }[]>([]);
  const [picking, setPicking] = useState<Picking | null>(null);

  // Which day the next entry is about. Today while the trip is on; once it is
  // over, the last day — someone writing on the flight home is recounting the
  // trip, not today, and stamping entries with a day they were not there would
  // make the log quietly wrong.
  const [day, setDay] = useState(() =>
    clampDay(isoDay(new Date()), startDate, endDate));

  const over = classify({ start_date: startDate, end_date: endDate, status }) === 'finished';

  const load = useCallback(() => {
    listNotes(tripId).then(setNotes).catch(() => {});
  }, [tripId]);
  useEffect(load, [load]);

  /** Entries under the day they are about, newest day first. */
  const grouped = useMemo(() => {
    const byDay = new Map<string, Note[]>();
    for (const n of notes) {
      // Rows written before 0029 have no entry_date. Falling back to the day
      // they were typed keeps them in the log rather than dropping them into
      // an "unknown" bucket nobody would ever tidy up.
      const d = n.entry_date || isoDay(new Date(n.created_at));
      (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(n);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [notes]);

  async function post() {
    setBusy(true);
    try {
      await addNote(tripId, draft.trim(), photos.map(p => ({ b64: p.b64, mime: p.mime })), day);
      setDraft(''); setPhotos([]); load();
    }
    catch (e: any) { Alert.alert('Journal', e.message); }
    finally { setBusy(false); }
  }

  /** Re-file a saved entry under a different day. */
  async function refile(note: Note, iso: string) {
    const d = clampDay(iso, startDate, endDate);
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, entry_date: d } : n));
    try { await patchNote(tripId, note.id, d); }
    catch (e: any) { Alert.alert('Journal', e.message); load(); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={{ padding: S[5], paddingBottom: FAB_CLEARANCE }}
      keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: S[3] }}>
        <Text style={[s.back, { color: accent }]}>‹ {tripTitle}</Text>
      </Pressable>
      <Text style={s.h1}>Journal</Text>
      {over && (
        // Said out loud because the screen gives no other sign of it. A trip
        // that has ended still takes entries, and the best ones are written
        // afterwards — but nothing here previously suggested that was allowed.
        <Text style={s.stillOpen}>
          This trip is over. You can still add entries — pick the day each one
          is about.
        </Text>
      )}
      <Card>
        <Pressable onPress={() => setPicking({ kind: 'draft' })} style={s.dayBtn}>
          <Text style={[s.dayBtnText, { color: accent }]}>{dayLabel(day)}</Text>
          <Text style={s.dayBtnHint}>change ›</Text>
        </Pressable>
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
      {grouped.map(([d, entries]) => (
        <View key={d}>
          <Text style={[s.dayHead, { color: accent }]}>{dayLabel(d).toUpperCase()}</Text>
          {entries.map(n => (
            <Card key={n.id}>
              {/* created_at is kept and still shown — it answers a different
                  question ("when did I write this") and losing it would make
                  a re-filed entry indistinguishable from one written on the
                  day. Tapping re-files. */}
              <Pressable onPress={() => setPicking({ kind: 'note', note: n })} hitSlop={6}>
                <Text style={s.when}>
                  {new Date(n.created_at).toLocaleString()}
                  <Text style={{ color: P.brand }}>   move ›</Text>
                </Text>
              </Pressable>
              <Text style={s.body}>{n.body}</Text>
              {!!n.photos?.length && (
                <View style={{ flexDirection: 'row', marginTop: S[3] }}>
                  {n.photos.map((u, i) => <Image key={i} source={{ uri: u }} style={sx.noteImg} />)}
                </View>
              )}
            </Card>
          ))}
        </View>
      ))}
      <Text style={s.hint}>Private for now — sharing your travel blog with friends arrives with the TestFlight release.</Text>

      {picking && (
        <DayPicker
          value={picking.kind === 'draft'
            ? day
            : (picking.note.entry_date || isoDay(new Date(picking.note.created_at)))}
          startDate={startDate} endDate={endDate}
          onPick={(iso) => {
            if (picking.kind === 'draft') setDay(clampDay(iso, startDate, endDate));
            else refile(picking.note, iso);
          }}
          onClose={() => setPicking(null)} />
      )}
    </ScrollView>
  );
}

/** Day picker, bounded by the trip.
 *
 *  minimumDate/maximumDate do the clamping in the UI so out-of-trip days are
 *  simply not reachable, rather than being silently corrected after the fact
 *  by the server. The server still clamps — a client is not a validator — but
 *  agreeing here means the traveller sees what will be saved.
 */
function DayPicker({ value, startDate, endDate, onPick, onClose }: {
  value: string; startDate: string; endDate: string;
  onPick: (iso: string) => void; onClose: () => void;
}) {
  const asDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const [picked, setPicked] = useState(() => asDate(value));

  if (Platform.OS !== 'ios') {
    return (
      <DateTimePicker value={picked} mode="date" display="default"
        minimumDate={asDate(startDate)} maximumDate={asDate(endDate)}
        onChange={(e, d) => { onClose(); if (e.type === 'set' && d) onPick(isoDay(d)); }} />
    );
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.sheetWrap}>
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Which day is this about?</Text>
          <DateTimePicker value={picked} mode="date" display="spinner"
            minimumDate={asDate(startDate)} maximumDate={asDate(endDate)}
            onChange={(_, d) => d && setPicked(d)} />
          <Pressable onPress={() => { onPick(isoDay(picked)); onClose(); }}
            style={s.sheetPrimary}>
            <Text style={s.sheetPrimaryText}>Use this day</Text>
          </Pressable>
          <Pressable onPress={onClose} style={s.sheetSecondary}>
            <Text style={s.sheetCancel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  stillOpen: { ...T.body, color: P.textSec, marginTop: -S[2], marginBottom: S[3], lineHeight: 20 },
  dayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: P.sunken, borderRadius: RA.sm,
    paddingHorizontal: S[3], paddingVertical: S[2] + 2, marginBottom: S[3],
  },
  dayBtnText: { ...T.body, fontFamily: F.bold },
  dayBtnHint: { ...T.caption, color: P.textMuted },
  dayHead: { ...T.label, marginTop: S[3], marginBottom: S[1] },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,24,42,0.35)' },
  sheet: {
    backgroundColor: P.pageBg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: S[5], paddingBottom: S[8],
  },
  sheetTitle: { ...T.h2, color: P.textPri, textAlign: 'center', marginBottom: S[2] },
  sheetPrimary: {
    backgroundColor: P.brand, borderRadius: RA.sm,
    paddingVertical: S[3] + 2, alignItems: 'center', marginTop: S[2],
  },
  sheetPrimaryText: { ...T.body, fontFamily: F.bold, color: P.textOnDark },
  sheetSecondary: { alignItems: 'center', paddingVertical: S[3] },
  sheetCancel: { ...T.body, color: P.brand },
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
