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
 * Navigation used to live entirely outside this bar, in floating orbs. The
 * tab bar took that job in Phase 3, and the bar took back one piece of it:
 * the profile avatar, which is chrome rather than a destination and so has no
 * business occupying one of three tab slots.
 */

/** Measured from the artwork's alpha bounds — a wrong ratio stretches the mark. */
const WORDMARK_ASPECT = 4.0025;
const WORDMARK_H = 28;

export default function TopBar({ onTierPress, onProfile }: {
  onTierPress?: () => void;
  /** Present on the tab screens, where profile is chrome rather than a
   *  destination in the bar. Absent leaves the bar exactly as it was. */
  onProfile?: () => void;
} = {}) {
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
      {/* The profile avatar replaces the floating profile orb. It sits in the
          bar rather than the tab bar because profile is chrome — account,
          billing, sign out — not one of the three things the app is FOR. */}
      {!!onProfile && (
        <Pressable onPress={onProfile} hitSlop={10} style={s.avatar}
          accessibilityRole="button" accessibilityLabel="Profile">
          <Svg width={19} height={19} viewBox="0 0 100 100">
            <Circle cx="50" cy="34" r="18" fill={P.brand} />
            <Path d="M18 88 q0 -28 32 -28 q32 0 32 28 Z" fill={P.brand} />
          </Svg>
        </Pressable>
      )}
    </View>
  );
}

// ── tab bar icons ───────────────────────────────────────────────────────────
//
// Drawn here rather than pulled from an icon set so they share the geometry
// and weight of the marks already in this file. A tab bar in a second icon
// language would read as a component borrowed from another app.

export function TabIcon({ kind, color, size = 24 }: {
  kind: 'trips' | 'kits' | 'docs' | 'journal'; color: string; size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {kind === 'trips' && (
        // A paper plane, matching the ✈ the trip screens already use for mode.
        <Path d="M92 8 L8 44 l32 12 l12 32 Z M40 56 L92 8" fill={color} />
      )}
      {kind === 'kits' && (
        // A bag: handle over a soft-cornered body.
        <>
          <Path d="M36 30 v-6 a14 14 0 0 1 28 0 v6" fill="none" stroke={color} strokeWidth={9} />
          <Path d="M18 34 h64 a6 6 0 0 1 6 6 v42 a6 6 0 0 1 -6 6 h-64 a6 6 0 0 1 -6 -6 v-42 a6 6 0 0 1 6 -6 Z" fill={color} />
        </>
      )}
      {kind === 'journal' && (
        // An open book: two leaves from a centre fold. Deliberately not a pen —
        // the hub is for re-reading, and a pen would promise writing it does
        // not offer.
        <Path d="M50 26 C38 16 22 16 10 20 v56 c12 -4 28 -4 40 6 c12 -10 28 -10 40 -6 V20 c-12 -4 -28 -4 -40 6 Z M50 26 v62"
              fill="none" stroke={color} strokeWidth={8} strokeLinejoin="round" />
      )}
      {kind === 'docs' && (
        // A sheet with its corner turned.
        <Path d="M22 8 h40 l20 20 v64 a4 4 0 0 1 -4 4 h-56 a4 4 0 0 1 -4 -4 v-80 a4 4 0 0 1 4 -4 Z M62 8 v22 h20" fill={color} />
      )}
    </Svg>
  );
}

// ── the floating + ──────────────────────────────────────────────────────────
//
// One control now, not three. It is brand-filled and larger than the orbs that
// used to flank it because it is the only primary action in the app.

const FAB = 54;

/**
 * The + moved out of a fixed deck and floats over the content instead. The
 * deck reserved 92pt of height for one button and clipped the last trip card
 * mid-date; floating returns that space to the list.
 *
 * Bottom-right is the reachable corner for a right-handed thumb. It is a real
 * handedness trade — the old centred position was neutral — taken knowingly,
 * and it costs less now that it is alone there rather than one of three.
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

// The Home and Profile orbs lived here. Both are gone: Home is the Trips tab
// and Profile is the avatar in the identity bar. They existed because the old
// bar rendered on two routes only, so from a trip screen the sole way to the
// root was walking up one `‹` at a time — a gap a tab bar does not have.

/**
 * Clearance a scrolling list needs so its last card clears the floating + AND
 * the tab bar beneath it. Derived rather than typed: this was a literal sized
 * for one button, and adding more silently buried the last card behind them.
 */
export const FAB_CLEARANCE = FAB + S[6] + S[4];

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    paddingHorizontal: S[5], paddingVertical: S[4] - 2,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17, marginLeft: S[3],
    backgroundColor: P.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: P.hairline,
  },
  fab: {
    position: 'absolute', right: S[5], bottom: S[6],
    width: FAB, height: FAB, borderRadius: FAB / 2,
    backgroundColor: P.brand, alignItems: 'center', justifyContent: 'center',
  },
});
