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
  CN: '#DE2910', JP: '#BC002D', KR: '#0047A0', MV: '#00843D', MA: '#C1272D',
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
