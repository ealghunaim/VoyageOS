import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { addPlanItem, deletePlanItem, listPlan, patchPlanItem, PlanItem } from '../api';
import { Card } from '../components/ui';
import { byTime, dateForMinutes, formatTime, parseTime, toStored } from '../planTime';
import { F, P, RA, S, T } from '../theme';
import { FAB_CLEARANCE } from '../components/TopBar';

/** Which time is being picked: a draft on day N, or an item already saved. */
type Picking = { kind: 'draft'; day: number } | { kind: 'item'; item: PlanItem };

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
  const [picking, setPicking] = useState<Picking | null>(null);

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

  /** Commit a picked time. `null` clears it.
   *
   *  Clearing has to be reachable — the old text field could be emptied with
   *  backspace, and a picker with no way out would be a regression dressed up
   *  as an improvement.
   */
  async function commitTime(target: Picking, value: string | null) {
    if (target.kind === 'draft') { setDraft(target.day, { time: value ?? '' }); return; }
    const it = target.item;
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, time: value } : x));
    try {
      // PlanItemPatch drops None fields, so clearing needs the empty string —
      // which the router stores as NULL via `body.time or None`.
      await patchPlanItem(tripId, it.id, { time: value ?? '' });
    } catch (e: any) { Alert.alert('Plan', e.message); load(); }
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
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={{ padding: S[5], paddingBottom: FAB_CLEARANCE }}
      keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: S[3] }}>
        <Text style={[s.back, { color: accent }]}>‹ {tripTitle}</Text>
      </Pressable>
      <Text style={s.h1}>Plan</Text>
      <Text style={s.sub}>Map out each day — tap an item to mark it done.</Text>

      {days.map(({ k, label }) => {
        // Ordered by the clock, not by when they were typed. Adding breakfast
        // after dinner used to leave it below dinner, which made the list a
        // record of the planning rather than of the day.
        const dayItems = byTime(items.filter(it => it.day === k));
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
                {/* The time is its own target. Before this there was no way to
                    correct one at all — the picker only existed while adding,
                    so a mistyped 9pm was permanent short of deleting the item. */}
                <Pressable onPress={() => setPicking({ kind: 'item', item: it })} hitSlop={6}
                  style={s.gutter}>
                  <Text style={[s.gutterText, it.done && s.doneText,
                                !it.time && s.gutterEmpty]} numberOfLines={1}>
                    {it.time ? formatTime(it.time) : '＋'}
                  </Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[s.title, it.done && s.doneText]}>{it.title}</Text>
                  {!!it.note && <Text style={s.note}>{it.note}</Text>}
                </View>
                <Pressable onPress={() => confirmDelete(it)} hitSlop={8}>
                  <Text style={s.x}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
            <View style={s.addRow}>
              <Pressable onPress={() => setPicking({ kind: 'draft', day: k })}
                style={s.timeBtn}>
                <Text style={[s.timeBtnText, !draft.time && { color: P.textMuted }]}
                  numberOfLines={1}>
                  {draft.time ? formatTime(draft.time) : 'Time'}
                </Text>
              </Pressable>
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

      {picking && <TimePicker target={picking} onPick={commitTime}
        onClose={() => setPicking(null)} />}
    </ScrollView>
  );
}

/** The picker, sheeted on iOS and native-dialog elsewhere.
 *
 *  iOS spinners are inline views with no chrome of their own — shown bare they
 *  would sit in the page with nothing to dismiss them and no way to say "no
 *  time". Android's is already a modal dialog, so wrapping it in a second one
 *  would stack two scrims.
 */
function TimePicker({ target, onPick, onClose }: {
  target: Picking;
  onPick: (t: Picking, value: string | null) => void;
  onClose: () => void;
}) {
  const current = target.kind === 'draft' ? null : target.item.time;
  const [value, setValue] = useState<Date>(dateForMinutes(parseTime(current)));
  const hasTime = target.kind === 'item' ? !!target.item.time : false;

  if (Platform.OS !== 'ios') {
    return (
      <DateTimePicker value={value} mode="time" display="default"
        onChange={(e, d) => {
          onClose();
          if (e.type === 'set' && d) onPick(target, toStored(d));
        }} />
    );
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.sheetWrap}>
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>
            {target.kind === 'item' ? target.item.title : 'What time?'}
          </Text>
          <DateTimePicker value={value} mode="time" display="spinner"
            onChange={(_, d) => d && setValue(d)} />
          <Pressable onPress={() => { onPick(target, toStored(value)); onClose(); }}
            style={s.sheetPrimary}>
            <Text style={s.sheetPrimaryText}>Set time</Text>
          </Pressable>
          {hasTime && (
            <Pressable onPress={() => { onPick(target, null); onClose(); }}
              style={s.sheetSecondary}>
              <Text style={s.sheetClear}>Remove time</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} style={s.sheetSecondary}>
            <Text style={s.sheetCancel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  // A gutter, not an inline prefix: down a day's list the times line up into a
  // column you can read as a schedule, which "9:00  ·  Breakfast" never did.
  gutter: { width: 62, paddingRight: S[2], marginTop: 1 },
  gutterText: { ...T.caption, fontFamily: F.bold, color: P.textSec },
  gutterEmpty: { color: P.textMuted, fontFamily: F.med },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: S[3] },
  timeBtn: {
    width: 76, backgroundColor: P.sunken, borderRadius: RA.sm,
    paddingHorizontal: S[2], paddingVertical: S[2] + 1, marginRight: S[1] + 2,
    alignItems: 'center',
  },
  timeBtnText: { ...T.caption, fontFamily: F.bold, color: P.textPri },
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
  sheetClear: { ...T.body, color: P.textSec },
  sheetCancel: { ...T.body, color: P.brand },
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
