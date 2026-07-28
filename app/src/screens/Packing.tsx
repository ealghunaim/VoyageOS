import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View, Platform,
} from 'react-native';
import { addKitItem, applyKit, createKit, quickAddItems, generateList, getPackingList, getTimeline, getTripWeather, getWeight, Kit, listKits, PackItem, refreshTripWeather, setBagLimit, Task, updateItem, WeightInfo, WxDay } from '../api';
import { deviceTz, permissionStatus, requestPermission, syncReminders, testPing } from '../notifications';
import { Btn, Card, Progress } from '../components/ui';
import { C, F } from '../theme';

export default function Packing({ tripId, tripTitle, accent, onBack, onDebrief }: {
  tripId: string; tripTitle: string; accent?: string; onBack: () => void; onDebrief: () => void;
}) {
  const ac = accent ?? C.blue;
  const [items, setItems] = useState<PackItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined'>('denied');
  const [armed, setArmed] = useState<number | null>(null);
  const [weight, setWeight] = useState<WeightInfo | null>(null);
  const [showLimits, setShowLimits] = useState(false);
  const [kits, setKits] = useState<Kit[] | null>(null);
  const [wx, setWx] = useState<WxDay[]>([]);
  const [wxPlace, setWxPlace] = useState<string | null>(null);
  const [quick, setQuick] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);

  const loadTimeline = useCallback(async () => {
    try {
      const t = await getTimeline(tripId, deviceTz());
      setTasks(t.tasks.filter(x => x.status === 'pending'));
      const p = await permissionStatus();
      setPerm(p);
      if (p === 'granted') setArmed(await syncReminders(t.reminders));
    } catch {}
  }, [tripId]);

  const loadWeight = useCallback(async () => {
    try { setWeight(await getWeight(tripId)); } catch {}
  }, [tripId]);

  const loadWx = useCallback(async () => {
    try {
      const w = await getTripWeather(tripId);
      setWx(w.days); setWxPlace(w.place);
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

  useEffect(() => { load(); loadTimeline(); loadWeight(); loadWx(); }, [load, loadTimeline, loadWeight, loadWx]);

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
    try { await updateItem(it.id, { status: next }); loadWeight(); }
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
  const WARDROBE: [string, string][] = [
    ['underwear', 'Underwear'], ['sleep', 'Sleepwear'], ['casual', 'Casual'],
    ['smart_casual', 'Smart casual'], ['formal', 'Formal'], ['traditional', 'Traditional'], ['outerwear', 'Outerwear'],
    ['athleisure', 'Active'], ['footwear', 'Shoes'],
  ];
  const groups: { cat: string; rows: PackItem[] }[] = [];
  const push = (cat: string, it: PackItem) => {
    const g = groups.find(x => x.cat === cat);
    if (g) g.rows.push(it); else groups.push({ cat, rows: [it] });
  };
  for (const it of items) {
    if (it.category === 'clothing' || it.category === 'footwear') {
      const tag = WARDROBE.find(([k]) => k === (it.style_tag ?? ''));
      push(tag ? tag[1] : it.category === 'footwear' ? 'Shoes' : 'Clothing', it);
    } else push(it.category, it);
  }
  const ORDER = [...WARDROBE.map(([, l]) => l), 'Clothing'];
  groups.sort((a, b) => {
    const ia = ORDER.indexOf(a.cat), ib = ORDER.indexOf(b.cat);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

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
        <Progress color={ac} value={items.length ? packed / items.length : 0} />
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
        {wx.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={s.cat}>{(wxPlace ?? 'FORECAST').toUpperCase()} FORECAST</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={s.wxStrip}>
                {wx.map(d =>
                  `${d.date.slice(5)}  ${d.temp_max != null ? Math.round(d.temp_max) : '–'}°/`
                  + `${d.temp_min != null ? Math.round(d.temp_min) : '–'}°`
                  + `${(d.precip_prob ?? 0) >= 60 ? ' ☔' : (d.uv ?? 0) >= 8 ? ' ☀' : ''}`
                ).join('   ·   ')}
              </Text>
            </ScrollView>
          </View>
        )}
        <View style={sq.quickRow}>
          <TextInput
            style={sq.quickInput} value={quick} onChangeText={setQuick}
            placeholder="Add items - try: 2 polos, power bank, sunscreen"
            placeholderTextColor="#9AA9BB"
          />
          <Pressable disabled={quickBusy || quick.trim().length < 2} onPress={async () => {
            setQuickBusy(true);
            try {
              const added = await quickAddItems(tripId, quick.trim());
              setQuick('');
              await load();
              Alert.alert('Added', added.map(i => `- ${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join('\n'));
            } catch (e: any) { Alert.alert('Add items', e.message); }
            finally { setQuickBusy(false); }
          }}>
            <Text style={[sq.quickBtn, { color: ac }, (quickBusy || quick.trim().length < 2) && { opacity: 0.4 }]}>{quickBusy ? '...' : 'Add'}</Text>
          </Pressable>
        </View>
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
                  {it.source === 'history' && (
                    <Text style={s.histBadge}>⚑ forgot last time</Text>
                  )}
                  {it.source === 'weather' && (
                    <Text style={s.wxBadge}>☔ forecast</Text>
                  )}
                  {!!it.reason && <Text style={s.reason}>{it.reason}</Text>}
                </View>
                <Pressable hitSlop={10} style={{ marginRight: 12 }} onPress={() => {
                  const opts = [['underwear','Underwear'],['casual','Casual'],['smart_casual','Smart casual'],['formal','Formal'],['traditional','Traditional'],['outerwear','Outerwear'],['athleisure','Active'],['footwear','Shoes']] as const;
                  Alert.alert('Move to', it.name, [
                    ...opts.map(([v, l]) => ({ text: l, onPress: async () => {
                      try { await updateItem(it.id, { style_tag: v }); await load(); } catch {}
                    } })),
                    { text: 'Cancel', style: 'cancel' as const },
                  ]);
                }}>
                  <Text style={{ color: '#9AA9BB', fontSize: 15, fontFamily: F.bold }}>...</Text>
                </Pressable>
                <Pressable onPress={() => dismiss(it)} hitSlop={10} style={s.x}>
                  <Text style={{ color: C.sub, fontSize: 16 }}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ marginTop: 4 }}>
          <Pressable onPress={async () => {
            if (kits === null) { try { setKits(await listKits()); } catch {} }
            else setKits(null);
          }}>
            <Text style={[s.closeout, { color: ac }]}>Apply a kit ›</Text>
          </Pressable>
          <Pressable onPress={async () => {
            try {
              const r = await refreshTripWeather(tripId);
              if (!r.ok) { Alert.alert('Weather', r.note ?? 'No forecast available.'); return; }
              const lines = (r.insights ?? []).map(i => `• ${i.reason}`).join('\n');
              Alert.alert(
                `${r.place} forecast checked`,
                `${r.items_added} item(s) added` +
                ((r.covered ?? []).length ? ` · ${(r.covered ?? []).length} already covered` : '') +
                (r.note ? `\n${r.note}` : '') + (lines ? `\n${lines}` : ''),
              );
              await load(); loadWx(); loadWeight();
            } catch (e: any) { Alert.alert('Weather', e.message); }
          }}>
            <Text style={[s.closeout, { color: ac }]}>Refresh weather ›</Text>
          </Pressable>
          <Pressable onPress={() => {
            const packedItems = items.filter(i => i.status === 'packed');
            if (!packedItems.length) { Alert.alert('Save as kit', 'Check some items first - your packed items become the kit.'); return; }
            const doSave = async (name: string) => {
              try {
                const kit = await createKit(name);
                for (const i of packedItems) await addKitItem(kit.id, i.name);
                Alert.alert('Kit saved', `"${name}" holds ${packedItems.length} item(s).`);
              } catch (e: any) { Alert.alert('Save as kit', e.message); }
            };
            if (Platform.OS === 'ios' && (Alert as any).prompt) {
              (Alert as any).prompt('Name this kit', `${packedItems.length} packed item(s)`, (n: string) => n?.trim() && doSave(n.trim()));
            } else doSave(`${tripTitle} kit`);
          }}>
            <Text style={[s.closeout, { color: ac }]}>Save packed as kit ›</Text>
          </Pressable>
          {kits !== null && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              {kits.length === 0 && <Text style={s.reason}>No kits yet — create one from Home.</Text>}
              {kits.map(k => (
                <Pressable key={k.id} style={s.kitChip} onPress={async () => {
                  try {
                    const r = await applyKit(k.id, tripId);
                    Alert.alert(`${r.kit} applied`, `${r.added} added · ${r.already_there} already on the list`);
                    setKits(null); await load(); loadWeight();
                  } catch (e: any) { Alert.alert('Error', e.message); }
                }}>
                  <Text style={{ color: C.blue, fontFamily: F.med }}>{k.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <Pressable onPress={onDebrief}>
          <Text style={[s.closeout, { color: ac }]}>Close out this trip — 60-second debrief ›</Text>
        </Pressable>
        <Text style={s.footer}>Suggestions explain themselves — that's the point.</Text>
      </ScrollView>
      {weight && (
        <Pressable style={s.weightBar} onPress={() => setShowLimits(v => !v)}>
          <Text style={{
            fontFamily: F.bold,
            color: weight.limit_g && weight.total_g > weight.limit_g ? C.red
              : weight.limit_g && weight.total_g > weight.limit_g * 0.85 ? '#b45309' : C.text,
          }}>
            {(weight as any).approx ? '~' : ''}{(weight.total_g / 1000).toFixed(1)} kg
            {weight.limit_g ? ` / ${(weight.limit_g / 1000).toFixed(0)} kg` : ' · set a target ›'}
            {weight.unweighed ? `  · ${weight.unweighed} estimated` : ''}
          </Text>
          {showLimits && (
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {[7, 10, 23, 32].map(kg => (
                <Pressable key={kg} style={s.kitChip} onPress={async () => {
                  await setBagLimit(tripId, kg * 1000); setShowLimits(false); loadWeight();
                }}>
                  <Text style={{ color: C.blue, fontFamily: F.med }}>{kg} kg</Text>
                </Pressable>
              ))}
              <Pressable style={s.kitChip} onPress={async () => {
                await setBagLimit(tripId, null); setShowLimits(false); loadWeight();
              }}>
                <Text style={{ color: C.sub, fontFamily: F.med }}>none</Text>
              </Pressable>
            </View>
          )}
          <Text style={s.weightNote}>your target — not an airline rule</Text>
        </Pressable>
      )}
    </View>
  );
}

function Header({ title, onBack, onRegen }: {
  title: string; onBack: () => void; onRegen: (() => void) | null;
}) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} hitSlop={10}>
        <Text style={{ color: C.blue, fontSize: 16, fontFamily: F.med }}>‹ Back</Text>
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
  h2: { fontSize: 17, fontFamily: F.bold, color: C.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  progressText: { color: C.sub, marginBottom: 6, fontWeight: '600' },
  cat: { color: C.sub, fontFamily: F.bold, fontSize: 12, letterSpacing: 0.6, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  box: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: C.border,
    marginRight: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  boxOn: { backgroundColor: C.green, borderColor: C.green },
  check: { color: '#fff', fontFamily: F.bold, fontSize: 14 },
  name: { color: C.text, fontSize: 16, fontWeight: '600' },
  nameDone: { color: C.sub, textDecorationLine: 'line-through' },
  reason: { color: C.sub, fontSize: 13, marginTop: 2, lineHeight: 18 },
  x: { paddingLeft: 10, paddingTop: 2 },
  footer: { color: '#9aa7b8', textAlign: 'center', marginVertical: 16, fontSize: 12 },
  primer: {
    backgroundColor: C.blueSoft, borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#c7d9fb',
  },
  primerTitle: { color: C.text, fontFamily: F.bold, fontSize: 15, marginBottom: 4 },
  testLink: { color: C.blue, fontFamily: F.med, fontSize: 13, marginTop: 4, marginLeft: 2 },
  histBadge: { color: '#b45309', fontFamily: F.bold, fontSize: 12, marginTop: 2 },
  wxBadge: { color: C.blue, fontFamily: F.bold, fontSize: 12, marginTop: 2 },
  wxStrip: { color: C.text, fontSize: 14, fontWeight: '600', lineHeight: 22 },
  closeout: { color: C.blue, fontFamily: F.med, textAlign: 'center', marginTop: 10 },
  kitChip: { borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, margin: 4 },
  weightBar: { backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, padding: 12, alignItems: 'center' },
  weightNote: { color: '#9aa7b8', fontSize: 11, marginTop: 3 },
});

const sq = StyleSheet.create({
  quickRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  quickInput: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  quickBtn: { color: C.blue, fontFamily: F.bold, fontSize: 16, marginLeft: 12 },
});
