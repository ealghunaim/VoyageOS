import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, SHADOW, F } from '../theme';

function HomeIcon({ on }: { on: boolean }) {
  const c = on ? C.blue : '#9AA9BB';
  return (
    <Svg width={30} height={30} viewBox="0 0 100 100">
      <Path d="M50 12 L90 46 h-10 V86 H60 V62 H40 V86 H20 V46 H10 Z" fill={c} />
    </Svg>
  );
}
function ProfileIcon({ on }: { on: boolean }) {
  const c = on ? C.blue : '#9AA9BB';
  return (
    <Svg width={30} height={30} viewBox="0 0 100 100">
      <Circle cx="50" cy="34" r="18" fill={c} />
      <Path d="M18 88 q0 -28 32 -28 q32 0 32 28 Z" fill={c} />
    </Svg>
  );
}

export default function BottomBar({ active, onHome, onNew, onProfile }: {
  active: 'home' | 'profile' | null;
  onHome: () => void; onNew: () => void; onProfile: () => void;
}) {
  return (
    <View style={s.wrap}>
      <Pressable style={s.item} onPress={onHome} hitSlop={8}>
        <HomeIcon on={active === 'home'} />
        <Text style={[s.label, active === 'home' && s.onLabel]}>Home</Text>
      </Pressable>
      <Pressable style={[s.fab, SHADOW]} onPress={onNew}>
        <Text style={s.fabText}>+</Text>
      </Pressable>
      <Pressable style={s.item} onPress={onProfile} hitSlop={8}>
        <ProfileIcon on={active === 'profile'} />
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
  item: { alignItems: 'center', width: 90 },
  label: { fontSize: 12, fontFamily: F.bold, color: '#9AA9BB', marginTop: 2 },
  onLabel: { color: C.blue },
  fab: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: C.blue,
    alignItems: 'center', justifyContent: 'center', marginTop: -24,
  },
  fabText: { color: '#fff', fontSize: 32, fontFamily: F.bold, marginTop: -2 },
});
