import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { E, P, RA, S } from '../theme';

/**
 * Home identity bar: home icon · wordmark · profile icon. Icons only, no
 * labels — the two destinations are conventional enough that a label adds
 * nothing but width.
 *
 * Rendered on the Home route only. Inner screens keep their `‹ Trip name`
 * back links, because this bar cannot express "back one level" and the app is
 * genuinely hierarchical: Home → trip → section. Replacing a hierarchical
 * affordance with a flat one would lose a step you cannot get back.
 */
function HomeIcon({ on }: { on: boolean }) {
  const c = on ? P.brand : P.textMuted;
  return (
    <Svg width={24} height={24} viewBox="0 0 100 100">
      <Path d="M50 12 L90 46 h-10 V86 H60 V62 H40 V86 H20 V46 H10 Z" fill={c} />
    </Svg>
  );
}

function ProfileIcon({ on }: { on: boolean }) {
  const c = on ? P.brand : P.textMuted;
  return (
    <Svg width={24} height={24} viewBox="0 0 100 100">
      <Circle cx="50" cy="34" r="18" fill={c} />
      <Path d="M18 88 q0 -28 32 -28 q32 0 32 28 Z" fill={c} />
    </Svg>
  );
}

/** Measured from the artwork's alpha bounds — a wrong ratio stretches the mark. */
const WORDMARK_ASPECT = 4.0025;
const WORDMARK_H = 30;

export default function TopBar({ active, onHome, onProfile }: {
  active: 'home' | 'profile' | null;
  onHome: () => void; onProfile: () => void;
}) {
  return (
    <View style={s.wrap}>
      <Pressable onPress={onHome} hitSlop={12} style={s.side}>
        <HomeIcon on={active === 'home'} />
      </Pressable>
      {/* @ts-ignore — image module typing lives in the Expo project */}
      <Image
        source={require('../../assets/wordmark.png')}
        style={{ width: WORDMARK_H * WORDMARK_ASPECT, height: WORDMARK_H }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="VoyageOS"
      />
      <Pressable onPress={onProfile} hitSlop={12} style={[s.side, { alignItems: 'flex-end' }]}>
        <ProfileIcon on={active === 'profile'} />
      </Pressable>
    </View>
  );
}

/**
 * The + moved out of a fixed deck and floats over the content instead. The
 * deck reserved 92pt of height for one button and clipped the last trip card
 * mid-date; floating returns that space to the list.
 *
 * Bottom-right is the reachable corner for a right-handed thumb. It is a real
 * handedness trade — the old centred position was neutral — taken knowingly.
 */
export function FloatingAdd({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.fab, E.high, pressed && { opacity: 0.85 }]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="New trip"
    >
      <Svg width={26} height={26} viewBox="0 0 100 100">
        <Path d="M44 14h12v30h30v12H56v30H44V56H14V44h30z" fill={P.textOnDark} />
      </Svg>
    </Pressable>
  );
}

/** Clearance the Home list needs so its last card can scroll past the FAB. */
export const FAB_CLEARANCE = 54 + S[6];

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: P.card, borderBottomWidth: 1, borderBottomColor: P.hairline,
    paddingHorizontal: S[5], paddingVertical: S[3],
  },
  // fixed width on both sides so the wordmark sits optically centred rather
  // than centred on whatever the icons happen to measure
  side: { width: 44 },
  fab: {
    position: 'absolute', right: S[5], bottom: S[6],
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: P.brand, alignItems: 'center', justifyContent: 'center',
  },
});
