import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { FLAG_SPEC, FlagRibbons } from './FlagArt';
import { accentForTrip, onColor, P, S, T } from '../theme';

/**
 * Multi-city hero. Three mocks to choose between — the problem is that a trip
 * across three countries has no single ground, and the earlier equal-width
 * banded version read as a chart rather than a card.
 *
 *   rail   — the first country owns the ground; the route is a thin rail below
 *   slices — skewed slices, one per country, so the eye travels left to right
 *   stamps — overlapping passport-stamp emblems on a dark ground
 */
export type MultiVariant = 'composite' | 'slices' | 'rail' | 'stamps';

export type CityStop = { id?: string; place_name: string; country_code: string | null; seq?: number };

const W = 400, H = 140;

function groundOf(st: CityStop) {
  return accentForTrip(st.country_code, st.place_name);
}

/**
 * Flag gesture drawn in the flag's OWN colours, scoped to a slice.
 * The first version drew everything in `ink`, which turned France and Italy
 * into monochrome blue and green — the tricolours were simply missing.
 * Colours come from the same FLAG_SPEC the single-city hero uses, so the two
 * heroes can never disagree about what a country looks like.
 */
function Gesture({ cc, x, w }: { cc: string; x: number; w: number }) {
  const spec = FLAG_SPEC[(cc || '').toUpperCase()];
  if (!spec) return null;
  const a = (i: number, fb = '#FFFFFF') => spec.accents[i] ?? fb;
  const cx = x + w / 2;

  switch (spec.kind) {
    case 'disc':
      return (
        <G opacity={0.9}>
          <Circle cx={cx} cy={H * 0.42} r={Math.min(w, H) * 0.40} fill={a(0)} />
          {spec.accents[1] && <Circle cx={cx} cy={H * 0.42} r={Math.min(w, H) * 0.22} fill={a(1)} />}
        </G>
      );

    case 'cross': {
      const arm = Math.max(12, w * 0.22);
      const ccx = x + w * 0.38;
      return (
        <G opacity={0.9}>
          <Rect x={x} y={H * 0.46 - arm / 2} width={w} height={arm} fill={a(0)} />
          <Rect x={ccx - arm / 2} y={0} width={arm} height={H} fill={a(0)} />
          <Rect x={x} y={H * 0.46 - arm / 6} width={w} height={arm / 3} fill={a(1, a(0))} />
          <Rect x={ccx - arm / 6} y={0} width={arm / 3} height={H} fill={a(1, a(0))} />
        </G>
      );
    }

    case 'union': {
      const ccx = x + w * 0.5, cy = H * 0.5, arm = Math.max(14, w * 0.24);
      return (
        <G opacity={0.9}>
          <Path d={`M${x} ${cy - H} L${x + w} ${cy + H} L${x + w} ${cy + H * 0.6} L${x} ${cy - H * 0.6} Z`} fill={a(0)} />
          <Path d={`M${x + w} ${cy - H} L${x} ${cy + H} L${x} ${cy + H * 0.6} L${x + w} ${cy - H * 0.6} Z`} fill={a(0)} />
          <Rect x={x} y={cy - arm / 2} width={w} height={arm} fill={a(0)} />
          <Rect x={ccx - arm / 2} y={0} width={arm} height={H} fill={a(0)} />
          <Rect x={x} y={cy - arm / 5} width={w} height={arm * 0.4} fill={a(1, a(0))} />
          <Rect x={ccx - arm / 5} y={0} width={arm * 0.4} height={H} fill={a(1, a(0))} />
        </G>
      );
    }

    case 'vbands': {
      // a real tricolour: ground + two colour fields, skewed so it reads as art
      const bw = w / 3, skew = 12;
      return (
        <G opacity={0.95}>
          {spec.accents.slice(0, 2).map((c, i) => (
            <Path key={i}
              d={`M${x + bw * (i + 1) + skew} 0 L${x + bw * (i + 2) + skew} 0 L${x + bw * (i + 2)} ${H} L${x + bw * (i + 1)} ${H} Z`}
              fill={c} />
          ))}
        </G>
      );
    }

    case 'bands':
      return (
        <G opacity={0.9}>
          {spec.accents.map((c, i) => (
            <Path key={i}
              d={`M${x} ${30 + i * 30} L${x + w} ${22 + i * 30} L${x + w} ${44 + i * 30} L${x} ${52 + i * 30} Z`}
              fill={c} />
          ))}
        </G>
      );

    case 'crescent': {
      const r = Math.min(w, H) * 0.3;
      return (
        <G opacity={0.9}>
          <Circle cx={x + w * 0.42} cy={H * 0.46} r={r} fill={a(0)} />
        </G>
      );
    }

    case 'diagonal':
      return (
        <G opacity={0.9}>
          <Path d={`M${x} 0 L${x + w * 0.55} 0 L${x + w * 0.2} ${H} L${x} ${H} Z`} fill={a(0)} />
          {spec.accents[1] &&
            <Path d={`M${x + w * 0.55} 0 L${x + w * 0.78} 0 L${x + w * 0.43} ${H} L${x + w * 0.2} ${H} Z`} fill={a(1)} />}
        </G>
      );

    default:
      return null;
  }
}

export default function MultiFlagArt({ stops, variant, height = 124 }: {
  stops: CityStop[]; variant: MultiVariant; height?: number;
}) {
  const list = stops.slice(0, 3);
  const lead = list[0];
  const leadBase = groundOf(lead);
  const leadInk = onColor(leadBase);


  if (variant === 'composite') {
    return <FlagRibbons stops={list} height={height} />;
  }

  if (variant === 'rail') {
    return (
      <View style={{ height, backgroundColor: leadBase, overflow: 'hidden' }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
          <Gesture cc={lead.country_code || ''} x={0} w={W} />
        </Svg>
        {/* the route as a rail: each leg in its own country's colour */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', height: 26 }}>
          {list.map((st, i) => {
            const c = groundOf(st);
            return (
              <View key={i} style={{ flex: 1, backgroundColor: c, justifyContent: 'center', paddingHorizontal: S[3] }}>
                <Text numberOfLines={1} style={[T.label, { color: onColor(c), opacity: 0.95 }]}>
                  {st.place_name.toUpperCase()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (variant === 'slices') {
    const n = list.length;
    const seg = W / n;
    return (
      <View style={{ height, overflow: 'hidden', backgroundColor: leadBase }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
          {list.map((st, i) => {
            const c = groundOf(st);
            const ink = onColor(c);
            const skew = 26;
            const x0 = i * seg, x1 = (i + 1) * seg;
            const d = `M${x0 + (i ? skew : 0)} 0 L${x1 + (i < n - 1 ? skew : 0)} 0 L${x1} ${H} L${x0} ${H} Z`;
            return (
              <G key={i}>
                <Defs>
                  <ClipPath id={`sl${i}`}><Path d={d} /></ClipPath>
                </Defs>
                <Path d={d} fill={c} />
                <G clipPath={`url(#sl${i})`}>
                  <Gesture cc={st.country_code || ''} x={x0} w={seg + skew} />
                </G>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  }

  // stamps
  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: P.inverse }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="ink" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.10" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill="url(#ink)" />
        {list.map((st, i) => {
          const c = groundOf(st);
          const ink = onColor(c);
          const cx = 96 + i * 104, cy = H * 0.46, r = 46;
          return (
            <G key={i} opacity={0.96}>
              <Defs>
                <ClipPath id={`st${i}`}><Circle cx={cx} cy={cy} r={r} /></ClipPath>
              </Defs>
              <Circle cx={cx} cy={cy} r={r} fill={c} />
              <G clipPath={`url(#st${i})`}>
                <Gesture cc={st.country_code || ''} x={cx - r} w={r * 2} />
              </G>
              <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.5} />
            </G>
          );
        })}
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: S[2], flexDirection: 'row', justifyContent: 'center' }}>
        <Text numberOfLines={1} style={[T.label, { color: '#FFFFFF', opacity: 0.7 }]}>
          {list.map(s => s.place_name.toUpperCase()).join('   ·   ')}
        </Text>
      </View>
    </View>
  );
}
