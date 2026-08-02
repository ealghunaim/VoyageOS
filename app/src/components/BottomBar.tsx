import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { P, S, T, E } from '../theme';

function HomeIcon({ on, accent }: { on: boolean; accent: string }) {
  const c = on ? accent : P.textMuted;
  return (
    <Svg width={26} height={26} viewBox="0 0 100 100">
      <Path d="M50 12 L90 46 h-10 V86 H60 V62 H40 V86 H20 V46 H10 Z" fill={c} />
    </Svg>
  );
}
function ProfileIcon({ on, accent }: { on: boolean; accent: string }) {
  const c = on ? accent : P.textMuted;
  return (
    <Svg width={26} height={26} viewBox="0 0 100 100">
      <Circle cx="50" cy="34" r="18" fill={c} />
      <Path d="M18 88 q0 -28 32 -28 q32 0 32 28 Z" fill={c} />
    </Svg>
  );
}

/**
 * `accent` lets the bar carry the colour of whatever you're looking at, so a
 * trip's colour runs to the bottom edge of the screen instead of stopping at
 * the content. Falls back to brand blue away from a trip.
 */
export default function BottomBar({ active, accent, onHome, onNew, onProfile }: {
  active: 'home' | 'profile' | null; accent?: string;
  onHome: () => void; onNew: () => void; onProfile: () => void;
}) {
  const a = accent ?? P.brand;
  return (
    <View style={s.wrap}>
      <Pressable style={s.item} onPress={onHome} hitSlop={8}>
        <HomeIcon on={active === 'home'} accent={a} />
        <Text style={[s.label, active === 'home' && { color: a }]}>Home</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [s.fab, E.mid, { backgroundColor: a },
        pressed && { opacity: 0.85 }]} onPress={onNew}>
        <Text style={s.fabText}>+</Text>
      </Pressable>
      <Pressable style={s.item} onPress={onProfile} hitSlop={8}>
        <ProfileIcon on={active === 'profile'} accent={a} />
        <Text style={[s.label, active === 'profile' && { color: a }]}>Profile</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: P.card, borderTopWidth: 1, borderTopColor: P.hairline,
    paddingTop: S[2], paddingBottom: S[2], paddingHorizontal: S[6],
  },
  item: { alignItems: 'center', width: 90 },
  label: { ...T.label, color: P.textMuted, marginTop: S[1] },
  fab: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center', marginTop: -22,
  },
  fabText: { color: P.textOnDark, fontSize: 30, fontFamily: T.display.fontFamily, marginTop: -2 },
});
