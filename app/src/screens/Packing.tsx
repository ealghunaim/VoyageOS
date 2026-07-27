import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { generateList, getPackingList, getTimeline, PackItem, Task, updateItem } from '../api';
import { deviceTz, permissionStatus, requestPermission, syncReminders, testPing } from '../notifications';
import { Btn, Card, Progress } from '../components/ui';
import { C } from '../theme';

export default function Packing({ tripId, tripTitle, onBack }: {
  tripId: string; tripTitle: string; onBack: () => void;
}) {
  const [items, setItems] = useState<PackItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined'>('denied');
  const [armed, setArmed] = useState<number | null>(null);

  const loadTimeline = useCallback(async () => {
    try {
      const t = await getTimeline(tripId, deviceTz());
      setTasks(t.tasks.filter(x => x.status === 'pending'));
      const p = await permissionStatus();
      setPerm(p);
      if (p === 'granted') setArmed(await syncReminders(t.reminders));
    } catch {}
  }, [tripId]);

  const load = useCallback(async () => {
    try {
      const d = await getPackingList(tripId);
      setItems(d.items.filter(i => i.status !== 'rejected'));
    } catch (e: any) {
      if (String(e.message).includes('No packing list')) setItems([]);
      else Alert.alert('Error', e.message);
    }
  }, [tripId]);

  useEffect(() => { load(); loadTimeline(); }, [load, loadTimeline]);

  async function generate(regenerate: boolean) {
    setBusy(true);
    try {
      await generateList(tripId, regenerate);
      await load();
    } catch (e: any) {
      Alert.alert('Generation failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function togglePacked(it: PackItem) {
    const next = it.status === 'packed' ? 'suggested' : 'packed';
    setItems(prev => prev!.map(x => (x.id === it.id ? { ...x, status: next } : x)));
    try { await updateItem(it.id, { status: next }); }
    catch (e: any) { Alert.alert('Save failed', e.message); load(); }
  }

  async function dismiss(it: PackItem) {
    setItems(prev => prev!.filter(x => x.id !== it.id));
    try { await updateItem(it.id, { status: 'rejected' }); }
    catch (e: any) { Alert.alert('Save failed', e.message); load(); }
  }

  if (items === null || busy) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={s.loading}>
          {busy ? 'Asking Claude · Applying your quantities…' : 'Loading…'}
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, paddingTop: 24 }}>
        <Header title={tripTitle} onBack={onBack} onRegen={null} />
        <Card>
          <Text style={s.h2}>No packing list yet</Text>
          <Text style={s.reason}>Generate one — every item will come with its reason.</Text>
          <View style={{ height: 12 }} />
          <Btn label="Build my list" onPress={() => generate(false)} />
        </Card>
      </View>
    );
  }

  const packed = items.filter(i => i.status === 'packed').length;
  const groups: { cat: string; rows: PackItem[] }[] = [];
  for (const it of items) {
    const g = groups.find(x => x.cat === it.category);
    if (g) g.rows.push(it); else groups.push({ cat: it.category, rows: [it] });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 16, paddingTop: 24, paddingBottom: 8 }}>
        <Header
          title={tripTitle}
          onBack={onBack}
          onRegen={() =>
            Alert.alert('Regenerate list?', 'This calls the model again (a few cents).', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Regenerate', onPress: () => generate(true) },
            ])
          }
        />
        <Text style={s.progressText}>{packed} / {items.length} packed</Text>
        <Progress value={items.length ? packed / items.length : 0} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true); await load(); setRefreshing(false);
          }} />
        }
      >
        {perm === 'undetermined' && tasks.length > 0 && (
          <View style={s.primer}>
            <Text style={s.primerTitle}>Want reminders at the right moments?</Text>
            <Text style={s.reason}>
              First up: {tasks[0].title} · {new Date(tasks[0].due_at).toLocaleString()}.{'\n'}
              Never more than 3 a day. Quiet 22:00–08:00.
            </Text>
            <View style={{ height: 10 }} />
            <Btn label="Allow reminders" onPress={async () => {
              const ok = await requestPermission();
              setPerm(ok ? 'granted' : 'denied');
              if (ok) loadTimeline();
            }} />
          </View>
        )}
        {tasks.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={s.cat}>UP NEXT</Text>
            {tasks.slice(0, 3).map(t => (
              <View key={t.id} style={s.row}>
                <Text style={{ fontSize: 16, marginRight: 10 }}>⏰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{t.title}</Text>
                  <Text style={s.reason}>{new Date(t.due_at).toLocaleString()}</Text>
                </View>
              </View>
            ))}
            {perm === 'granted' && (
              <Pressable onPress={async () => { await testPing(); }}>
                <Text style={s.testLink}>
                  {armed !== null ? `Reminders armed on this phone ✓ (${armed})` : 'Reminders on ✓'} · Test ping (5s)
                </Text>
              </Pressable>
            )}
          </View>
        )}
        {groups.map(g => (
          <View key={g.cat} style={{ marginBottom: 14 }}>
            <Text style={s.cat}>{g.cat.replace('_', ' ').toUpperCase()}</Text>
            {g.rows.map(it => (
              <Pressable key={it.id} onPress={() => togglePacked(it)} style={s.row}>
                <View style={[s.box, it.status === 'packed' && s.boxOn]}>
                  {it.status === 'packed' && <Text style={s.check}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, it.status === 'packed' && s.nameDone]}>
                    {it.name}{it.qty > 1 ? `  ×${it.qty}` : ''}
                  </Text>
                  {!!it.reason && <Text style={s.reason}>{it.reason}</Text>}
                </View>
                <Pressable onPress={() => dismiss(it)} hitSlop={10} style={s.x}>
                  <Text style={{ color: C.sub, fontSize: 16 }}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        ))}
        <Text style={s.footer}>Suggestions explain themselves — that's the point.</Text>
      </ScrollView>
    </View>
  );
}

function Header({ title, onBack, onRegen }: {
  title: string; onBack: () => void; onRegen: (() => void) | null;
}) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} hitSlop={10}>
        <Text style={{ color: C.blue, fontSize: 16, fontWeight: '700' }}>‹ Back</Text>
      </Pressable>
      <Text style={s.h2} numberOfLines={1}>{title}</Text>
      {onRegen ? (
        <Pressable onPress={onRegen} hitSlop={10}>
          <Text style={{ color: C.blue, fontSize: 18 }}>↻</Text>
        </Pressable>
      ) : <View style={{ width: 20 }} />}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  loading: { color: C.sub, marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  h2: { fontSize: 17, fontWeight: '800', color: C.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  progressText: { color: C.sub, marginBottom: 6, fontWeight: '600' },
  cat: { color: C.sub, fontWeight: '800', fontSize: 12, letterSpacing: 0.6, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  box: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: C.border,
    marginRight: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  boxOn: { backgroundColor: C.green, borderColor: C.green },
  check: { color: '#fff', fontWeight: '900', fontSize: 14 },
  name: { color: C.text, fontSize: 16, fontWeight: '600' },
  nameDone: { color: C.sub, textDecorationLine: 'line-through' },
  reason: { color: C.sub, fontSize: 13, marginTop: 2, lineHeight: 18 },
  x: { paddingLeft: 10, paddingTop: 2 },
  footer: { color: '#9aa7b8', textAlign: 'center', marginVertical: 16, fontSize: 12 },
  primer: {
    backgroundColor: C.blueSoft, borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#c7d9fb',
  },
  primerTitle: { color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  testLink: { color: C.blue, fontWeight: '700', fontSize: 13, marginTop: 4, marginLeft: 2 },
});
