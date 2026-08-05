import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { accentForTrip, P } from '../theme';
import { FLAG_SPEC, FlagRibbons } from './FlagArt';

/**
 * Flag *faces* — actual flag geometry with real field colours, as opposed to
 * the ribbon abstraction. A face knows which colour is the field and which are
 * the figures, which the accent table alone can't say: Japan's accent is the
 * red disc, but its field is white, so drawing "accent as ground" produced a
 * crimson panel rather than a Japanese flag.
 *
 * Four treatments over the same faces, so the difference is purely how much
 * flag you see and how hard it reads.
 */
export type FieldStyle = 'panels' | 'veil' | 'wash' | 'ribbons';

type Face =
  | { kind: 'disc'; field: string; figure: string }
  | { kind: 'union'; field: string; figures: [string, string] }
  | { kind: 'vtri'; bands: [string, string, string] }
  | { kind: 'htri'; bands: [string, string, string] }
  | { kind: 'hbi'; bands: [string, string] }
  | { kind: 'vbi'; bands: [string, string] }
  | { kind: 'nordic'; field: string; figures: [string, string] }
  | { kind: 'swiss'; field: string; figure: string }
  | { kind: 'hoistTri'; bands: string[]; triangle: string }
  | { kind: 'hoistTrap'; bands: string[]; trap: string }
  | { kind: 'crescent'; field: string; figure: string }
  | { kind: 'starBand'; field: string; figure: string }
  | { kind: 'cantonStripes'; stripeA: string; stripeB: string; canton: string }
  | { kind: 'unionCanton'; field: string; figures: [string, string] }
  | { kind: 'centreEmblem'; bands: [string, string, string]; emblem: string }
  | { kind: 'wideMiddle'; bands: [string, string, string] };

/**
 * Real geometry per country. Each entry names which colour is the field and
 * which are figures — the accent table alone can't say that, and getting it
 * backwards is what made Japan render as a crimson panel instead of a flag.
 * Anything absent falls through to the derived fallback below, which guesses
 * a tricolour rather than a generic two-bar placeholder.
 */
const FACE: Record<string, Face> = {
  // discs & emblems on a plain field
  JP: { kind: 'disc',   field: '#FFFFFF', figure: '#BC002D' },
  BD: { kind: 'disc',   field: '#006A4E', figure: '#F42A41' },
  KR: { kind: 'disc',   field: '#FFFFFF', figure: '#CD2E3A' },
  VN: { kind: 'starBand', field: '#DA251D', figure: '#FFFF00' },
  CN: { kind: 'starBand', field: '#DE2910', figure: '#FFDE00' },
  MA: { kind: 'starBand', field: '#C1272D', figure: '#006233' },
  SA: { kind: 'starBand', field: '#165D31', figure: '#FFFFFF' },

  // crosses
  GB: { kind: 'union',  field: '#012169', figures: ['#FFFFFF', '#C8102E'] },
  IS: { kind: 'nordic', field: '#02529C', figures: ['#FFFFFF', '#DC1E35'] },
  NO: { kind: 'nordic', field: '#BA0C2F', figures: ['#FFFFFF', '#00205B'] },
  SE: { kind: 'nordic', field: '#005293', figures: ['#FECC00', '#FECC00'] },
  DK: { kind: 'nordic', field: '#C8102E', figures: ['#FFFFFF', '#FFFFFF'] },
  FI: { kind: 'nordic', field: '#FFFFFF', figures: ['#003580', '#003580'] },
  CH: { kind: 'swiss',  field: '#DA291C', figure: '#FFFFFF' },
  GR: { kind: 'cantonStripes', stripeA: '#0D5EAF', stripeB: '#FFFFFF', canton: '#0D5EAF' },

  // vertical tricolours
  FR: { kind: 'vtri',   bands: ['#0055A4', '#FFFFFF', '#EF4135'] },
  IT: { kind: 'vtri',   bands: ['#008C45', '#FFFFFF', '#CE2B37'] },
  IE: { kind: 'vtri',   bands: ['#169B62', '#FFFFFF', '#FF883E'] },
  BE: { kind: 'vtri',   bands: ['#000000', '#FDDA24', '#ED2939'] },
  MX: { kind: 'vtri',   bands: ['#006341', '#FFFFFF', '#CE1126'] },
  NG: { kind: 'vtri',   bands: ['#008751', '#FFFFFF', '#008751'] },
  PT: { kind: 'vbi',    bands: ['#046A38', '#DA291C'] },
  CA: { kind: 'centreEmblem', bands: ['#D80621', '#FFFFFF', '#D80621'], emblem: '#D80621' },

  // horizontal tricolours & bicolours
  DE: { kind: 'htri',   bands: ['#000000', '#DD0000', '#FFCE00'] },
  NL: { kind: 'htri',   bands: ['#AE1C28', '#FFFFFF', '#21468B'] },
  RU: { kind: 'htri',   bands: ['#FFFFFF', '#0039A6', '#D52B1E'] },
  EG: { kind: 'htri',   bands: ['#CE1126', '#FFFFFF', '#000000'] },
  AT: { kind: 'htri',   bands: ['#ED2939', '#FFFFFF', '#ED2939'] },
  IN: { kind: 'htri',   bands: ['#FF9933', '#FFFFFF', '#138808'] },
  CO: { kind: 'wideMiddle', bands: ['#FCD116', '#003893', '#CE1126'] },
  ES: { kind: 'wideMiddle', bands: ['#AA151B', '#F1BF00', '#AA151B'] },
  ID: { kind: 'hbi',    bands: ['#CE1126', '#FFFFFF'] },
  PL: { kind: 'hbi',    bands: ['#FFFFFF', '#DC143C'] },
  UA: { kind: 'hbi',    bands: ['#0057B7', '#FFD700'] },
  SG: { kind: 'hbi',    bands: ['#EF3340', '#FFFFFF'] },
  TH: { kind: 'wideMiddle', bands: ['#A51931', '#F4F5F8', '#2D2A4A'] },

  // hoist devices
  KW: { kind: 'hoistTrap', bands: ['#007A3D', '#FFFFFF', '#CE1126'], trap: '#000000' },
  AE: { kind: 'hoistTrap', bands: ['#00732F', '#FFFFFF', '#000000'], trap: '#FF0000' },
  JO: { kind: 'hoistTri',  bands: ['#000000', '#FFFFFF', '#007A3D'], triangle: '#CE1126' },
  SD: { kind: 'hoistTri',  bands: ['#D21034', '#FFFFFF', '#000000'], triangle: '#007229' },
  SC: { kind: 'hoistTri',  bands: ['#FCD856', '#D92223', '#FFFFFF'], triangle: '#003F87' },
  PH: { kind: 'hoistTri',  bands: ['#0038A8', '#0038A8', '#CE1126'], triangle: '#FFFFFF' },
  CZ: { kind: 'hoistTri',  bands: ['#FFFFFF', '#FFFFFF', '#D7141A'], triangle: '#11457E' },
  QA: { kind: 'vbi',    bands: ['#FFFFFF', '#8A1538'] },
  BH: { kind: 'vbi',    bands: ['#FFFFFF', '#CE1126'] },

  // crescents
  TR: { kind: 'crescent', field: '#E30A17', figure: '#FFFFFF' },
  PK: { kind: 'crescent', field: '#01411C', figure: '#FFFFFF' },
  DZ: { kind: 'crescent', field: '#006233', figure: '#FFFFFF' },
  TN: { kind: 'crescent', field: '#E70013', figure: '#FFFFFF' },
  MY: { kind: 'cantonStripes', stripeA: '#CC0001', stripeB: '#FFFFFF', canton: '#010066' },

  // canton + stripes
  US: { kind: 'cantonStripes', stripeA: '#B22234', stripeB: '#FFFFFF', canton: '#3C3B6E' },
  AU: { kind: 'unionCanton', field: '#00247D', figures: ['#FFFFFF', '#CC0000'] },
  NZ: { kind: 'unionCanton', field: '#00247D', figures: ['#FFFFFF', '#CC142B'] },
};

/** Every colour a face paints, so their separation can be measured. */
function faceColors(f: Face | undefined, fallback: string): string[] {
  if (!f) return [fallback];
  switch (f.kind) {
    case 'disc': case 'swiss': case 'crescent': case 'starBand':
      return [f.field, f.figure];
    case 'union': case 'nordic': case 'unionCanton':
      return [f.field, ...f.figures];
    case 'vtri': case 'htri': case 'wideMiddle':
      return [...f.bands];
    case 'hbi': case 'vbi':
      return [...f.bands];
    case 'hoistTri':  return [...f.bands, f.triangle];
    case 'hoistTrap': return [...f.bands, f.trap];
    case 'cantonStripes': return [f.stripeA, f.stripeB, f.canton];
    case 'centreEmblem':  return [...f.bands, f.emblem];
    default: return [fallback];
  }
}

function mixOver(fg: string, bg: string, a: number): [number, number, number] {
  const f = parseInt(fg.slice(1), 16), b = parseInt(bg.slice(1), 16);
  return [16, 8, 0].map(sh =>
    Math.round(a * ((f >> sh) & 255) + (1 - a) * ((b >> sh) & 255))
  ) as [number, number, number];
}

/** Redmean distance — a cheap perceptual approximation, good enough to tell
 *  "two different colours" from "the same colour twice". */
function colourDistance(x: [number, number, number], y: [number, number, number]): number {
  const rm = (x[0] + y[0]) / 2;
  const [dr, dg, db] = [x[0] - y[0], x[1] - y[1], x[2] - y[2]];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/** Below this the bands stop reading as separate and the flag becomes a panel.
 *  Set from measured cases: Thailand collapses at 59, Japan is comfortable at
 *  195, and Kuwait and the UK sit between at 85 and 99 — all three of those
 *  wanted more, Japan wanted nothing. */
const MIN_BAND_SEPARATION = 130;

function legibleOpacity(
  stops: { country_code: string | null }[], ground: string, base: number,
): number {
  const colours = stops.flatMap(st =>
    faceColors(FACE[(st.country_code || '').toUpperCase()], ground));
  if (colours.length < 2) return base;
  for (let a = base; a <= 1.0001; a += 0.01) {
    const mixed = colours.map(c => mixOver(c, ground, a));
    let worst = Infinity;
    for (let i = 0; i < mixed.length; i++)
      for (let j = i + 1; j < mixed.length; j++)
        worst = Math.min(worst, colourDistance(mixed[i], mixed[j]));
    if (worst >= MIN_BAND_SEPARATION) return Math.min(1, a);
  }
  return 1;
}

const W = 400, H = 140;

/** Darken or lighten a hex colour — used only to derive a second band for a
 *  country we have no artwork for, so it still reads as a flag. */
function shade(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * factor);
  const g = clamp(((n >> 8) & 255) * factor);
  const b = clamp((n & 255) * factor);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/** One flag drawn inside x..x+w. Geometry is simplified but proportioned. */
function FlagFace({ cc, place, x, w }: { cc: string; place: string; x: number; w: number }) {
  const c = (cc || '').toUpperCase();
  const f = FACE[c];

  if (!f) {
    // Derived fallback. Most national flags are tricolours or bicolours, so
    // guessing that from the accent table beats the old "field plus two bars",
    // which looked like a placeholder on every unmapped country. Orientation
    // comes from the country code so a given country always looks the same.
    const base = accentForTrip(c, place);
    const acc = (FLAG_SPEC[c]?.accents ?? []).filter(Boolean);
    let hash = 0;
    for (let i = 0; i < c.length; i++) hash = (hash * 31 + c.charCodeAt(i)) >>> 0;
    const vertical = hash % 2 === 0;

    // A country with no accents used to collapse to bands=[base] and render a
    // single flat Rect — which reads as a missing image rather than as a flag
    // we happen not to draw. Seychelles looked like that: a valid code, real
    // data, and a blank panel. Two shades derived from the base give it the
    // silhouette of a bicolour, so an unmapped country still reads as a flag.
    const bands = acc.length >= 2 ? [base, acc[0], acc[1]]
                : acc.length === 1 ? [base, acc[0]]
                : [base, shade(base, 0.72)];
    return (
      <G>
        {bands.map((b, i) =>
          vertical
            ? <Rect key={i} x={x + (w / bands.length) * i} y={0}
                width={w / bands.length + 0.5} height={H} fill={b} />
            : <Rect key={i} x={x} y={(H / bands.length) * i}
                width={w} height={H / bands.length + 0.5} fill={b} />
        )}
      </G>
    );
  }

  switch (f.kind) {
    case 'disc':
      // Japan: disc diameter is 3/5 of the hoist, dead centre.
      return (
        <G>
          <Rect x={x} y={0} width={w} height={H} fill={f.field} />
          <Circle cx={x + w / 2} cy={H / 2} r={H * 0.3} fill={f.figure} />
        </G>
      );

    case 'vtri':
      return (
        <G>
          {f.bands.map((b, i) => (
            <Rect key={i} x={x + (w / 3) * i} y={0} width={w / 3 + 0.5} height={H} fill={b} />
          ))}
        </G>
      );

    case 'htri':
      return (
        <G>
          {f.bands.map((b, i) => (
            <Rect key={i} x={x} y={(H / 3) * i} width={w} height={H / 3 + 0.5} fill={b} />
          ))}
        </G>
      );

    case 'nordic': {
      // Nordic cross: arm is 2/9 of the hoist, and the vertical sits 3/8 along
      // rather than centred — that offset is what makes it read as Nordic.
      const armY = H * 0.222, armX = H * 0.222;
      const cx = x + w * 0.375;
      return (
        <G>
          <Rect x={x} y={0} width={w} height={H} fill={f.field} />
          <Rect x={x} y={H / 2 - armY / 2} width={w} height={armY} fill={f.figures[0]} />
          <Rect x={cx - armX / 2} y={0} width={armX} height={H} fill={f.figures[0]} />
          <Rect x={x} y={H / 2 - armY / 4} width={w} height={armY / 2} fill={f.figures[1]} />
          <Rect x={cx - armX / 4} y={0} width={armX / 2} height={H} fill={f.figures[1]} />
        </G>
      );
    }

    case 'union': {
      // Union Jack: red cross is 1/5 of the hoist with a 1/15 white fimbriation
      // either side; the saltire arms are narrower than the cross.
      const cy = H / 2, cx = x + w / 2;
      const wide = H * 0.333, thin = H * 0.2;
      const satW = H * 0.20, satR = H * 0.10;
      return (
        <G>
          <Rect x={x} y={0} width={w} height={H} fill={f.field} />
          <G clipPath={`url(#uk${Math.round(x)})`}>
            <Defs>
              <ClipPath id={`uk${Math.round(x)}`}>
                <Rect x={x} y={0} width={w} height={H} />
              </ClipPath>
            </Defs>
            <Path d={`M${x - 20} ${-satW} L${x + w + 20} ${H + satW} L${x + w + 20} ${H - satW} L${x - 20} ${-satW * 2} Z`}
              fill={f.figures[0]} />
            <Path d={`M${x + w + 20} ${-satW} L${x - 20} ${H + satW} L${x - 20} ${H - satW} L${x + w + 20} ${-satW * 2} Z`}
              fill={f.figures[0]} />
            <Path d={`M${x - 20} ${-satR} L${x + w + 20} ${H + satR} L${x + w + 20} ${H} L${x - 20} ${-satR * 2} Z`}
              fill={f.figures[1]} />
            <Path d={`M${x + w + 20} ${-satR} L${x - 20} ${H + satR} L${x - 20} ${H} L${x + w + 20} ${-satR * 2} Z`}
              fill={f.figures[1]} />
            <Rect x={x} y={cy - wide / 2} width={w} height={wide} fill={f.figures[0]} />
            <Rect x={cx - wide / 2} y={0} width={wide} height={H} fill={f.figures[0]} />
            <Rect x={x} y={cy - thin / 2} width={w} height={thin} fill={f.figures[1]} />
            <Rect x={cx - thin / 2} y={0} width={thin} height={H} fill={f.figures[1]} />
          </G>
        </G>
      );
    }


    case 'hbi':
      return (
        <G>
          {f.bands.map((b, i) => (
            <Rect key={i} x={x} y={(H / 2) * i} width={w} height={H / 2 + 0.5} fill={b} />
          ))}
        </G>
      );

    case 'vbi':
      // Portugal/Qatar style: the hoist band is narrower than the fly.
      return (
        <G>
          <Rect x={x} y={0} width={w * 0.4} height={H} fill={f.bands[0]} />
          <Rect x={x + w * 0.4} y={0} width={w * 0.6 + 0.5} height={H} fill={f.bands[1]} />
        </G>
      );

    case 'wideMiddle':
      // Spain, Colombia, Thailand: the centre band is double height.
      return (
        <G>
          <Rect x={x} y={0} width={w} height={H * 0.25} fill={f.bands[0]} />
          <Rect x={x} y={H * 0.25} width={w} height={H * 0.5} fill={f.bands[1]} />
          <Rect x={x} y={H * 0.75} width={w} height={H * 0.25 + 0.5} fill={f.bands[2]} />
        </G>
      );

    case 'swiss': {
      const arm = H * 0.2, cx = x + w / 2, cy = H / 2;
      return (
        <G>
          <Rect x={x} y={0} width={w} height={H} fill={f.field} />
          <Rect x={cx - arm * 1.6} y={cy - arm / 2} width={arm * 3.2} height={arm} fill={f.figure} />
          <Rect x={cx - arm / 2} y={cy - arm * 1.6} width={arm} height={arm * 3.2} fill={f.figure} />
        </G>
      );
    }

    case 'hoistTri': {
      // Arab-style hoist triangle over three bands (Jordan, Sudan, Czechia).
      const b = H / 3;
      return (
        <G>
          {f.bands.map((c2, i) => (
            <Rect key={i} x={x} y={b * i} width={w} height={b + 0.5} fill={c2} />
          ))}
          <Path d={`M${x} 0 L${x + w * 0.42} ${H / 2} L${x} ${H} Z`} fill={f.triangle} />
        </G>
      );
    }

    case 'crescent': {
      const cx = x + w * 0.42, cy = H / 2, r = H * 0.26;
      return (
        <G>
          <Rect x={x} y={0} width={w} height={H} fill={f.field} />
          <Circle cx={cx} cy={cy} r={r} fill={f.figure} />
          <Circle cx={cx + r * 0.38} cy={cy} r={r * 0.82} fill={f.field} />
          <Circle cx={cx + r * 1.5} cy={cy} r={r * 0.34} fill={f.figure} />
        </G>
      );
    }

    case 'starBand': {
      // A single emblem on a plain field — Vietnam, China, Morocco, Saudi.
      const cx = x + w * 0.5, cy = H / 2, r = H * 0.24;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const ang = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.4;
        return `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
      }).join(' L');
      return (
        <G>
          <Rect x={x} y={0} width={w} height={H} fill={f.field} />
          <Path d={`M${pts} Z`} fill={f.figure} />
        </G>
      );
    }

    case 'cantonStripes': {
      const rows = 7;
      return (
        <G>
          {Array.from({ length: rows }, (_, i) => (
            <Rect key={i} x={x} y={(H / rows) * i} width={w} height={H / rows + 0.5}
              fill={i % 2 === 0 ? f.stripeA : f.stripeB} />
          ))}
          <Rect x={x} y={0} width={w * 0.42} height={(H / rows) * 4} fill={f.canton} />
        </G>
      );
    }

    case 'unionCanton': {
      // Australia / New Zealand: Union canton on a blue field.
      const cw = w * 0.5, ch = H * 0.5;
      return (
        <G>
          <Rect x={x} y={0} width={w} height={H} fill={f.field} />
          <Rect x={x} y={0} width={cw} height={ch} fill={f.field} />
          <Path d={`M${x} 0 L${x + cw} ${ch} L${x + cw} ${ch * 0.78} L${x} ${-ch * 0.22} Z`} fill={f.figures[0]} />
          <Path d={`M${x + cw} 0 L${x} ${ch} L${x} ${ch * 0.78} L${x + cw} ${-ch * 0.22} Z`} fill={f.figures[0]} />
          <Rect x={x} y={ch / 2 - ch * 0.09} width={cw} height={ch * 0.18} fill={f.figures[0]} />
          <Rect x={x + cw / 2 - cw * 0.09} y={0} width={cw * 0.18} height={ch} fill={f.figures[0]} />
          <Rect x={x} y={ch / 2 - ch * 0.05} width={cw} height={ch * 0.1} fill={f.figures[1]} />
          <Rect x={x + cw / 2 - cw * 0.05} y={0} width={cw * 0.1} height={ch} fill={f.figures[1]} />
          <Circle cx={x + w * 0.78} cy={H * 0.62} r={H * 0.05} fill={f.figures[0]} />
          <Circle cx={x + w * 0.68} cy={H * 0.35} r={H * 0.04} fill={f.figures[0]} />
          <Circle cx={x + w * 0.86} cy={H * 0.34} r={H * 0.04} fill={f.figures[0]} />
        </G>
      );
    }

    case 'centreEmblem': {
      // Canada: vertical bands with a device in the middle.
      return (
        <G>
          <Rect x={x} y={0} width={w * 0.25} height={H} fill={f.bands[0]} />
          <Rect x={x + w * 0.25} y={0} width={w * 0.5} height={H} fill={f.bands[1]} />
          <Rect x={x + w * 0.75} y={0} width={w * 0.25 + 0.5} height={H} fill={f.bands[2]} />
          <Path d={`M${x + w * 0.5} ${H * 0.24}
                    L${x + w * 0.57} ${H * 0.45} L${x + w * 0.62} ${H * 0.4}
                    L${x + w * 0.58} ${H * 0.62} L${x + w * 0.5} ${H * 0.58}
                    L${x + w * 0.42} ${H * 0.62} L${x + w * 0.38} ${H * 0.4}
                    L${x + w * 0.43} ${H * 0.45} Z`} fill={f.emblem} />
        </G>
      );
    }

    case 'hoistTrap': {
      // Kuwait / UAE: three bands with a hoist device spanning 1/4 of the length
      const b = H / 3;
      return (
        <G>
          {f.bands.map((c2, i) => (
            <Rect key={i} x={x} y={b * i} width={w} height={b + 0.5} fill={c2} />
          ))}
          <Path d={`M${x} 0 L${x + w * 0.25} ${b} L${x + w * 0.25} ${b * 2} L${x} ${H} Z`} fill={f.trap} />
        </G>
      );
    }
  }
}

export default function FlagField({ stops, style, height = 124 }: {
  stops: { place_name: string; country_code: string | null }[];
  style: FieldStyle; height?: number;
}) {
  // 'ribbons' is the earlier abstraction, kept so it can be compared directly
  // against the real flag faces rather than described.
  if (style === 'ribbons') return <FlagRibbons stops={stops} height={height} />;

  // Four flags is the most that stays legible across a card this wide; past
  // that a face is too narrow to recognise. Rather than silently dropping the
  // rest (the old slice(0,3) did, so a five-country trip looked like a
  // three-country one) the tail collapses into a counted panel.
  const MAX_FACES = 8;
  const overflow = stops.length > MAX_FACES ? stops.length - (MAX_FACES - 1) : 0;
  const list = overflow ? stops.slice(0, MAX_FACES - 1) : stops.slice(0, MAX_FACES);
  const cells = list.length + (overflow ? 1 : 0);
  const n = Math.max(1, cells);
  const lead = list[0];
  const leadBase = accentForTrip(lead?.country_code, lead?.place_name ?? '');

  // How much flag you actually see, chosen so the flag stays legible rather
  // than fixed at one number.
  //
  // A wash silently fails when a flag's own colours sit close together over
  // its own ground. Thailand is the case: at 0.32 its red and blue bands
  // composite to #4D1C45 and #27214D — 59 apart on a perceptual scale, so the
  // three bands read as one purple panel. Japan never had the problem: white
  // against red stays 195 apart at any opacity.
  //
  // Keying on the ground's luminance alone could not tell those apart, since
  // both grounds are dark. What matters is whether the bands remain
  // distinguishable FROM EACH OTHER once mixed, so that is what is measured,
  // and opacity rises only until they are.
  const faceOpacity = style === 'panels' ? 1
    : legibleOpacity(list, leadBase, style === 'veil' ? 0.5 : 0.32);

  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: leadBase }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <G opacity={faceOpacity}>
          {list.map((st, i) => (
            <FlagFace key={i} cc={st.country_code || ''} place={st.place_name}
              x={(W / n) * i} w={W / n + 0.5} />
          ))}
          {overflow > 0 && (
            <Rect x={(W / n) * (n - 1)} y={0} width={W / n + 0.5} height={H} fill={P.inverse} />
          )}
        </G>
        {overflow > 0 && (
          <SvgText x={(W / n) * (n - 1) + (W / n) / 2} y={H / 2 + 7}
            fill="#FFFFFF" fontSize={26} fontWeight="700" textAnchor="middle" opacity={0.9}>
            {`+${overflow}`}
          </SvgText>
        )}

        <Defs>
          {/* softens the join between flags and sinks the field into the card */}
          <LinearGradient id="fdepth" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={style === 'panels' ? 0.05 : 0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={style === 'panels' ? 0.28 : 0.18} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill="url(#fdepth)" />
      </Svg>
    </View>
  );
}
