import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Trip } from '../api';
import TripArt from '../components/TripArt';
import { Card } from '../components/ui';
import { accentForTrip, C, F } from '../theme';

export default function Archive({ trips, onOpen, onBack }: {
  trips: Trip[]; onOpen: (t: Trip) => void; onBack: () => void;
}) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20 }}>
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 10 }}>
        <Text style={{ color: C.blue, fontSize: 16, fontFamily: F.bold }}>‹ Home</Text>
      </Pressable>
      <Text style={s.h1}>Past trips</Text>
      <Text style={s.sub}>Every debrief here made the next packing list smarter.</Text>
      {trips.map(t => {
        const accent = accentForTrip(t.country_code, t.title);
        return (
          <Pressable key={t.id} onPress={() => onOpen(t)}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <TripArt seed={t.place ?? t.title} accent={accent} height={64} />
              <View style={{ padding: 16, paddingTop: 10 }}>
                <Text style={s.title}>{t.title}</Text>
                <Text style={s.dates}>{t.start_date} → {t.end_date}{t.status === 'completed' ? '  ·  debriefed ✓' : ''}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 30, fontFamily: F.bold, color: C.text, letterSpacing: -0.6 },
  sub: { color: C.sub, marginTop: 4, marginBottom: 16 },
  title: { fontSize: 18, fontFamily: F.bold, color: C.text },
  dates: { color: C.sub, marginTop: 2 },
});
