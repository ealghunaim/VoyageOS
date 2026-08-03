import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addPlanItem, deletePlanItem, listPlan, patchPlanItem, PlanItem } from '../api';
import { Card } from '../components/ui';
import { F, P, RA, S, T } from '../theme';

export default function Planner({ tripId, tripTitle, accent, startDate, endDate, onBack }: {
  tripId: string; tripTitle: string; accent: string; startDate: string; endDate: string; onBack: () => void;
}) {
  const [items, setItems] = useState<PlanItem[]>([]);
  // `| undefined` is the truth: drafts starts empty and a day only gains an
  // entry once it is typed into. Record<K,V> claims every key is populated,
  // which made TypeScript read the defaults in setDraft as dead code — they
  // are not, they are what a first keystroke on an untouched day lands on.
  const [drafts, setDrafts] =
    useState<Record<number, { title: string; time: string } | undefined>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listPlan(tripId).then(setItems).catch(() => {});
  }, [tripId]);
  useEffect(load, [load]);

  const days = useMemo(() => {
    const out: { k: number; label: string }[] = [];
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    const n = isNaN(s.getTime()) || isNaN(e.getTime())
      ? 1 : Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
    for (let k = 1; k <= Math.min(n, 60); k++) {
      const d = new Date(s.getTime() + (k - 1) * 86400000);
      const label = isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      out.push({ k, label });
    }
    return out;
  }, [startDate, endDate]);

  const setDraft = (day: number, patch: Partial<{ title: string; time: string }>) =>
    setDrafts(prev => ({ ...prev, [day]: { title: '', time: '', ...prev[day], ...patch } }));

  async function add(day: number) {
    const d = drafts[day];
    if (!d?.title.trim()) return;
    setBusy(true);
    try {
      await addPlanItem(tripId, { day, title: d.title.trim(), time: d.time.trim() || undefined });
      setDrafts(prev => ({ ...prev, [day]: { title: '', time: '' } }));
      load();
    } catch (e: any) { Alert.alert('Plan', e.message); }
    finally { setBusy(false); }
  }

  async function toggle(it: PlanItem) {
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, done: !x.done } : x));
    try { await patchPlanItem(tripId, it.id, { done: !it.done }); }
    catch { load(); }
  }

  function confirmDelete(it: PlanItem) {
    Alert.alert('Remove', `Remove "${it.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setItems(prev => prev.filter(x => x.id !== it.id));
        try { await deletePlanItem(tripId, it.id); } catch { load(); }
      } },
    ]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={{ padding: S[5] }}
      keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: S[3] }}>
        <Text style={[s.back, { color: accent }]}>‹ {tripTitle}</Text>
      </Pressable>
      <Text style={s.h1}>Plan</Text>
      <Text style={s.sub}>Map out each day — tap an item to mark it done.</Text>

      {days.map(({ k, label }) => {
        const dayItems = items.filter(it => it.day === k);
        const draft = drafts[k] ?? { title: '', time: '' };
        return (
          <Card key={k}>
            <Text style={[s.dayHead, { color: accent }]}>DAY {k}{label ? ` · ${label}` : ''}</Text>
            {dayItems.length === 0 && <Text style={s.empty}>Nothing planned yet.</Text>}
            {dayItems.map(it => (
              <Pressable key={it.id} onPress={() => toggle(it)} onLongPress={() => confirmDelete(it)}
                style={s.row}>
                <View style={[s.dot, it.done && { backgroundColor: accent, borderColor: accent }]}>
                  {it.done && <Text style={s.check}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.title, it.done && s.doneText]}>
                    {it.time ? `${it.time}  ·  ` : ''}{it.title}
                  </Text>
                  {!!it.note && <Text style={s.note}>{it.note}</Text>}
                </View>
                <Pressable onPress={() => confirmDelete(it)} hitSlop={8}>
                  <Text style={s.x}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
            <View style={s.addRow}>
              <TextInput style={s.timeInput} value={draft.time}
                onChangeText={(t) => setDraft(k, { time: t })}
                placeholder="9:00" placeholderTextColor={P.textMuted} />
              <TextInput style={s.titleInput} value={draft.title}
                onChangeText={(t) => setDraft(k, { title: t })}
                placeholder="Add a plan…" placeholderTextColor={P.textMuted}
                onSubmitEditing={() => add(k)} returnKeyType="done" />
              <Pressable onPress={() => add(k)} disabled={busy || !draft.title.trim()}
                style={[s.addBtn, { backgroundColor: accent, opacity: draft.title.trim() ? 1 : 0.4 }]}>
                <Text style={s.addBtnText}>Add</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

/**
 * Destructive actions use neutral grey, not red. A destination accent can
 * itself be red (Japan, Singapore, Bahrain), so colour-coding danger would
 * collide with it and stop meaning anything — the weight is carried by the
 * confirm dialog instead, where the decision actually happens.
 *
 * SOS emergency affordances are the deliberate exception: they stay red under
 * a separate "urgent" rule, because there the colour signals speed, not
 * consequence.
 */
const s = StyleSheet.create({
  back: { ...T.title, fontFamily: F.bold },
  h1: { ...T.display, color: P.textPri, marginBottom: S[1] },
  sub: { ...T.body, color: P.textSec, marginBottom: S[3] },
  dayHead: { ...T.label, marginBottom: S[2] },
  empty: { ...T.caption, color: P.textSec, marginBottom: S[2] },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: S[2],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.hairline,
  },
  // hairlineStrong, not hairline: at 1.5px an unticked circle on the page
  // ground all but disappears in the lighter tone.
  dot: {
    width: 22, height: 22, borderRadius: RA.pill, borderWidth: 1.5,
    borderColor: P.hairlineStrong, marginRight: S[3] - 2, marginTop: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  check: { ...T.caption, fontFamily: F.bold, color: P.textOnDark },
  title: { ...T.body, fontFamily: F.med, color: P.textPri },
  doneText: { textDecorationLine: 'line-through', color: P.textMuted },
  note: { ...T.caption, color: P.textSec, marginTop: 2 },
  x: { ...T.body, color: P.textMuted, paddingLeft: S[2], paddingTop: 2 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: S[3] },
  timeInput: {
    width: 54, backgroundColor: P.sunken, borderRadius: RA.sm,
    paddingHorizontal: S[2], paddingVertical: S[2], marginRight: S[1] + 2,
    ...T.body, color: P.textPri,
  },
  titleInput: {
    flex: 1, backgroundColor: P.sunken, borderRadius: RA.sm,
    paddingHorizontal: S[2] + 2, paddingVertical: S[2],
    ...T.body, color: P.textPri,
  },
  addBtn: {
    marginLeft: S[1] + 2, borderRadius: RA.sm,
    paddingHorizontal: S[3] + 2, paddingVertical: S[2] + 1,
  },
  addBtnText: { ...T.body, fontFamily: F.bold, color: P.textOnDark },
});
