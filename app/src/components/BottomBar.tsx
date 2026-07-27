import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, SHADOW } from '../theme';

export default function BottomBar({ active, onHome, onNew, onProfile }: {
  active: 'home' | 'profile' | null;
  onHome: () => void; onNew: () => void; onProfile: () => void;
}) {
  return (
    <View style={s.wrap}>
      <Pressable style={s.item} onPress={onHome} hitSlop={8}>
        <Text style={[s.icon, active === 'home' && s.on]}>⌂</Text>
        <Text style={[s.label, active === 'home' && s.onLabel]}>Home</Text>
      </Pressable>
      <Pressable style={[s.fab, SHADOW]} onPress={onNew}>
        <Text style={s.fabText}>+</Text>
      </Pressable>
      <Pressable style={s.item} onPress={onProfile} hitSlop={8}>
        <Text style={[s.icon, active === 'profile' && s.on]}>◔</Text>
        <Text style={[s.label, active === 'profile' && s.onLabel]}>Profile</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 8, paddingBottom: 6, paddingHorizontal: 24,
  },
  item: { alignItems: 'center', width: 84 },
  icon: { fontSize: 22, color: '#9AA9BB' },
  label: { fontSize: 11, fontWeight: '800', color: '#9AA9BB', marginTop: 1 },
  on: { color: C.blue },
  onLabel: { color: C.blue },
  fab: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: C.blue,
    alignItems: 'center', justifyContent: 'center', marginTop: -22,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: -2 },
});
