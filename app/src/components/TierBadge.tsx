// The tier mark that sits beside the wordmark.
//
// WHY IT LOOKS LIKE THIS
//
// The top bar is deliberately bare — wordmark, left, on nothing — because an
// earlier version read as chrome bolted onto the page. So the badge has to
// earn its place: one small pill, aligned to the wordmark's optical centre,
// carrying no border and no shadow. It is a mark of status, not a control
// panel.
//
// The palettes climb as METALS, not as brand colours: cool blue, then
// silver warming toward champagne, then gold. Read together they are a medal
// ladder, which is legible without a legend — nobody needs telling that gold
// outranks silver.
//
// Traveler is the hinge, and it is deliberately transitional: it starts
// silver-blue (a step from Explorer) and ends champagne (a step toward
// Voyager), so it belongs to both neighbours and neither. It was the house
// gradient at first, but "middle tier = the brand" is a story about us,
// while the metals are a story about the customer.
//
// Gold stays scarce. It is the only warm metal in the app, and that scarcity
// is what makes it mean anything.
//
// Free is not a filled pill. A permanent coloured badge announcing that you
// have not paid would be a nag in the corner of every screen; instead it is a
// quiet outline that says "Upgrade" and can be ignored. It is the only state
// that is an invitation rather than a label.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { F, P, S, T } from '../theme';

type Tier = 'free' | 'explorer' | 'traveler' | 'voyager';

/** [from, to, ink]. Ink is chosen per palette rather than computed — these
 *  are four hand-checked pairs, and a contrast formula would pick white on
 *  the gold, which looks washed out at 11pt. */
const PALETTE: Record<Exclude<Tier, 'free'>, [string, string, string]> = {
  // Cool and quiet — the first rung should feel like a beginning.
  explorer: ['#3465FF', '#00C2FF', '#FFFFFF'],
  // Silver-blue → champagne. Dark ink, as on the gold: both are light
  // surfaces, and white type on either goes soft at 10pt.
  traveler: ['#A3B6D4', '#D9C58E', '#2A2E3A'],
  // The only warm metal in the app. Ink rather than white: dark type on gold
  // reads as engraved, white type on gold reads as faded.
  voyager:  ['#B8860B', '#F5D57A', '#2A1F05'],
};

const H = 22;
const R = H / 2;

export default function TierBadge({ tier, onPress }: {
  tier: Tier; onPress?: () => void;
}) {
  if (tier === 'free') {
    return (
      <Pressable onPress={onPress} hitSlop={10}
        accessibilityRole="button" accessibilityLabel="Upgrade your plan"
        style={({ pressed }) => [s.free, pressed && { opacity: 0.6 }]}>
        <Text style={s.freeText}>UPGRADE</Text>
      </Pressable>
    );
  }

  const [from, to, ink] = PALETTE[tier];
  // Unique per tier: two <Defs> sharing an id in one tree collide, and the
  // preview renders all four at once.
  const gid = `tier-${tier}`;

  return (
    <Pressable onPress={onPress} hitSlop={10} disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${tier} plan`}
      style={({ pressed }) => [s.pill, pressed && onPress ? { opacity: 0.85 } : null]}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
            {/* A single diagonal sheen. Subtle enough to read as light on a
                surface rather than as a second colour. */}
            <LinearGradient id={`${gid}-sheen`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.28" />
              <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" rx={R} fill={`url(#${gid})`} />
          <Rect x="0" y="0" width="100%" height="100%" rx={R} fill={`url(#${gid}-sheen)`} />
        </Svg>
      </View>
      <Text style={[s.pillText, { color: ink }]}>{tier.toUpperCase()}</Text>
    </Pressable>
  );
}

/** All four states side by side, for judging them together rather than one at
 *  a time. Temporary — remove with the harness. */
export function TierBadgePreview() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
      {(['free', 'explorer', 'traveler', 'voyager'] as Tier[]).map(t => (
        <View key={t} style={{ marginRight: S[2], marginBottom: S[2] }}>
          <TierBadge tier={t} onPress={() => {}} />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  pill: {
    height: H,
    paddingHorizontal: 10,
    borderRadius: R,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pillText: { ...T.label, fontFamily: F.bold, fontSize: 10, letterSpacing: 1.1 },
  free: {
    height: H,
    paddingHorizontal: 10,
    borderRadius: R,
    borderWidth: 1,
    borderColor: P.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  freeText: { ...T.label, fontFamily: F.med, fontSize: 10, letterSpacing: 1.1,
              color: P.textMuted },
});
