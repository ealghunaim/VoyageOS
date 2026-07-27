import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { markFor } from './landmarks';
import { tint } from '../theme';

/** Generative destination art: a minimal landscape seeded by the place name.
 * Same destination → same scene, forever. Real photography can layer in later. */
export default function TripArt({ seed, accent, height = 72 }: {
  seed: string; accent: string; height?: number;
}) {
  let h = 0;
  const s = (seed || 'voyage').toLowerCase();
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  const r = (n: number) => ((h >> (n * 3)) % 100) / 100;

  const W = 400, H = 120;
  const sunX = 60 + r(1) * 280;
  const sunY = 18 + r(2) * 30;
  const m1 = 40 + r(3) * 35;   // back ridge height
  const m2 = 55 + r(4) * 40;   // front ridge height
  const waveY = H - 18 - r(5) * 10;
  const mark = markFor(seed);

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect x="0" y="0" width={W} height={H} fill={tint(accent, 0.14)} />
        <Circle cx={sunX} cy={sunY} r={16 + r(6) * 10} fill={tint(accent, 0.55)} />
        <Path d={`M0 ${H} L0 ${H - m1} L${90 + r(7) * 60} ${H - m1 - 22} L${210 + r(1) * 60} ${H - m1 + 14} L${W} ${H - m1 - 6} L${W} ${H} Z`}
          fill={tint(accent, 0.30)} />
        <Path d={`M0 ${H} L0 ${H - m2 + 20} L${120 + r(2) * 80} ${H - m2} L${260 + r(3) * 60} ${H - m2 + 26} L${W} ${H - m2 + 8} L${W} ${H} Z`}
          fill={tint(accent, 0.48)} />
        <Path d={`M0 ${waveY} Q ${W * 0.25} ${waveY - 8}, ${W * 0.5} ${waveY} T ${W} ${waveY} L${W} ${H} L0 ${H} Z`}
          fill={tint(accent, 0.75)} />
        {mark && (
          <G transform={`translate(${W - 168}, ${H - 104}) scale(0.98)`}>
            {mark.paths.map((p, i) => (
              <Path key={i} d={p.d} fill={tint(accent, p.t ?? 0.85)} fillRule="evenodd" />
            ))}
            {(mark.circles ?? []).map((c, i) => (
              <Circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={tint(accent, c.t ?? 0.85)} />
            ))}
          </G>
        )}
      </Svg>
    </View>
  );
}
