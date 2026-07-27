import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getTripWeather, Trip, WxDay } from '../api';
import TileIcon from '../components/icons';
import TripArt from '../components/TripArt';
import { Card } from '../components/ui';
import { accentFor, C, tint } from '../theme';

const TILES: { key: string; label: string; sub: string }[] = [
  { key: 'pack', label: 'Pack', sub: 'Your list, with reasons' },
  { key: 'know', label: 'Know', sub: 'Entry, plugs, customs' },
  { key: 'eat', label: 'Eat', sub: 'Dishes worth the trip' },
  { key: 'play', label: 'Play', sub: 'Experiences' },
  { key: 'visit', label: 'Visit', sub: 'Sights & districts' },
  { key: 'go', label: 'Go', sub: 'Airport & around' },
  { key: 'journal', label: 'Journal', sub: 'Your travel log' },
  { key: 'sos', label: 'SOS', sub: 'Emergency & care' },
];

export default function TripHub({ trip, onBack, onPack, onGuide, onJournal, onSOS, onDebrief }: {
  trip: Trip; onBack: () => void; onPack: () => void;
  onGuide: (section: string) => void; onJournal: () => void; onSOS: () => void; onDebrief: () => void;
}) {
  const accent = accentFor(trip.title);
  const [wx, setWx] = useState<WxDay[]>([]);
  const past = new Date(trip.start_date + 'T00:00:00').getTime() < Date.now();

  const loadWx = useCallback(async () => {
    try { setWx((await getTripWeather(trip.id)).days); } catch {}
  }, [trip.id]);
  useEffect(() => { loadWx(); }, [loadWx]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: 16 }}>
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 10 }}>
        <Text style={{ color: C.blue, fontSize: 16, fontWeight: '800' }}>‹ Trips</Text>
      </Pressable>

      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <TripArt seed={trip.title} accent={accent} height={168} />
        <View style={{ padding: 18, paddingTop: 12 }}>
          <Text style={s.title}>{trip.title}</Text>
          <Text style={s.dates}>{trip.start_date} → {trip.end_date}</Text>
          {wx.length > 0 && wx.every(d => d.provider === 'climatology') && (
            <Text style={{ color: C.sub, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginTop: 8 }}>
              TYPICAL {new Date(trip.start_date).toLocaleString('en', { month: 'long' }).toUpperCase()} · LAST YEAR
            </Text>
          )}
          {wx.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <Text style={s.wx}>
                {wx.map(d =>
                  `${d.date.slice(5)} ${d.temp_max != null ? Math.round(d.temp_max) : '–'}°` +
                  `${(d.precip_prob ?? 0) >= 60 ? '☔' : (d.uv ?? 0) >= 8 ? '☀' : ''}`
                ).join('  ·  ')}
              </Text>
            </ScrollView>
          )}
        </View>
      </Card>

      <View style={s.grid}>
        {TILES.map(t => (
          <Pressable
            key={t.key}
            style={[s.tile, { backgroundColor: '#fff' }]}
            onPress={() =>
              t.key === 'pack' ? onPack()
              : t.key === 'journal' ? onJournal()
              : t.key === 'sos' ? onSOS()
              : onGuide(t.key)}
          >
            <View style={[s.iconWrap, { backgroundColor: tint(accent, 0.14) }]}>
              <TileIcon kind={t.key} accent={accent} size={30} />
            </View>
            <Text style={s.tileLabel}>{t.label}</Text>
            <Text style={s.tileSub}>{t.sub}</Text>
          </Pressable>
        ))}
      </View>

      {past && trip.status !== 'completed' && (
        <Pressable onPress={onDebrief}>
          <Text style={[s.debrief, { color: accent }]}>Close out this trip — 60-second debrief ›</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  dates: { color: C.sub, marginTop: 3 },
  wx: { color: C.text, fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48.5%', borderRadius: 22, padding: 16, marginBottom: 12, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#0B1526', shadowOpacity: 0.05, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', marginBottom: 10,
  },
  tileLabel: { fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'center' },
  tileSub: { color: C.sub, fontSize: 12, marginTop: 2, textAlign: 'center' },
  debrief: { fontWeight: '800', textAlign: 'center', marginTop: 8 },
});
