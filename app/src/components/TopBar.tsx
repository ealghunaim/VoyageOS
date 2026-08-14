import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { E, P, S } from '../theme';
import { useSubscription } from '../subscription';
import TierBadge from './TierBadge';

/**
 * Identity banner: the wordmark, left, on nothing.
 *
 * It used to be a white plate carrying home · wordmark · profile, separated
 * from the page by both a colour change and a hairline. Two boundaries for one
 * edge is what made it read as chrome bolted on top, and a 30pt mark inside
 * 12pt of padding is what made it read as loud. The mark now sits directly on
 * the page — no background, no divider — so the first thing below it reads as
 * the beginning of the content rather than as something under a header.
 *
 * Navigation left the bar entirely. Home and Profile are floating controls
 * beside the +, which also gives them something the bar never could: reach
 * from any screen, not just the two this renders on.
 */

/** Measured from the artwork's alpha bounds — a wrong ratio stretches the mark. */
const WORDMARK_ASPECT = 4.0025;
const WORDMARK_H = 28;

export default function TopBar({ onTierPress }: { onTierPress?: () => void } = {}) {
  // Cached app-wide, so this does not fetch per screen. Null while the first
  // read is in flight — the badge simply is not there yet, which is quieter
  // than a placeholder that pops.
  const sub = useSubscription();
  return (
    <View style={s.wrap}>
      {/* @ts-ignore — image module typing lives in the Expo project */}
      <Image
        source={require('../../assets/wordmark.png')}
        style={{ width: WORDMARK_H * WORDMARK_ASPECT, height: WORDMARK_H }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="VoyageOS"
      />
      {/* Pushed right, so the wordmark keeps the left edge it was tuned for
          and the badge never crowds it on a narrow screen. */}
      <View style={{ flex: 1 }} />
      {!!sub && <TierBadge tier={sub.tier as any} onPress={onTierPress} />}
    </View>
  );
}

// ── floating controls ───────────────────────────────────────────────────────
//
// Laid out right to left: +, profile, home. The + is brand-filled and larger
// because it is the only primary action; the other two are white so they read
// as navigation sitting behind it rather than as three equal buttons.

const FAB = 54;
const ORB = 46;
const GAP = S[3];

/** A circular floating control. Secondary by default — see above. */
function Orb({ onPress, label, right, children }: {
  onPress: () => void; label: string; right: number; children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.orb, { right }, E.mid, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

/**
 * The + moved out of a fixed deck and floats over the content instead. The
 * deck reserved 92pt of height for one button and clipped the last trip card
 * mid-date; floating returns that space to the list.
 *
 * Bottom-right is the reachable corner for a right-handed thumb. It is a real
 * handedness trade — the old centred position was neutral — taken knowingly,
 * and it costs more now that three controls live there rather than one.
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

/**
 * Home from anywhere. The old bar could not express this — it rendered on two
 * routes, so from a trip screen the only way back to the root was walking up
 * the hierarchy one `‹` at a time. Hidden on Home itself, where it would be a
 * button that does nothing.
 */
export function FloatingHome({ onPress }: { onPress: () => void }) {
  return (
    <Orb onPress={onPress} label="Home" right={S[5] + FAB + GAP + ORB + GAP}>
      <Svg width={21} height={21} viewBox="0 0 100 100">
        <Path d="M50 12 L90 46 h-10 V86 H60 V62 H40 V86 H20 V46 H10 Z" fill={P.brand} />
      </Svg>
    </Orb>
  );
}

export function FloatingProfile({ onPress }: { onPress: () => void }) {
  return (
    <Orb onPress={onPress} label="Profile" right={S[5] + FAB + GAP}>
      <Svg width={21} height={21} viewBox="0 0 100 100">
        <Circle cx="50" cy="34" r="18" fill={P.brand} />
        <Path d="M18 88 q0 -28 32 -28 q32 0 32 28 Z" fill={P.brand} />
      </Svg>
    </Orb>
  );
}

/**
 * Clearance a scrolling list needs so its last card clears the floating
 * controls. Derived rather than typed: this was a literal sized for one
 * button, and adding two more silently buried the last card behind them.
 */
export const FAB_CLEARANCE = FAB + S[6] + S[4];

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    paddingHorizontal: S[5], paddingVertical: S[4] - 2,
  },
  orb: {
    position: 'absolute', bottom: S[6],
    width: ORB, height: ORB, borderRadius: ORB / 2,
    backgroundColor: P.card, alignItems: 'center', justifyContent: 'center',
  },
  fab: {
    position: 'absolute', right: S[5], bottom: S[6],
    width: FAB, height: FAB, borderRadius: FAB / 2,
    backgroundColor: P.brand, alignItems: 'center', justifyContent: 'center',
  },
});
