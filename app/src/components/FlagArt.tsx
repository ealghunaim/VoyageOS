import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { accentForTrip, onColor } from '../theme';

/**
 * Flag-composition hero art.
 *
 * The panel's ground stays the country's single accent colour, and the flag's
 * *other* colours arrive as abstracted geometry over it — a cropped disc, an
 * off-centre cross, drifting bands. Two reasons it works that way rather than
 * drawing the flag properly:
 *
 *  1. Legibility is guaranteed. heroInk is derived from the ground, so keeping
 *     the ground constant means white/ink type is always safe. A literal flag
 *     would put white type on Japan's white field.
 *  2. It reads as designed rather than as a sticker. Shapes are oversized and
 *     bleed off the edges, so you register the flag's gesture, not the flag.
 *
 * Any country without a spec falls back to a soft wash of its own accent, so
 * this scales to all 59 accents (and beyond) with no per-city artwork.
 */

type Kind = 'disc' | 'cross' | 'union' | 'bands' | 'vbands' | 'diagonal' | 'crescent' | 'wash';
type Spec = { kind: Kind; accents: string[] };

/** Only the flag's *secondary* colours — the primary is already the ground. */
export const FLAG_SPEC: Record<string, Spec> = {
  JP: { kind: 'disc',     accents: ['#FFFFFF'] },
  BD: { kind: 'disc',     accents: ['#F42A41'] },
  KR: { kind: 'disc',     accents: ['#FFFFFF', '#CD2E3A'] },

  IS: { kind: 'cross',    accents: ['#FFFFFF', '#DC1E35'] },
  NO: { kind: 'cross',    accents: ['#FFFFFF', '#00205B'] },
  SE: { kind: 'cross',    accents: ['#FECC00'] },
  DK: { kind: 'cross',    accents: ['#FFFFFF'] },
  FI: { kind: 'cross',    accents: ['#FFFFFF', '#003580'] },
  CH: { kind: 'cross',    accents: ['#FFFFFF'] },
  GB: { kind: 'union',    accents: ['#FFFFFF', '#C8102E'] },

  KW: { kind: 'bands',    accents: ['#FFFFFF', '#CE1126', '#000000'] },
  AE: { kind: 'bands',    accents: ['#FFFFFF', '#000000', '#FF0000'] },
  EG: { kind: 'bands',    accents: ['#FFFFFF', '#000000'] },
  DE: { kind: 'bands',    accents: ['#000000', '#FFCE00'] },
  NL: { kind: 'bands',    accents: ['#FFFFFF', '#21468B'] },
  ES: { kind: 'bands',    accents: ['#FFC400'] },
  IN: { kind: 'bands',    accents: ['#FFFFFF', '#046A38', '#06038D'] },
  TH: { kind: 'bands',    accents: ['#FFFFFF', '#241D4F'] },
  RU: { kind: 'bands',    accents: ['#FFFFFF', '#D52B1E'] },
  AT: { kind: 'bands',    accents: ['#FFFFFF'] },

  FR: { kind: 'vbands',   accents: ['#FFFFFF', '#EF4135'] },
  IT: { kind: 'vbands',   accents: ['#FFFFFF', '#CE2B37'] },
  PT: { kind: 'vbands',   accents: ['#FF0000', '#FFE900'] },
  BE: { kind: 'vbands',   accents: ['#000000', '#ED2939'] },
  IE: { kind: 'vbands',   accents: ['#FFFFFF', '#FF883E'] },

  TR: { kind: 'crescent', accents: ['#FFFFFF'] },
  SG: { kind: 'crescent', accents: ['#FFFFFF'] },
  MY: { kind: 'crescent', accents: ['#FFFFFF', '#FFCC00'] },
  PK: { kind: 'crescent', accents: ['#FFFFFF'] },
  MV: { kind: 'crescent', accents: ['#FFFFFF', '#D21034'] },

  GR: { kind: 'diagonal', accents: ['#FFFFFF'] },
  CZ: { kind: 'diagonal', accents: ['#FFFFFF', '#D7141A'] },
  ZA: { kind: 'diagonal', accents: ['#FFFFFF', '#FFB612'] },
  BR: { kind: 'diagonal', accents: ['#FEDF00', '#002776'] },
  PH: { kind: 'diagonal', accents: ['#FFFFFF', '#FCD116'] },
};

const W = 400, H = 140;

function Composition({ kind, accents, seed }: { kind: Kind; accents: string[]; seed: number }) {
  // Small deterministic drift so two countries sharing a kind don't look
  // identical — same place always lands the same way.
  const r = (n: number) => ((seed >> (n * 3)) % 100) / 100;
  const a = (i: number, fallback = '#FFFFFF') => accents[i] ?? fallback;

  switch (kind) {
    case 'disc':
      return (
        <>
          <Circle cx={W * (0.62 + r(1) * 0.12)} cy={H * 0.42} r={H * 0.62}
            fill={a(0)} opacity={0.22} />
          <Circle cx={W * (0.62 + r(1) * 0.12)} cy={H * 0.42} r={H * 0.34}
            fill={a(1, a(0))} opacity={0.30} />
        </>
      );

    case 'cross': {
      const cx = W * 0.34, cy = H * 0.46, arm = 30;
      return (
        <G opacity={0.26}>
          <Rect x={0} y={cy - arm / 2} width={W} height={arm} fill={a(0)} />
          <Rect x={cx - arm / 2} y={0} width={arm} height={H} fill={a(0)} />
          <Rect x={0} y={cy - arm / 6} width={W} height={arm / 3} fill={a(1, a(0))} opacity={0.9} />
          <Rect x={cx - arm / 6} y={0} width={arm / 3} height={H} fill={a(1, a(0))} opacity={0.9} />
        </G>
      );
    }

    case 'union': {
      const cx = W * 0.42, cy = H * 0.5;
      return (
        <G opacity={0.30}>
          <Path d={`M${cx - 150} ${cy - 78} L${cx - 126} ${cy - 92} L${cx + 150} ${cy + 78} L${cx + 126} ${cy + 92} Z`} fill={a(0)} />
          <Path d={`M${cx + 150} ${cy - 78} L${cx + 126} ${cy - 92} L${cx - 150} ${cy + 78} L${cx - 126} ${cy + 92} Z`} fill={a(0)} />
          <Rect x={0} y={cy - 20} width={W} height={40} fill={a(0)} />
          <Rect x={cx - 20} y={0} width={40} height={H} fill={a(0)} />
          <Rect x={0} y={cy - 9} width={W} height={18} fill={a(1, a(0))} />
          <Rect x={cx - 9} y={0} width={18} height={H} fill={a(1, a(0))} />
        </G>
      );
    }

    case 'bands':
      return (
        <G opacity={0.24}>
          {accents.map((c, i) => (
            <Path key={i}
              d={`M0 ${28 + i * 34 + r(i + 1) * 6} L${W} ${18 + i * 34} L${W} ${52 + i * 34} L0 ${62 + i * 34 + r(i + 1) * 6} Z`}
              fill={c} />
          ))}
        </G>
      );

    case 'vbands':
      return (
        <G opacity={0.24}>
          {accents.map((c, i) => (
            <Path key={i}
              d={`M${90 + i * 96} 0 L${140 + i * 96 + r(i + 1) * 14} 0 L${118 + i * 96} ${H} L${68 + i * 96} ${H} Z`}
              fill={c} />
          ))}
        </G>
      );

    case 'diagonal':
      return (
        <G opacity={0.24}>
          <Path d={`M0 0 L${W * 0.52} 0 L${W * 0.2} ${H} L0 ${H} Z`} fill={a(0)} />
          <Path d={`M${W * 0.52} 0 L${W * 0.68} 0 L${W * 0.36} ${H} L${W * 0.2} ${H} Z`}
            fill={a(1, a(0))} />
        </G>
      );

    case 'crescent': {
      const cx = W * 0.30, cy = H * 0.48, rad = H * 0.44;
      return (
        <G opacity={0.26}>
          <Circle cx={cx} cy={cy} r={rad} fill={a(0)} />
          <Circle cx={cx + rad * 0.34} cy={cy} r={rad * 0.84} fill="#000" opacity={0.0001} />
          <Circle cx={cx + rad * 0.36} cy={cy} r={rad * 0.82} fill={a(1, 'transparent')}
            opacity={accents[1] ? 0.9 : 0} />
        </G>
      );
    }

    default:
      return null;
  }
}


/**
 * The flag field — the one hero language, for any number of countries.
 *
 * Every country contributes its ground plus its flag accents as opaque angled
 * ribbons, painted in visit order. Nothing is layered and nothing is faded, so
 * colours stay true no matter how many countries share the panel. A one-country
 * trip and a three-country trip are the same composition at different lengths,
 * which is what keeps the cards uniform.
 */
export function FlagRibbons({ stops, height = 124 }: {
  stops: { place_name: string; country_code: string | null }[]; height?: number;
}) {
  const palette: string[] = [];
  stops.forEach(st => {
    const b = accentForTrip(st.country_code, st.place_name);
    const spec = FLAG_SPEC[(st.country_code || '').toUpperCase()];
    palette.push(b);
    (spec?.accents ?? []).slice(0, 2).forEach(c => palette.push(c));
  });
  if (!palette.length) palette.push('#1B2CFB');

  // A single country yields only two or three ribbons, which reads as thin.
  // Repeat the palette so density matches whether a trip has one stop or three
  // — that shared rhythm is what makes the two cards feel like one system.
  const field: string[] = [];
  while (field.length < 9) field.push(...palette);

  const weights = field.map((_, i) => (i % 3 === 0 ? 2.2 : i % 3 === 1 ? 0.9 : 0.6));
  const total = weights.reduce((a, b) => a + b, 0);
  const skew = 34;
  let cursor = -skew;

  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: field[0] }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        {field.map((c, i) => {
          const w = ((W + skew * 2) * weights[i]) / total;
          const x0 = cursor;
          cursor += w;
          return (
            <Path key={i}
              d={`M${x0 + skew} 0 L${x0 + w + skew} 0 L${x0 + w} ${H} L${x0} ${H} Z`}
              fill={c} />
          );
        })}
        <Defs>
          <LinearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.18" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill="url(#depth)" />
      </Svg>
    </View>
  );
}

/** Single-destination hero. Just the one-country case of the same field, so a
 *  trip that gains a second stop keeps the same visual language. */
export default function FlagArt({ countryCode, place, height = 124 }: {
  countryCode?: string | null; place: string; height?: number;
}) {
  return (
    <FlagRibbons
      stops={[{ place_name: place, country_code: (countryCode || '').toUpperCase() }]}
      height={height} />
  );
}
