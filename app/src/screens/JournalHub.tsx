// Everything you have written, across every trip.
//
// A READ VIEW, deliberately. Writing needs a trip — entry_date is clamped to
// the trip's range, which is meaningless without one — so a compose box here
// would have to ask "which trip?" first, which is a worse flow than picking the
// trip. Tapping an entry jumps to that trip's Journal, which does accept
// writing. A travel journal is mostly for re-reading anyway.
//
// GROUPED BY TRIP, not a flat chronological river. A river reads as a diary of
// your life rather than a record of your travels, and it interleaves two trips
// taken in the same month into nonsense.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';

import { HubNote, listAllNotes, Trip } from '../api';
import { Card } from '../components/ui';
import { flagOf } from '../countries';
import { dayLabel } from '../tripStatus';
import { accentForTrip, F, P, S, T, titleize } from '../theme';
import { FAB_CLEARANCE } from '../components/TopBar';

type Group = { tripId: string; title: string; country: string | null; locked: boolean; notes: HubNote[] };

export default function JournalHub({ onOpenTrip }: { onOpenTrip: (tripId: string) => void }) {
  const [notes, setNotes] = useState<HubNote[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setError(''); setNotes(await listAllNotes()); }
    catch (e: any) { setError(e.message); setNotes([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (notes === null) {
    return <View style={s.center}><ActivityIndicator size="large" color={P.brand} /></View>;
  }

  // The server returns a flat list already ordered by entry_date. Grouping
  // preserves that order, so trips appear in order of their most recent entry
  // without a second sort — first appearance wins.
  const groups: Group[] = [];
  for (const n of notes) {
    const t = n.trips;
    if (!t) continue;                      // a note whose trip is gone
    let g = groups.find(x => x.tripId === t.id);
    if (!g) {
      g = { tripId: t.id, title: t.title, country: t.country_code,
            locked: !!t.locked_at, notes: [] };
      groups.push(g);
    }
    g.notes.push(n);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: P.pageBg }}
      contentContainerStyle={{ padding: S[5], paddingTop: S[2], paddingBottom: FAB_CLEARANCE }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
        setRefreshing(true); await load(); setRefreshing(false);
      }} />}
    >
      <Text style={s.greeting}>Journal</Text>

      {!!error && <Card><Text style={s.error}>{error}</Text></Card>}

      {groups.length === 0 && !error && (
        <Card>
          <Text style={s.h2}>Nothing written yet</Text>
          <Text style={s.sub}>
            Entries you write on a trip collect here — including the ones you
            write after you get home.
          </Text>
        </Card>
      )}

      {groups.map(g => {
        const accent = accentForTrip(g.country, g.title);
        return (
          <View key={g.tripId}>
            <Pressable onPress={() => onOpenTrip(g.tripId)} style={s.head}>
              <Text style={[s.tripName, { color: accent }]} numberOfLines={1}>
                {g.country ? `${flagOf(g.country)}  ` : ''}{titleize(g.title)}
                {/* Says the TRIP is closed, not that the entry is frozen —
                    journal writes are RECORD scope and stay open by design. */}
                {g.locked ? '  🔒' : ''}
              </Text>
              <Text style={[s.open, { color: accent }]}>{g.notes.length} ›</Text>
            </Pressable>
            {g.notes.map(n => (
              <Pressable key={n.id} onPress={() => onOpenTrip(g.tripId)}>
                <Card>
                  <Text style={s.when}>{dayLabel(n.entry_date || '')}</Text>
                  <Text style={s.body} numberOfLines={4}>{n.body}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: P.pageBg, alignItems: 'center', justifyContent: 'center' },
  greeting: { ...T.display, color: P.textPri, marginBottom: S[4] },
  h2: { ...T.h2, color: P.textPri, marginBottom: S[1] },
  sub: { ...T.body, color: P.textSec, lineHeight: 20 },
  error: { ...T.body, color: P.danger },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: S[4], marginBottom: S[2] },
  tripName: { ...T.label, letterSpacing: 0.6, flex: 1 },
  open: { ...T.caption, fontFamily: F.bold },
  when: { ...T.caption, color: P.textMuted, marginBottom: S[1] },
  body: { ...T.body, color: P.textPri, lineHeight: 21 },
});
