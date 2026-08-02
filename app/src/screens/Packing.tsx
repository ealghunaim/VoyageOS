import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View, Platform,
} from 'react-native';
import { addKitItem, applyKit, createKit, quickAddItems, generateList, getPackingList, getTimeline, getTripWeather, getWeight, Kit, listKits, PackItem, refreshTripWeather, setBagLimit, Task, updateItem, WeightInfo, WxDay } from '../api';
import { deviceTz, permissionStatus, requestPermission, syncReminders, testPing } from '../notifications';
import { Btn, Card, Progress } from '../components/ui';
import JourneyLoader from '../components/JourneyLoader';
import { F, P, RA, S, T, tint } from '../theme';

export default function Packing({ tripId, tripTitle, accent, onBack, onDebrief }: {
  tripId: string; tripTitle: string; accent?: string; onBack: () => void; onDebrief: () => void;
}) {
  const ac = accent ?? P.brand;
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
        <JourneyLoader accent={ac} label="Packing your trip..." />
        <Text style={s.loading}>
          {busy ? 'Asking Claude · Applying your quantities…' : 'Loading…'}
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: P.pageBg, padding: S[4], paddingTop: S[6] }}>
        <Header title={tripTitle} accent={ac} onBack={onBack} onRegen={null} />
        <Card>
          <Text style={s.h2}>No packing list yet</Text>
          <Text style={s.reason}>Generate one — every item will come with its reason.</Text>
          <View style={{ height: S[3] }} />
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
    <View style={{ flex: 1, backgroundColor: P.pageBg }}>
      <View style={{ padding: S[4], paddingTop: S[6], paddingBottom: S[2] }}>
        <Header
          title={tripTitle}
          accent={ac}
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
        contentContainerStyle={{ padding: S[4], paddingTop: S[1] }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true); await load(); setRefreshing(false);
          }} />
        }
      >
        {perm === 'undetermined' && tasks.length > 0 && (
          <View style={[s.primer, { backgroundColor: tint(ac, 0.06), borderColor: tint(ac, 0.18) }]}>
            <Text style={s.primerTitle}>Want reminders at the right moments?</Text>
            <Text style={s.reason}>
              First up: {tasks[0].title} · {new Date(tasks[0].due_at).toLocaleString()}.{'\n'}
              Never more than 3 a day. Quiet 22:00–08:00.
            </Text>
            <View style={{ height: S[3] }} />
            <Btn label="Allow reminders" onPress={async () => {
              const ok = await requestPermission();
              setPerm(ok ? 'granted' : 'denied');
              if (ok) loadTimeline();
            }} />
          </View>
        )}
        {tasks.length > 0 && (
          <View style={{ marginBottom: S[4] }}>
            <Text style={s.cat}>UP NEXT</Text>
            {tasks.slice(0, 3).map(t => (
              <View key={t.id} style={s.row}>
                <Text style={{ fontSize: 16, marginRight: S[3] }}>⏰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{t.title}</Text>
                  <Text style={s.reason}>{new Date(t.due_at).toLocaleString()}</Text>
                </View>
              </View>
            ))}
            {perm === 'granted' && (
              <Pressable onPress={async () => { await testPing(); }}>
                <Text style={[s.testLink, { color: ac }]}>
                  {armed !== null ? `Reminders armed on this phone ✓ (${armed})` : 'Reminders on ✓'} · Test ping (5s)
                </Text>
              </Pressable>
            )}
          </View>
        )}
        {wx.length > 0 && (
          <View style={{ marginBottom: S[4] }}>
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
            placeholderTextColor={P.textMuted}
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
          <View key={g.cat} style={{ marginBottom: S[4] }}>
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
                    <Text style={[s.wxBadge, { color: ac }]}>☔ forecast</Text>
                  )}
                  {!!it.reason && <Text style={s.reason}>{it.reason}{it.weight_g ? `  ·  ${it.weight_g}g` : ''}</Text>}
                </View>
                <Pressable hitSlop={10} style={{ marginRight: S[3] }} onPress={() => {
                  const opts = [['underwear','Underwear'],['casual','Casual'],['smart_casual','Smart casual'],['formal','Formal'],['traditional','Traditional'],['outerwear','Outerwear'],['athleisure','Active'],['footwear','Shoes']] as const;
                  Alert.alert('Move to', it.name, [
                    { text: 'Set weight (g)', onPress: () => {
                      if (Platform.OS === 'ios' && (Alert as any).prompt) {
                        (Alert as any).prompt('Weight in grams', it.name, async (v: string) => {
                          const g = parseInt(v, 10);
                          if (g >= 1 && g <= 50000) {
                            try { await updateItem(it.id, { weight_g: g }); await load(); } catch {}
                          }
                        }, 'plain-text', it.weight_g ? String(it.weight_g) : '');
                      }
                    } },
                    ...opts.map(([v, l]) => ({ text: l, onPress: async () => {
                      try { await updateItem(it.id, { style_tag: v }); await load(); } catch {}
                    } })),
                    { text: 'Cancel', style: 'cancel' as const },
                  ]);
                }}>
                  <Text style={s.more}>...</Text>
                </Pressable>
                <Pressable onPress={() => dismiss(it)} hitSlop={10} style={s.x}>
                  <Text style={s.xMark}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ marginTop: S[1] }}>
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
                  <Text style={[s.kitChipText, { color: ac }]}>{k.name}</Text>
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
          <Text style={[s.weightValue, {
            // over the target is an error, within 15% of it is a caution.
            color: weight.limit_g && weight.total_g > weight.limit_g ? P.danger
              : weight.limit_g && weight.total_g > weight.limit_g * 0.85 ? P.warningInk : P.textPri,
          }]}>
            {(weight as any).approx ? '~' : ''}{(weight.total_g / 1000).toFixed(1)} kg
            {weight.limit_g ? ` / ${(weight.limit_g / 1000).toFixed(0)} kg` : ' · set a target ›'}
            {weight.unweighed ? `  · ${weight.unweighed} estimated` : ''}
          </Text>
          {showLimits && (
            <View style={{ flexDirection: 'row', marginTop: S[2] }}>
              {[7, 10, 23, 32].map(kg => (
                <Pressable key={kg} style={s.kitChip} onPress={async () => {
                  await setBagLimit(tripId, kg * 1000); setShowLimits(false); loadWeight();
                }}>
                  <Text style={[s.kitChipText, { color: ac }]}>{kg} kg</Text>
                </Pressable>
              ))}
              <Pressable style={s.kitChip} onPress={async () => {
                await setBagLimit(tripId, null); setShowLimits(false); loadWeight();
              }}>
                <Text style={[s.kitChipText, { color: P.textSec }]}>none</Text>
              </Pressable>
            </View>
          )}
          <Text style={s.weightNote}>your target — not an airline rule</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Back and regenerate take the destination accent, not brand blue — inside a
 * trip the accent owns every control, navigation included. See the colour
 * ownership rule in theme.ts.
 */
function Header({ title, accent, onBack, onRegen }: {
  title: string; accent: string; onBack: () => void; onRegen: (() => void) | null;
}) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} hitSlop={10}>
        <Text style={[s.back, { color: accent }]}>‹ Back</Text>
      </Pressable>
      <Text style={s.h2} numberOfLines={1}>{title}</Text>
      {onRegen ? (
        <Pressable onPress={onRegen} hitSlop={10}>
          <Text style={[s.regen, { color: accent }]}>↻</Text>
        </Pressable>
      ) : <View style={{ width: S[5] }} />}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: P.pageBg, alignItems: 'center', justifyContent: 'center' },
  loading: { ...T.body, color: P.textSec, marginTop: S[3] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S[3] },
  back: { ...T.title },
  regen: { ...T.h2 },
  h2: { ...T.h2, color: P.textPri, flex: 1, textAlign: 'center', marginHorizontal: S[2] },
  progressText: { ...T.caption, fontFamily: F.med, color: P.textSec, marginBottom: S[2] },
  cat: { ...T.label, color: P.textSec, marginBottom: S[2] },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: P.card,
    borderWidth: 1, borderColor: P.hairline, borderRadius: RA.md, padding: S[3], marginBottom: S[2],
  },
  box: {
    width: 24, height: 24, borderRadius: RA.sm, borderWidth: 2, borderColor: P.hairlineStrong,
    marginRight: S[3], alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  boxOn: { backgroundColor: P.success, borderColor: P.success },
  check: { fontFamily: F.bold, fontSize: 14, color: P.textOnDark },
  name: { ...T.title, color: P.textPri },
  nameDone: { color: P.textMuted, textDecorationLine: 'line-through' },
  reason: { ...T.caption, color: P.textSec, marginTop: 2 },
  more: { ...T.body, fontFamily: F.bold, color: P.textMuted },
  x: { paddingLeft: S[3], paddingTop: 2 },
  xMark: { ...T.title, fontFamily: F.reg, color: P.textSec },
  footer: { ...T.caption, color: P.textMuted, textAlign: 'center', marginVertical: S[4] },
  primer: {
    borderRadius: RA.md, padding: S[4], marginBottom: S[4], borderWidth: 1,
  },
  primerTitle: { ...T.title, fontFamily: F.bold, color: P.textPri, marginBottom: S[1] },
  testLink: { ...T.caption, fontFamily: F.med, marginTop: S[1], marginLeft: 2 },
  histBadge: { ...T.caption, fontFamily: F.bold, color: P.warningInk, marginTop: 2 },
  wxBadge: { ...T.caption, fontFamily: F.bold, marginTop: 2 },
  wxStrip: { ...T.body, fontFamily: F.med, color: P.textPri, lineHeight: 22 },
  closeout: { ...T.title, textAlign: 'center', marginTop: S[3] },
  kitChip: {
    borderWidth: 1, borderColor: P.hairline, backgroundColor: P.card,
    paddingHorizontal: S[4], paddingVertical: S[2], borderRadius: RA.pill, margin: S[1],
  },
  kitChipText: { ...T.body, fontFamily: F.med },
  weightBar: { backgroundColor: P.card, borderTopWidth: 1, borderTopColor: P.hairline, padding: S[3], alignItems: 'center' },
  weightValue: { ...T.title, fontFamily: F.bold },
  weightNote: { ...T.caption, fontSize: 11, color: P.textMuted, marginTop: 3 },
});

const sq = StyleSheet.create({
  quickRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S[4] },
  quickInput: {
    flex: 1, backgroundColor: P.card, borderRadius: RA.md, paddingHorizontal: S[4],
    paddingVertical: S[3], ...T.body, color: P.textPri, borderWidth: 1, borderColor: P.hairline,
  },
  quickBtn: { ...T.title, fontFamily: F.bold, marginLeft: S[3] },
});
