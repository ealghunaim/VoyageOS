// VoyageOS design system v2 — "editorial travel": light, airy, premium, round.
// One accent per destination: colors follow where you're going.
export const C = {
  bg: '#F2F6FA',
  card: '#FFFFFF',
  border: '#E3EAF3',
  text: '#0A0E17',      // deep navy — premium over plain black
  sub: '#7B8596',
  blue: '#1D6BFF',      // brand base (wordmark, primary actions)
  blueSoft: '#E4EEFF',
  green: '#16A34A',
  red: '#DC2626',
  glacier: '#3FD1FF',
  navy: '#0A0E17',
};

export const F = { reg: 'Satoshi', med: 'Satoshi-Medium', bold: 'Satoshi-Bold' };

export const R = { card: 24, btn: 16, chip: 999, input: 14 };

export const SHADOW = {
  shadowColor: '#0B1526',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

// destination-driven accents — deterministic, curated, travel-toned
const PALETTE = [
  '#0EA5E9', // ocean
  '#F59E0B', // desert
  '#10B981', // tropics
  '#8B5CF6', // twilight
  '#F97316', // canyon
  '#14B8A6', // lagoon
  '#3B82F6', // alpine sky
  '#E11D48', // festival
];

// flag-derived accents — cards wear the destination's colors
export function titleize(title: string): string {
  return title.split(' ').map(w => w.toLowerCase() === 'trip' ? 'trip' : w.toUpperCase()).join(' ');
}

export const FLAG_ACCENT: Record<string, string> = {
  KW: '#007A3D', QA: '#8A1538', AE: '#00732F', SA: '#165D31', BH: '#CE1126',
  OM: '#DB161B', JO: '#CE1126', EG: '#C09300', TR: '#E30A17', LB: '#00A651',
  GB: '#012169', IE: '#169B62', FR: '#0055A4', DE: '#DD9A00', IT: '#008C45',
  ES: '#AA151B', PT: '#046A38', NL: '#FF7A00', BE: '#FDDA24', CH: '#DA291C',
  AT: '#ED2939', SE: '#005293', NO: '#BA0C2F', DK: '#C8102E', FI: '#002F6C',
  PL: '#DC143C', CZ: '#11457E', GR: '#0D5EAF', RU: '#0033A0', UA: '#0057B7',
  US: '#0A3161', CA: '#D80621', MX: '#006341', BR: '#009739', AR: '#74ACDF',
  CL: '#0032A0', CO: '#FCD116', AU: '#00247D', NZ: '#00247D', ZA: '#007847',
  IN: '#FF671F', PK: '#01411C', BD: '#006A4E', LK: '#8D2029', PH: '#0038A8',
  ID: '#CE1126', MY: '#010066', SG: '#EF3340', TH: '#241D4F', VN: '#DA251D',
  CN: '#DE2910', SC: '#0072C6', IS: '#02529C', HR: '#C8102E', KZ: '#00AFCA', JP: '#BC002D', KR: '#0047A0', MV: '#00843D', MA: '#C1272D',
};

export function accentForTrip(countryCode: string | null | undefined, fallbackKey: string): string {
  const cc = (countryCode || '').toUpperCase();
  return FLAG_ACCENT[cc] ?? accentFor(fallbackKey);
}

export function accentFor(key: string | null | undefined): string {
  const s = (key || 'voyage').toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function tint(hex: string, alpha = 0.14): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─────────────────────────────────────────────────────────────
// Brand system v3 — "Journey. Optimized."
// Additive on purpose: C / R / SHADOW above are untouched, so screens
// that haven't migrated yet render exactly as before. Screens move onto
// P / S / RA / E / T one at a time; the old exports go once the last does.
// ─────────────────────────────────────────────────────────────

const RAMP = {
  ink:    '#0D182A',
  indigo: '#1B2CFB',
  blue:   '#3465FF',
  cyan:   '#00C2FF',
  sky:    '#6EE7FF',
};

export const P = {
  brand:      RAMP.indigo,
  brandHover: RAMP.blue,
  brandWash:  'rgba(27,44,251,0.06)',
  gradient:     [RAMP.indigo, RAMP.cyan] as [string, string],
  gradientSoft: [RAMP.cyan,   RAMP.sky ] as [string, string],

  pageBg:  '#F4F7FB',
  card:    '#FFFFFF',
  sunken:  '#EDF2F8',
  inverse: RAMP.ink,

  textPri:    RAMP.ink,
  textSec:    '#5B6B82',
  textMuted:  '#8B9AB0',
  textOnDark: '#FFFFFF',

  hairline:       '#E4EBF4',
  hairlineStrong: '#CFDAE8',

  success: '#0E9F6E',
  danger:  '#E02D3C',
  warning: '#E8A63A',
  /**
   * Amber for warning TEXT. P.warning is tuned for fills and indicators and
   * only reaches 2.1:1 on white — unreadable as type. This darker amber is
   * 5.0:1 and passes AA, so warning states that are written rather than
   * filled use this one.
   *
   * The condition-colour rule: danger = error, warning = caution, and both
   * report a state rather than marking an action. Actions stay neutral.
   */
  warningInk: '#B45309',
};

/** 4pt grid. Replaces the scattered 10/14/18/22 literals. */
export const S = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const RA = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

/** Three deliberate steps rather than one blanket shadow. */
export const E = {
  low:  { shadowColor: RAMP.ink, shadowOpacity: 0.04, shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },  elevation: 1 },
  mid:  { shadowColor: RAMP.ink, shadowOpacity: 0.07, shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },  elevation: 3 },
  high: { shadowColor: RAMP.ink, shadowOpacity: 0.12, shadowRadius: 30,
          shadowOffset: { width: 0, height: 16 }, elevation: 8 },
};

/** Satoshi only — weight and tracking carry the hierarchy.
 *  headings -> F.bold · subheads -> F.med · body -> F.reg */
export const T = {
  display: { fontFamily: F.bold, fontSize: 32, lineHeight: 36, letterSpacing: -0.8 },
  h1:      { fontFamily: F.bold, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 },
  h2:      { fontFamily: F.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
  title:   { fontFamily: F.med,  fontSize: 16, lineHeight: 21, letterSpacing: -0.1 },
  body:    { fontFamily: F.reg,  fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: F.reg,  fontSize: 13, lineHeight: 18 },
  label:   { fontFamily: F.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8 },
} as const;

/** A trip goes out and comes back — the V is that shape. It appears once
 *  per screen as real structure (the hero's folded lower edge), not ornament. */
export const FOLD = { depth: 18 } as const;

/**
 * Readable ink for text sitting on a filled colour. Flag accents run from
 * Japan crimson to Colombia yellow, so white is not always safe — this picks
 * white or deep ink by relative luminance rather than assuming.
 */
export function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.45 ? RAMP.ink : '#FFFFFF';
}

/**
 * Raise a colour until it reads as a *fill* against the ink contour.
 * The filled icon style needs bright areas inside a dark outline; a navy or
 * near-black accent (UK #012169, Saudi green) otherwise merges with the
 * contour and the glyph collapses into a solid blob. Light accents pass
 * through untouched.
 */
export function lift(hex: string, target = 0.34): string {
  const n = parseInt(hex.slice(1), 16);
  let [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (rr: number, gg: number, bb: number) => {
    const f = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(rr) + 0.7152 * f(gg) + 0.0722 * f(bb);
  };
  let mix = 0;
  while (lum(r, g, b) < target && mix < 0.8) {
    mix += 0.05;
    const o = parseInt(hex.slice(1), 16);
    r = Math.round(((o >> 16) & 255) + (255 - ((o >> 16) & 255)) * mix);
    g = Math.round(((o >> 8) & 255) + (255 - ((o >> 8) & 255)) * mix);
    b = Math.round((o & 255) + (255 - (o & 255)) * mix);
  }
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
