import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { tint } from '../theme';

/** Tile icon set — same minimal clip-art language as the landmarks. */
export default function TileIcon({ kind, accent, size = 30 }: {
  kind: string; accent: string; size?: number;
}) {
  const A = (t = 0.85) => tint(accent, t);
  const icons: Record<string, React.ReactNode> = {
    pack: (
      <>
        <Path d="M30 42 q0 -20 20 -20 q20 0 20 20 v40 q0 8 -8 8 H38 q-8 0 -8 -8 Z" fill={A()} />
        <Rect x="38" y="58" width="24" height="18" rx="5" fill={A(0.4)} />
        <Path d="M42 24 v-6 h6 v6 Z M52 24 v-6 h6 v6 Z" fill={A(0.6)} />
      </>
    ),
    know: (
      <>
        <Path d="M50 12 a38 38 0 1 0 0.01 0 Z M50 22 a28 28 0 1 1 -0.01 0 Z" fill={A()} fillRule="evenodd" />
        <Path d="M50 30 L60 56 L50 50 L40 56 Z" fill={A()} />
        <Path d="M50 70 L44 58 L50 61 L56 58 Z" fill={A(0.5)} />
      </>
    ),
    eat: (
      <>
        <Path d="M18 52 h64 a32 32 0 0 1 -64 0 Z" fill={A()} />
        <Rect x="26" y="46" width="48" height="6" rx="3" fill={A(0.4)} />
        <Path d="M34 40 L62 14 l4 4 L40 44 Z M48 42 L74 20 l4 4 L54 46 Z" fill={A(0.6)} />
      </>
    ),
    play: (
      <>
        <Path d="M18 34 h64 v14 a8 8 0 0 0 0 16 v14 H18 V64 a8 8 0 0 0 0 -16 Z" fill={A()} fillRule="evenodd" />
        <Path d="M50 44 l4 8 9 1 -6.5 6 1.5 9 -8 -4.5 -8 4.5 1.5 -9 -6.5 -6 9 -1 Z" fill={A(0.4)} />
      </>
    ),
    visit: (
      <>
        <Path d="M50 10 a26 26 0 0 1 26 26 c0 18 -26 52 -26 52 s-26 -34 -26 -52 a26 26 0 0 1 26 -26 Z" fill={A()} />
        <Circle cx="50" cy="36" r="10" fill={A(0.35)} />
      </>
    ),
    go: (
      <>
        <Path d="M20 58 l6 -18 q2 -6 9 -6 h30 q7 0 9 6 l6 18 v16 h-8 v-6 H28 v6 h-8 Z" fill={A()} />
        <Rect x="32" y="40" width="36" height="10" rx="3" fill={A(0.35)} />
        <Circle cx="33" cy="62" r="5" fill={A(0.5)} />
        <Circle cx="67" cy="62" r="5" fill={A(0.5)} />
      </>
    ),
    journal: (
      <>
        <Path d="M26 18 h40 q6 0 6 6 v52 q0 6 -6 6 H26 Z" fill={A()} />
        <Rect x="26" y="18" width="8" height="64" fill={A(0.6)} />
        <Path d="M44 34 h20 v4 H44 Z M44 46 h20 v4 H44 Z M44 58 h14 v4 H44 Z" fill={A(0.35)} />
      </>
    ),
    plan: (
      <>
        <Rect x="20" y="26" width="60" height="56" rx="8" fill={A()} />
        <Rect x="20" y="26" width="60" height="15" rx="8" fill={A(0.6)} />
        <Rect x="34" y="18" width="6" height="14" rx="3" fill={A(0.6)} />
        <Rect x="60" y="18" width="6" height="14" rx="3" fill={A(0.6)} />
        <Path d="M34 55 l7 7 15 -17" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    sos: (
      <>
        <Path d="M50 12 l30 10 v22 c0 22 -14 34 -30 42 C34 78 20 66 20 44 V22 Z" fill={A()} />
        <Path d="M45 30 h10 v12 h12 v10 H55 v12 H45 V52 H33 V42 h12 Z" fill={A(0.3)} />
      </>
    ),
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {icons[kind] ?? icons.visit}
    </Svg>
  );
}
