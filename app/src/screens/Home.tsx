import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { listTrips, Trip } from '../api';
import Wordmark from '../components/Wordmark';
import { Btn, Card } from '../components/ui';
import { accentFor, C, tint } from '../theme';

function daysUntil(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function Home({ onNewTrip, onOpenTrip, onKits, onDocuments, authed, onSignOut }: {
  onNewTrip: () => void; onOpenTrip: (t: Trip) => void;
  onKits: () => void; onDocuments: () => void;
  authed?: boolean; onSignOut?: () => void;
}) {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setError(''); setTrips(await listTrips()); }
    catch (e: any) { setError(e.message); setTrips([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (trips === null) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.blue} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true); await load(); setRefreshing(false);
        }} />
      }
    >
      <Wordmark />
      <Text style={s.greeting}>Where to next?</Text>

      {!!error && (
        <Card><Text style={{ color: C.red }}>{error}</Text></Card>
      )}

      {trips.length === 0 && !error && (
        <Card>
          <Text style={s.h2}>No trips yet</Text>
          <Text style={s.sub}>Create your first — the AI packs it with a reason on every item.</Text>
          <View style={{ height: 14 }} />
          <Btn label="+ New Trip" onPress={onNewTrip} />
        </Card>
      )}

      {trips.map(t => {
        const n = daysUntil(t.start_date);
        const past = n < 0;
        const when = n > 1 ? `in ${n} days` : n === 1 ? 'tomorrow' : n === 0 ? 'today' : 'past';
        const accent = accentFor(t.title);
        const done = t.status === 'completed';
        return (
          <Pressable key={t.id} onPress={() => onOpenTrip(t)}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <View style={[s.band, { backgroundColor: tint(accent, 0.16) }]}>
                <View style={[s.dot, { backgroundColor: accent }]} />
                <Text style={[s.place, { color: accent }]}>DESTINATION</Text>
                <View style={{ flex: 1 }} />
                <View style={s.pill}>
                  <Text style={[s.pillText, { color: accent }]}>{done ? 'debriefed ✓' : when}</Text>
                </View>
              </View>
              <View style={{ padding: 18, paddingTop: 12 }}>
                <Text style={s.tripTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={s.dates}>{t.start_date} → {t.end_date}</Text>
                <Text style={[s.open, { color: accent }]}>
                  {past && !done ? '60-second debrief ›' : 'Open trip ›'}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}

      {trips.length > 0 && (
        <>
          <View style={{ height: 4 }} />
          <Btn label="+ New Trip" onPress={onNewTrip} />
        </>
      )}

      <View style={s.links}>
        <Pressable onPress={onKits}><Text style={s.link}>My kits ›</Text></Pressable>
        <Text style={{ color: C.sub }}>{'    ·    '}</Text>
        <Pressable onPress={onDocuments}><Text style={s.link}>Documents ›</Text></Pressable>
      </View>
      <Text style={s.footer}>v1.0-dev{authed ? '' : ' · local mode'}</Text>
      {authed && onSignOut && (
        <Pressable onPress={onSignOut}>
          <Text style={[s.footer, { color: C.blue, fontWeight: '700' }]}>Sign out</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 34, fontWeight: '900', color: C.text, letterSpacing: -0.8, marginTop: 18, marginBottom: 18 },
  h2: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 4 },
  sub: { color: C.sub, lineHeight: 20 },
  band: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  place: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: '#fff' },
  pillText: { fontWeight: '800', fontSize: 12 },
  tripTitle: { fontSize: 21, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  dates: { color: C.sub, marginTop: 3, marginBottom: 8 },
  open: { fontWeight: '800' },
  links: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  link: { color: C.blue, fontWeight: '800' },
  footer: { color: '#9AA9BB', textAlign: 'center', marginTop: 14, fontSize: 12 },
});
