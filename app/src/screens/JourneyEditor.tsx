import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { patchTrip, Segment, Trip } from '../api';
import { Btn } from '../components/ui';
import { C, F, tint } from '../theme';

const MODES: [string, string][] = [['flight', '✈ Flight'], ['train', '🚆 Train'], ['ship', '🚢 Ship'], ['drive', '🚗 Drive']];
const MODE_ICON: Record<string, string> = { flight: '✈', train: '🚆', ship: '🚢', drive: '🚗' };

function fmtDT(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function gapMins(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const ma = new Date(a).getTime(), mb = new Date(b).getTime();
  if (isNaN(ma) || isNaN(mb)) return null;
  return Math.round((mb - ma) / 60000);
}
function humanDur(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60), m = Math.abs(mins) % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m`;
}

export default function JourneyEditor({ trip, accent, onClose, onSaved }: {
  trip: Trip; accent: string; onClose: () => void; onSaved: (t: Trip) => void;
}) {
  const [segs, setSegs] = useState<Segment[]>(trip.segments ?? []);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<{ i: number; field: 'depart' | 'arrive' } | null>(null);

  const update = (i: number, patch: Partial<Segment>) =>
    setSegs(segs.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= segs.length) return;
    const copy = [...segs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setSegs(copy);
    setEditing(null);
  };
  const add = () => {
    setSegs([...segs, { mode: 'flight', ref: '', origin: '', dest: '', depart: null, arrive: null }]);
    setEditing(segs.length);
  };

  async function save() {
    setSaving(true);
    try {
      const clean = segs.filter(s => s.origin || s.dest || s.ref || s.depart);
      const t = await patchTrip(trip.id, { segments: clean });
      onSaved({ ...trip, ...t, segments: clean });
      onClose();
    } catch (e: any) { Alert.alert('Journey', e.message); }
    finally { setSaving(false); }
  }

  const totalMins = segs.length >= 1 ? gapMins(segs[0].depart, segs[segs.length - 1].arrive) : null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={s.top}>
          <Pressable onPress={onClose} hitSlop={10}><Text style={[s.close, { color: accent }]}>Close</Text></Pressable>
          <Text style={s.title}>Your journey</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          {segs.length === 0 && (
            <Text style={s.empty}>Add each leg of your trip — flights, trains, ferries, drives. Times you enter here power your leave-by and arrival reminders.</Text>
          )}

          {segs.map((sg, i) => {
            const layover = i > 0 ? gapMins(segs[i - 1].arrive, sg.depart) : null;
            const tight = layover != null && layover >= 0 && layover < 90;
            const negative = layover != null && layover < 0;
            return (
              <View key={i}>
                {i > 0 && layover != null && (
                  <View style={[s.layover, tight && { backgroundColor: tint(C.red, 0.08) }]}>
                    <Text style={[s.layoverText, tight && { color: C.red }]}>
                      {negative ? '⚠ Overlap — check these times' : `${humanDur(layover)} in ${segs[i - 1].dest || 'transit'}${tight ? ' · tight connection' : ''}`}
                    </Text>
                  </View>
                )}
                <View style={s.seg}>
                  <Pressable onPress={() => setEditing(editing === i ? null : i)} style={s.segHead}>
                    <Text style={s.segTitle}>{MODE_ICON[sg.mode] ?? '•'} {sg.ref || sg.mode}</Text>
                    <Text style={s.segRoute}>{(sg.origin || '?')} → {(sg.dest || '?')}</Text>
                    <Text style={s.segTimes}>{fmtDT(sg.depart)}  →  {fmtDT(sg.arrive)}</Text>
                  </Pressable>

                  {editing === i && (
                    <View style={s.form}>
                      <View style={s.chips}>
                        {MODES.map(([v, l]) => (
                          <Pressable key={v} onPress={() => update(i, { mode: v })}
                            style={[s.chip, sg.mode === v && { backgroundColor: accent, borderColor: accent }]}>
                            <Text style={[s.chipText, sg.mode === v && { color: '#fff' }]}>{l}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <TextInput style={s.input} value={sg.ref ?? ''} onChangeText={t => update(i, { ref: t })}
                        placeholder="Flight no. / service (e.g. QR128)" placeholderTextColor="#9AA9BB" />
                      <View style={{ flexDirection: 'row' }}>
                        <TextInput style={[s.input, { flex: 1, marginRight: 8 }]} value={sg.origin ?? ''} onChangeText={t => update(i, { origin: t })}
                          placeholder="From" placeholderTextColor="#9AA9BB" />
                        <TextInput style={[s.input, { flex: 1 }]} value={sg.dest ?? ''} onChangeText={t => update(i, { dest: t })}
                          placeholder="To" placeholderTextColor="#9AA9BB" />
                      </View>
                      <View style={{ flexDirection: 'row', marginTop: 4 }}>
                        <Pressable style={[s.timeBtn, { marginRight: 8 }]} onPress={() => setPicking({ i, field: 'depart' })}>
                          <Text style={s.timeLabel}>DEPART</Text><Text style={s.timeVal}>{fmtDT(sg.depart)}</Text>
                        </Pressable>
                        <Pressable style={s.timeBtn} onPress={() => setPicking({ i, field: 'arrive' })}>
                          <Text style={s.timeLabel}>ARRIVE</Text><Text style={s.timeVal}>{fmtDT(sg.arrive)}</Text>
                        </Pressable>
                      </View>
                      <View style={s.rowBtns}>
                        <Pressable onPress={() => move(i, -1)} disabled={i === 0}><Text style={[s.small, { opacity: i === 0 ? 0.3 : 1 }]}>↑ Up</Text></Pressable>
                        <Pressable onPress={() => move(i, 1)} disabled={i === segs.length - 1}><Text style={[s.small, { opacity: i === segs.length - 1 ? 0.3 : 1 }]}>↓ Down</Text></Pressable>
                        <Pressable onPress={() => { setSegs(segs.filter((_, j) => j !== i)); setEditing(null); }}>
                          <Text style={[s.small, { color: C.red }]}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {picking && (
            <DateTimePicker
              value={(() => {
                const v = segs[picking.i][picking.field];
                const d = v ? new Date(v) : new Date(trip.start_date + 'T09:00:00');
                return isNaN(d.getTime()) ? new Date() : d;
              })()}
              mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (d) update(picking.i, { [picking.field]: d.toISOString() } as Partial<Segment>);
                if (Platform.OS !== 'ios') setPicking(null);
              }}
            />
          )}
          {picking && Platform.OS === 'ios' && (
            <Pressable onPress={() => setPicking(null)}><Text style={[s.small, { color: accent, textAlign: 'center', marginVertical: 8 }]}>Done picking</Text></Pressable>
          )}

          <Pressable onPress={add} style={s.addBtn}><Text style={[s.addText, { color: accent }]}>+ Add a leg</Text></Pressable>

          {totalMins != null && totalMins > 0 && (
            <Text style={s.total}>Total journey: {humanDur(totalMins)}, door to door</Text>
          )}

          <View style={{ height: 12 }} />
          <Btn label={saving ? 'Saving…' : 'Save journey'} color={accent} disabled={saving} onPress={save} />
          <Text style={s.note}>Times are what you enter — tap a flight number elsewhere to look it up. A live flight feed can fill these automatically later.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  close: { fontSize: 16, fontFamily: F.bold },
  title: { fontSize: 18, fontFamily: F.bold, color: C.text },
  empty: { color: C.sub, lineHeight: 21, marginBottom: 16 },
  seg: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  segHead: {},
  segTitle: { fontSize: 16, fontFamily: F.bold, color: C.text },
  segRoute: { color: C.text, marginTop: 2 },
  segTimes: { color: C.sub, marginTop: 2, fontSize: 13 },
  form: { marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: { borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginRight: 6, marginBottom: 6 },
  chipText: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  input: { backgroundColor: '#F1F4F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text, marginBottom: 8 },
  timeBtn: { flex: 1, backgroundColor: '#F1F4F9', borderRadius: 12, padding: 10, marginBottom: 8 },
  timeLabel: { color: C.sub, fontSize: 11, fontFamily: F.bold },
  timeVal: { color: C.text, fontFamily: F.bold, marginTop: 2 },
  rowBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  small: { fontFamily: F.bold, color: C.text },
  layover: { backgroundColor: '#EEF2F7', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, marginVertical: 8, alignSelf: 'center' },
  layoverText: { color: C.sub, fontSize: 13, fontFamily: F.bold },
  addBtn: { paddingVertical: 14, alignItems: 'center' },
  addText: { fontFamily: F.bold, fontSize: 15 },
  total: { color: C.text, fontFamily: F.bold, textAlign: 'center', marginTop: 4 },
  note: { color: '#9AA9BB', fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 17 },
});
