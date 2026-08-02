import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Trip } from '../api';
import TripArt from '../components/TripArt';
import { Card } from '../components/ui';
import { accentForTrip, P, S, T, titleize } from '../theme';

export default function Archive({ trips, onOpen, onBack }: {
  trips: Trip[]; onOpen: (t: Trip) => void; onBack: () => void;
}) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={{ padding: S[5] }}>
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: S[3] }}>
        <Text style={[T.title, { color: P.brand }]}>‹ Home</Text>
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
                <Text style={s.title}>{titleize(t.title)}</Text>
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
  h1: { ...T.display, color: P.textPri },
  sub: { ...T.body, color: P.textSec, marginTop: S[1], marginBottom: S[4] },
  title: { ...T.h2, color: P.textPri },
  dates: { ...T.caption, color: P.textSec, marginTop: S[1] },
});
