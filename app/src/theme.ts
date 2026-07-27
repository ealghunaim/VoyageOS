// VoyageOS design system v2 — "editorial travel": light, airy, premium, round.
// One accent per destination: colors follow where you're going.
export const C = {
  bg: '#F6F8FB',
  card: '#FFFFFF',
  border: '#ECF0F5',
  text: '#0B1526',      // deep navy — premium over plain black
  sub: '#5B6B7F',
  blue: '#2563EB',      // brand base (wordmark, primary actions)
  blueSoft: '#E9F0FE',
  green: '#16A34A',
  red: '#DC2626',
};

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
