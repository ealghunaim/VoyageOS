import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getPackingList, PackItem, searchItems, submitDebrief } from '../api';
import { Btn, Card, Chip } from '../components/ui';
import { C } from '../theme';

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

  async function submit() {
    setState('saving');
    try {
      const r = await submitDebrief(tripId, forgot, Array.from(unused));
      setSummary(
        `${r.forgot} forgotten · ${r.unused} unused · ${r.packed_recorded} packed items remembered.`
      );
      setState('done');
    } catch (e: any) {
      setState('edit');
      Alert.alert('Could not save', e.message);
    }
  }

  if (state === 'done') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, paddingTop: 40 }}>
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
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: 24 }}>
      <View style={s.header}>
        <Pressable onPress={onDone} hitSlop={10}>
          <Text style={{ color: C.blue, fontSize: 16, fontWeight: '700' }}>Skip</Text>
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
          placeholderTextColor="#9aa7b8"
        />
        {results.map(r => (
          <Pressable key={r.id} onPress={() => addForgot(r.name)} style={s.result}>
            <Text style={{ color: C.text }}>{r.name}</Text>
          </Pressable>
        ))}
        {q.trim().length >= 2 && (
          <Pressable onPress={() => addForgot(q)} style={s.result}>
            <Text style={{ color: C.blue, fontWeight: '700' }}>Add "{q.trim()}"</Text>
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
        onPress={submit}
      />
      <Text style={s.footnote}>
        This writes to your personal travel memory — the thing that makes trip #5 better than trip #1.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  h1: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 4 },
  h2: { fontSize: 15, fontWeight: '700', color: C.sub, flex: 1, textAlign: 'center' },
  sub: { color: C.sub, marginBottom: 12, lineHeight: 20 },
  q: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, marginBottom: 6,
  },
  result: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  footnote: { color: '#9aa7b8', textAlign: 'center', marginVertical: 16, fontSize: 12, lineHeight: 17 },
});
