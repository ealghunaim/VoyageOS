import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { listTrips, Trip } from '../api';
import { Btn, Card } from '../components/ui';
import { C } from '../theme';

function daysUntil(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function Home({ onNewTrip, onOpenTrip }: {
  onNewTrip: () => void; onOpenTrip: (t: Trip) => void;
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
      contentContainerStyle={{ padding: 16, paddingTop: 28 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true); await load(); setRefreshing(false);
        }} />
      }
    >
      <Text style={s.brand}>VoyageOS</Text>
      <Text style={s.tag}>It knows your trip better than you do.</Text>

      {!!error && (
        <Card><Text style={{ color: C.red }}>{error}</Text></Card>
      )}

      {trips.length === 0 && !error && (
        <Card>
          <Text style={s.h2}>No trips yet</Text>
          <Text style={s.sub}>Create your first trip — the AI packs it with a reason on every item.</Text>
          <View style={{ height: 12 }} />
          <Btn label="+ New Trip" onPress={onNewTrip} />
        </Card>
      )}

      {trips.map(t => {
        const n = daysUntil(t.start_date);
        const when = n > 1 ? `in ${n} days` : n === 1 ? 'tomorrow' : n === 0 ? 'today' : 'past';
        return (
          <Pressable key={t.id} onPress={() => onOpenTrip(t)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.h2} numberOfLines={1}>{t.title}</Text>
                <Text style={s.badge}>{when}</Text>
              </View>
              <Text style={s.sub}>{t.start_date} → {t.end_date}</Text>
              <Text style={s.link}>Open packing list ›</Text>
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
      <Text style={s.footer}>v0.5 · dev build</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 30, fontWeight: '900', color: C.blue, marginBottom: 2 },
  tag: { color: C.sub, marginBottom: 18 },
  h2: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 4, flexShrink: 1 },
  sub: { color: C.sub, marginBottom: 6 },
  badge: {
    color: C.blue, backgroundColor: C.blueSoft, fontWeight: '700', fontSize: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden',
  },
  link: { color: C.blue, fontWeight: '700' },
  footer: { color: '#9aa7b8', textAlign: 'center', marginVertical: 16, fontSize: 12 },
});
