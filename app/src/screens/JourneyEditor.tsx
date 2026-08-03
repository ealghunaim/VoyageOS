import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  Alert, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { lookupFlight, patchTrip, PlaceHit, RouteFlight, searchPlaces, searchRoute, Segment, Trip } from '../api';
import { airlineFromRef } from '../airlines';
import { Airport, searchAirports } from '../airports';
import { Btn } from '../components/ui';
import { F, P, RA, S, T, tint } from '../theme';

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

export default function JourneyEditor({ trip, accent, onClose, onSaved, onSaveLocal }: {
  trip: Trip; accent: string; onClose: () => void;
  onSaved?: (t: Trip) => void; onSaveLocal?: (segs: Segment[]) => void;
}) {
  const [segs, setSegs] = useState<Segment[]>(trip.segments ?? []);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<{ i: number; field: 'depart' | 'arrive' } | null>(null);
  const [lookingUp, setLookingUp] = useState<number | null>(null);
  // One suggestion list at a time — keyed by segment index and which end of the
  // leg is being typed, so two inputs on the same row cannot both be open.
  const [acFor, setAcFor] = useState<{ i: number; field: 'origin' | 'dest' } | null>(null);
  const [acHits, setAcHits] = useState<PlaceHit[]>([]);
  const [airHits, setAirHits] = useState<Airport[]>([]);
  // Route browsing is metered, so it is state a button sets — never an effect.
  const [routeFor, setRouteFor] = useState<number | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeHits, setRouteHits] = useState<RouteFlight[]>([]);
  const [routeNote, setRouteNote] = useState('');

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
      if (onSaveLocal) { onSaveLocal(clean); onClose(); return; }
      const t = await patchTrip(trip.id, { segments: clean });
      onSaved?.({ ...trip, ...t, segments: clean });
      onClose();
    } catch (e: any) { Alert.alert('Journey', e.message); }
    finally { setSaving(false); }
  }

  async function doLookup(i: number) {
    const sg = segs[i];
    const ref = (sg.ref ?? '').trim();
    if (!ref) return;
    const date = sg.depart ? sg.depart.slice(0, 10) : trip.start_date;
    setLookingUp(i);
    try {
      const f = await lookupFlight(ref, date);
      update(i, {
        origin: f.origin ?? sg.origin, dest: f.dest ?? sg.dest,
        depart: f.depart ?? sg.depart, arrive: f.arrive ?? sg.arrive,
      });
    } catch (e: any) { Alert.alert('Flight lookup', e.message || 'Could not find that flight.'); }
    finally { setLookingUp(null); }
  }

  // Same shape as the wizard's destination field: 250ms debounce, deduped,
  // fails soft to an empty list so a lookup error never blocks typing.
  useEffect(() => {
    if (!acFor) { setAcHits([]); setAirHits([]); return; }
    const q = (segs[acFor.i]?.[acFor.field] ?? '').trim();
    if (q.length < 2) { setAcHits([]); setAirHits([]); return; }
    // Airports resolve locally and instantly, so they answer first; the city
    // geocoder only fills in behind them. A leg is written BKK -> SIN, and the
    // geocoder knows neither code.
    setAirHits(searchAirports(q, 5));
    const t = setTimeout(() => {
      searchPlaces(q).then(res => {
        const seen = new Set<string>();
        setAcHits(res.filter(h => {
          const k = `${h.name}|${h.admin ?? ''}|${h.country_code}`;
          if (seen.has(k)) return false;
          seen.add(k); return true;
        }).slice(0, 5));
      }).catch(() => setAcHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [acFor, segs]);

  /**
   * Deliberate, one tap, one search. AeroDataBox bills by API unit and a whole
   * day of one airport's departures costs four of them, so this must never be
   * driven by typing. The server caches by (route, date), so re-opening a leg
   * you already searched spends nothing.
   */
  async function browseRoute(i: number) {
    const sg = segs[i];
    const o = (sg.origin ?? '').trim().toUpperCase();
    const d = (sg.dest ?? '').trim().toUpperCase();
    if (o.length !== 3 || d.length !== 3) {
      Alert.alert('Search flights', 'Pick both airports first — the search needs codes like BKK and SIN.');
      return;
    }
    const date = sg.depart ? sg.depart.slice(0, 10) : trip.start_date;
    setRouteBusy(true); setRouteFor(i); setRouteHits([]); setRouteNote('');
    try {
      const r = await searchRoute(o, d, date);
      setRouteHits(r.flights);
      setRouteNote(
        r.flights.length === 0
          ? `No ${o} → ${d} flights listed for ${date}.`
          : r.cached ? 'From cache — no quota used.' : `${r.flights.length} flights · ${r.units_spent} API units`,
      );
    } catch (e: any) {
      setRouteNote('');
      Alert.alert('Search flights', e.message || 'Could not search that route.');
    } finally { setRouteBusy(false); }
  }

  const totalMins = segs.length >= 1 ? gapMins(segs[0].depart, segs[segs.length - 1].arrive) : null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: P.pageBg }}>
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
                  <View style={[
                    s.layover,
                    // A tight connection is a caution; an overlap is an error.
                    // They shared one red, so "90 minutes, mind the gate" looked
                    // identical to "these times cannot both be true".
                    tight    && { backgroundColor: tint(P.warningInk, 0.10) },
                    negative && { backgroundColor: tint(P.danger, 0.10) },
                  ]}>
                    <Text style={[
                      s.layoverText,
                      tight    && { color: P.warningInk },
                      negative && { color: P.danger },
                    ]}>
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
                            <Text style={[s.chipText, sg.mode === v && { color: P.textOnDark }]}>{l}</Text>
                          </Pressable>
                        ))}
                      </View>
                      {sg.mode !== 'drive' && (
                        <TextInput style={s.input} value={sg.ref ?? ''} onChangeText={t => update(i, { ref: t })}
                          placeholder={sg.mode === 'flight' ? 'Flight no. (e.g. QR128)' : sg.mode === 'train' ? 'Train service / number' : 'Ferry name / service'}
                          placeholderTextColor={P.textMuted} />
                      )}
                      {sg.mode === 'flight' && (() => {
                        const al = airlineFromRef(sg.ref);
                        if (!al) return null;
                        return (
                          <View style={{ marginBottom: 8 }}>
                            <Text style={s.airlineHint}>✈ {al.name} · hub {al.iata} ({al.city})</Text>
                            <View style={{ flexDirection: 'row' }}>
                              <Pressable onPress={() => update(i, { origin: al.iata })} style={[s.chip, { marginRight: 6 }]}>
                                <Text style={s.chipText}>From {al.iata}</Text>
                              </Pressable>
                              <Pressable onPress={() => update(i, { dest: al.iata })} style={s.chip}>
                                <Text style={s.chipText}>To {al.iata}</Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })()}
                      {sg.mode === 'flight' && !!(sg.ref ?? '').trim() && (
                        <Pressable disabled={lookingUp === i} onPress={() => doLookup(i)} style={s.lookup}>
                          <Text style={[s.lookupText, { color: accent }]}>{lookingUp === i ? 'Looking up…' : '\u21bb Look up flight times'}</Text>
                        </Pressable>
                      )}
                      <View style={{ flexDirection: 'row' }}>
                        <TextInput
                          style={[s.input, { flex: 1, marginRight: S[2] }]}
                          value={sg.origin ?? ''}
                          onChangeText={t => { update(i, { origin: t }); setAcFor({ i, field: 'origin' }); }}
                          onFocus={() => setAcFor({ i, field: 'origin' })}
                          placeholder="From" placeholderTextColor={P.textMuted} />
                        <TextInput
                          style={[s.input, { flex: 1 }]}
                          value={sg.dest ?? ''}
                          onChangeText={t => { update(i, { dest: t }); setAcFor({ i, field: 'dest' }); }}
                          onFocus={() => setAcFor({ i, field: 'dest' })}
                          placeholder="To" placeholderTextColor={P.textMuted} />
                      </View>
                      {acFor?.i === i && (airHits.length > 0 || acHits.length > 0) && (
                        <View style={s.acBox}>
                          {airHits.map((a, k) => (
                            <Pressable
                              key={`ap-${a.iata}-${k}`}
                              style={s.acHit}
                              onPress={() => {
                                // The code is what the flight feed speaks, so it
                                // is what gets stored; the city is only the label.
                                update(i, { [acFor.field]: a.iata } as Partial<Segment>);
                                setAcFor(null); setAcHits([]); setAirHits([]);
                              }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={s.acCode}>{a.iata}</Text>
                                <Text style={s.acName}>{a.city || a.name}</Text>
                              </View>
                              <Text style={s.acSub}>{a.name} · {a.cc}</Text>
                            </Pressable>
                          ))}
                          {acHits.map((h, k) => (
                            <Pressable
                              key={`${h.name}-${h.lat}-${h.lng}-${k}`}
                              style={s.acHit}
                              onPress={() => {
                                update(i, { [acFor.field]: h.name } as Partial<Segment>);
                                setAcFor(null); setAcHits([]); setAirHits([]);
                              }}>
                              <Text style={s.acName}>{h.name}</Text>
                              <Text style={s.acSub}>
                                {[h.admin, h.country_code].filter(Boolean).join(' · ')}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      {sg.mode === 'flight' && (
                        <>
                          <Pressable disabled={routeBusy} onPress={() => browseRoute(i)} style={s.lookup}>
                            <Text style={[s.lookupText, { color: accent }]}>
                              {routeBusy && routeFor === i ? 'Searching…' : 'Search flights on this route'}
                            </Text>
                          </Pressable>
                          {routeFor === i && !!routeNote && <Text style={s.routeNote}>{routeNote}</Text>}
                          {routeFor === i && routeHits.map((f, k) => (
                            <Pressable
                              key={`rf-${f.number}-${k}`}
                              style={s.routeRow}
                              onPress={() => {
                                // Picking a flight fills the leg exactly as the
                                // number lookup would, with no further spend.
                                update(i, { ref: f.number, depart: f.depart ?? sg.depart,
                                            arrive: f.arrive ?? sg.arrive });
                                setRouteFor(null); setRouteHits([]); setRouteNote('');
                              }}>
                              <View style={{ flex: 1 }}>
                                <Text style={s.routeNum}>{f.number}{f.airline ? ` · ${f.airline}` : ''}</Text>
                                <Text style={s.routeTime}>
                                  {(f.depart ?? '').slice(11)} → {(f.arrive ?? '').slice(11)}
                                </Text>
                              </View>
                              <Text style={[s.routePick, { color: accent }]}>Use</Text>
                            </Pressable>
                          ))}
                        </>
                      )}
                      <View style={{ flexDirection: 'row', marginTop: S[1] }}>
                        <Pressable style={[s.timeBtn, { marginRight: S[2] }]} onPress={() => setPicking({ i, field: 'depart' })}>
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
                          <Text style={[s.small, { color: P.textSec }]}>Delete</Text>
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
      </SafeAreaView>
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
  top: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S[4], paddingTop: S[3] + 2, paddingBottom: S[2],
  },
  close: { ...T.title, fontFamily: F.bold },
  title: { ...T.h2, color: P.textPri },
  empty: { ...T.body, color: P.textSec, marginBottom: S[4] },
  seg: {
    backgroundColor: P.card, borderRadius: RA.lg, padding: S[3] + 2,
    borderWidth: 1, borderColor: P.hairline,
  },
  segHead: {},
  segTitle: { ...T.title, fontFamily: F.bold, color: P.textPri },
  segRoute: { ...T.body, color: P.textPri, marginTop: 2 },
  segTimes: { ...T.caption, color: P.textSec, marginTop: 2 },
  form: { marginTop: S[3], borderTopWidth: 1, borderTopColor: P.hairline, paddingTop: S[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: S[2] },
  chip: {
    borderWidth: 1.5, borderColor: P.hairline, backgroundColor: P.card,
    paddingHorizontal: S[3], paddingVertical: 7, borderRadius: RA.pill,
    marginRight: S[1] + 2, marginBottom: S[1] + 2,
  },
  chipText: { ...T.caption, fontFamily: F.bold, color: P.textPri },
  input: {
    ...T.body, backgroundColor: P.sunken, borderRadius: RA.md,
    paddingHorizontal: S[3] + 2, paddingVertical: S[2] + 2, color: P.textPri, marginBottom: S[2],
  },
  timeBtn: {
    flex: 1, backgroundColor: P.sunken, borderRadius: RA.md,
    padding: S[2] + 2, marginBottom: S[2],
  },
  timeLabel: { ...T.label, color: P.textSec },
  timeVal: { ...T.body, fontFamily: F.bold, color: P.textPri, marginTop: 2 },
  rowBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S[1] },
  small: { ...T.body, fontFamily: F.bold, color: P.textPri },
  acBox: {
    backgroundColor: P.card, borderRadius: RA.md, borderWidth: 1,
    borderColor: P.hairline, marginBottom: S[2], overflow: 'hidden',
  },
  acHit: { paddingVertical: S[2] + 1, paddingHorizontal: S[3] },
  routeNote: { ...T.caption, color: P.textMuted, marginBottom: S[2] },
  routeRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: P.sunken,
    borderRadius: RA.md, paddingVertical: S[2] + 1, paddingHorizontal: S[3], marginBottom: S[1] + 2,
  },
  routeNum: { ...T.body, fontFamily: F.bold, color: P.textPri },
  routeTime: { ...T.caption, color: P.textSec },
  routePick: { ...T.caption, fontFamily: F.bold },
  acCode: { ...T.body, fontFamily: F.bold, color: P.textPri, width: 42 },
  acName: { ...T.body, color: P.textPri },
  acSub: { ...T.caption, color: P.textSec },
  airlineHint: { ...T.body, color: P.textSec, marginBottom: S[1] + 2 },
  // neutral by default; the caution and error grounds are applied inline
  layover: {
    backgroundColor: P.sunken, borderRadius: RA.sm, paddingVertical: S[1] + 2,
    paddingHorizontal: S[3], marginVertical: S[2], alignSelf: 'center',
  },
  layoverText: { ...T.caption, fontFamily: F.bold, color: P.textSec },
  lookup: {
    backgroundColor: P.sunken, borderRadius: RA.md, paddingVertical: S[2] + 1,
    alignItems: 'center', marginBottom: S[2],
  },
  lookupText: { ...T.caption, fontFamily: F.bold },
  addBtn: { paddingVertical: S[3] + 2, alignItems: 'center' },
  addText: { ...T.body, fontFamily: F.bold },
  total: { ...T.body, fontFamily: F.bold, color: P.textPri, textAlign: 'center', marginTop: S[1] },
  note: { ...T.caption, color: P.textMuted, textAlign: 'center', marginTop: S[3], lineHeight: 17 },
});
