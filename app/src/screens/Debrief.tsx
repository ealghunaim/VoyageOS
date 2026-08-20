import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getPackingList, PackItem, searchItems, submitDebrief, TripNotEndedError } from '../api';
import { Btn, Card, Chip } from '../components/ui';
import { P, S, RA, T } from '../theme';
import { FAB_CLEARANCE } from '../components/TopBar';

export default function Debrief({ tripId, tripTitle, onDone }: {
  tripId: string; tripTitle: string; onDone: () => void;
}) {
  const [forgot, setForgot] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);
  const [packed, setPacked] = useState<PackItem[]>([]);
  const [unused, setUnused] = useState<Set<string>>(new Set());
  const [state, setState] = useState<'edit' | 'saving' | 'done'>('edit');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    getPackingList(tripId)
      .then(d => setPacked(d.items.filter(i => i.status === 'packed')))
      .catch(() => setPacked([]));
  }, [tripId]);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      searchItems(q).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const addForgot = (name: string) => {
    const n = name.trim();
    if (n && !forgot.includes(n)) setForgot([...forgot, n]);
    setQ(''); setResults([]);
  };

  const toggleUnused = (name: string) => {
    const next = new Set(unused);
    if (next.has(name)) { next.delete(name); } else { next.add(name); }
    setUnused(next);
  };

  async function submit(confirmEarly = false) {
    setState('saving');
    try {
      const r = await submitDebrief(tripId, forgot, Array.from(unused), confirmEarly);
      setSummary(
        `${r.forgot} forgotten · ${r.unused} unused · ${r.packed_recorded} packed items remembered.`
        // Said out loud when it happens. Redoing a debrief is allowed — it
        // replaces the previous one rather than adding to it — but a silent
        // replacement would leave someone unsure which version counted.
        + (r.replaced_previous ? '\n\nThis replaced your earlier debrief.' : '')
      );
      setState('done');
    } catch (e: any) {
      setState('edit');
      // A trip that has not ended is a question, not a failure. Closing one
      // out early is legitimate — a trip cut short — and the defect was doing
      // it without asking, since a completed trip drops out of Upcoming.
      if (e instanceof TripNotEndedError) {
        Alert.alert('This trip hasn’t ended', e.message, [
          { text: 'Not yet', style: 'cancel' },
          { text: 'Close it out', onPress: () => submit(true) },
        ]);
        return;
      }
      Alert.alert('Could not save', e.message);
    }
  }

  if (state === 'done') {
    return (
      <View style={{ flex: 1, backgroundColor: P.pageBg, padding: S[4], paddingTop: S[10] }}>
        <Card>
          <Text style={s.h1}>Noted. ✓</Text>
          <Text style={s.sub}>{summary}</Text>
          <Text style={s.sub}>Your next trip will flag these — that's the whole point.</Text>
          <View style={{ height: 10 }} />
          <Btn label="Done" onPress={onDone} />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={{ padding: S[4], paddingTop: S[6], paddingBottom: FAB_CLEARANCE }}>
      <View style={s.header}>
        <Pressable onPress={onDone} hitSlop={10}>
          <Text style={[T.title, { color: P.brand }]}>Skip</Text>
        </Pressable>
        <Text style={s.h2} numberOfLines={1}>{tripTitle}</Text>
        <View style={{ width: 34 }} />
      </View>
      <Text style={s.h1}>60-second debrief</Text>
      <Text style={s.sub}>Two questions. Every answer makes the next trip smarter.</Text>

      <Card>
        <Text style={s.q}>1 · Did you forget anything?</Text>
        <TextInput
          style={s.input}
          value={q}
          onChangeText={setQ}
          placeholder="Search or type an item…"
          placeholderTextColor={P.textMuted}
        />
        {results.map(r => (
          <Pressable key={r.id} onPress={() => addForgot(r.name)} style={s.result}>
            <Text style={[T.body, { color: P.textPri }]}>{r.name}</Text>
          </Pressable>
        ))}
        {q.trim().length >= 2 && (
          <Pressable onPress={() => addForgot(q)} style={s.result}>
            <Text style={[T.title, { color: P.brand }]}>Add "{q.trim()}"</Text>
          </Pressable>
        )}
        <View style={s.chipWrap}>
          {forgot.map(n => (
            <Chip key={n} label={`${n} ✕`} selected
              onPress={() => setForgot(forgot.filter(x => x !== n))} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={s.q}>2 · Packed but never used?</Text>
        {packed.length === 0 && (
          <Text style={s.sub}>Nothing was checked off as packed on this trip.</Text>
        )}
        <View style={s.chipWrap}>
          {packed.map(p => (
            <Chip key={p.id} label={p.name} selected={unused.has(p.name)}
              onPress={() => toggleUnused(p.name)} />
          ))}
        </View>
      </Card>

      <Btn
        label={state === 'saving' ? 'Saving…' : 'Save & close out trip'}
        disabled={state === 'saving'}
        // NOT `onPress={submit}` — Pressable passes the press event as the
        // first argument, which would arrive as confirmEarly=<event>, a truthy
        // value that skips the confirmation this whole change exists to add.
        onPress={() => submit()}
      />
      <Text style={s.footnote}>
        This writes to your personal travel memory — the thing that makes trip #5 better than trip #1.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: S[2] },
  h1: { ...T.h1, color: P.textPri, marginBottom: S[1] },
  h2: { ...T.body, color: P.textSec, flex: 1, textAlign: 'center' },
  sub: { ...T.body, color: P.textSec, marginBottom: S[3] },
  q: { ...T.h2, color: P.textPri, marginBottom: S[3] },
  input: {
    ...T.body, borderWidth: 1, borderColor: P.hairline, borderRadius: RA.md,
    backgroundColor: P.card, paddingHorizontal: S[4], paddingVertical: S[3],
    color: P.textPri, marginBottom: S[2],
  },
  result: { paddingVertical: S[2] + 2, borderBottomWidth: 1, borderBottomColor: P.hairline },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: S[2] },
  footnote: { ...T.caption, color: P.textMuted, textAlign: 'center', marginVertical: S[4] },
});
