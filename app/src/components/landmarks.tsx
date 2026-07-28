// Landmark clip-art library — minimal silhouettes, one per famous destination.
// Each mark is authored in a 100×100 box (baseline y=100) and painted in
// tints of the trip's accent. Unmatched places fall back to generative art.
// t = tint level per shape (0..1); c = optional circles.

export type Mark = {
  keys: string[];
  paths: { d: string; t?: number }[];
  circles?: { cx: number; cy: number; r: number; t?: number }[];
};

const GENERIC: Mark = { // city skyline — every unmatched destination gets this
  keys: [],
  paths: [
    { d: 'M14 100 V52 h12 V100 Z', t: 0.6 }, { d: 'M30 100 V34 h14 V100 Z', t: 0.85 },
    { d: 'M48 100 V60 h10 V100 Z', t: 0.5 }, { d: 'M62 100 V42 h13 V100 Z', t: 0.75 },
    { d: 'M79 100 V64 h9 V100 Z', t: 0.55 },
    { d: 'M33 40 h3 v4 h-3 Z M39 40 h3 v4 h-3 Z M33 50 h3 v4 h-3 Z M39 50 h3 v4 h-3 Z M65 48 h3 v4 h-3 Z M71 48 h3 v4 h-3 Z', t: 0.3 },
  ],
};

export const MARKS: Mark[] = [
  { // Bahrain — twin-sail towers
    keys: ['bahrain', 'manama'],
    paths: [
      { d: 'M34 100 V30 q10 -8 12 0 V100 Z', t: 0.85 },
      { d: 'M56 100 V30 q10 -8 12 0 V100 Z', t: 0.7 },
      { d: 'M46 62 h10 v4 H46 Z M46 46 h10 v4 H46 Z', t: 0.5 },
    ],
  },
  { // Jeddah — fountain jet over the corniche
    keys: ['jeddah'],
    paths: [
      { d: 'M48 100 V38 h4 V100 Z', t: 0.85 },
      { d: 'M50 38 q-8 -18 -20 -22 q14 0 20 12 q6 -12 20 -12 q-12 4 -20 22 Z', t: 0.6 },
      { d: 'M18 100 q32 -10 64 0 Z', t: 0.5 },
    ],
  },
  { // Bangkok — wat spire
    keys: ['bangkok', 'thailand'],
    paths: [
      { d: 'M44 100 V56 h12 V100 Z', t: 0.85 },
      { d: 'M40 56 L50 12 L60 56 Z', t: 0.85 },
      { d: 'M30 100 V72 h8 V100 Z M62 100 V72 h8 V100 Z', t: 0.6 },
    ],
  },
  { // Prague — bridge tower
    keys: ['prague', 'czech'],
    paths: [
      { d: 'M36 100 V36 h6 v6 h6 v-6 h4 v6 h6 v-6 h6 V100 Z', t: 0.85 },
      { d: 'M36 36 L50 16 L64 36 Z', t: 0.85 },
      { d: 'M46 100 v-16 a4 5 0 0 1 8 0 v16 Z', t: 0.5 },
      { d: 'M14 96 h72 v4 H14 Z M20 96 v-10 h6 v10 Z M74 96 v-10 h6 v10 Z', t: 0.6 },
    ],
  },
  { // Kuwait Towers — the spheres on spires
    keys: ['kuwait'],
    paths: [
      { d: 'M46 100 L48 6 h4 L54 100 Z', t: 0.85 },
      { d: 'M70 100 L71 34 h3 L76 100 Z', t: 0.7 },
    ],
    circles: [
      { cx: 50, cy: 30, r: 12, t: 0.85 }, { cx: 50, cy: 56, r: 8, t: 0.6 },
      { cx: 72.5, cy: 44, r: 8, t: 0.7 },
    ],
  },
  { // Doha skyline — towers and the spiral
    keys: ['doha', 'qatar'],
    paths: [
      { d: 'M18 100 V48 h10 V100 Z', t: 0.6 },
      { d: 'M34 100 V30 q6 -8 12 0 V100 Z', t: 0.85 },
      { d: 'M54 100 V56 h9 V100 Z', t: 0.55 },
      { d: 'M70 100 L74 22 h6 L84 100 Z', t: 0.75 },
    ],
  },
  { // Eiffel Tower
    keys: ['paris', 'eiffel'],
    paths: [
      { d: 'M50 2 L64 62 h8 L80 100 h-14 a16 18 0 0 0 -32 0 H20 L36 62 h-8 Z M44 40 h12 l1 6 H43 Z',
        t: 0.85 },
    ],
  },
  { // Big Ben
    keys: ['london'],
    paths: [
      { d: 'M42 100 V26 h16 V100 Z', t: 0.85 },
      { d: 'M40 26 h20 l-10 -16 Z', t: 0.85 },
      { d: 'M38 44 h24 v4 H38 Z', t: 0.5 },
    ],
    circles: [{ cx: 50, cy: 35, r: 5, t: 0.4 }],
  },
  { // Torii gate
    keys: ['kyoto', 'tokyo', 'japan', 'osaka'],
    paths: [
      { d: 'M14 22 Q50 10 86 22 v7 H14 Z', t: 0.85 },
      { d: 'M24 38 h52 v6 H24 Z', t: 0.75 },
      { d: 'M28 29 l4 71 h8 l2 -71 Z', t: 0.85 },
      { d: 'M58 29 l2 71 h8 l4 -71 Z', t: 0.85 },
    ],
  },
  { // Pyramids
    keys: ['cairo', 'giza', 'egypt'],
    paths: [
      { d: 'M8 100 L42 34 L76 100 Z', t: 0.85 },
      { d: 'M52 100 L78 56 L98 100 Z', t: 0.6 },
    ],
  },
  { // Colosseum
    keys: ['rome', 'colosseum'],
    paths: [
      { d: 'M12 100 V56 Q50 36 88 56 V100 Z M24 100 v-16 a7 8 0 0 1 14 0 v16 Z M43 100 v-18 a7 8 0 0 1 14 0 v18 Z M62 100 v-16 a7 8 0 0 1 14 0 v16 Z',
        t: 0.85 },
    ],
  },
  { // Parthenon
    keys: ['athens', 'greece'],
    paths: [
      { d: 'M14 40 L50 22 L86 40 v6 H14 Z', t: 0.85 },
      { d: 'M18 92 h64 v8 H18 Z', t: 0.85 },
      { d: 'M22 50 h8 V90 h-8 Z M38 50 h8 V90 h-8 Z M54 50 h8 V90 h-8 Z M70 50 h8 V90 h-8 Z', t: 0.7 },
    ],
  },
  { // Mosque dome & minarets
    keys: ['istanbul', 'turkey', 'abu dhabi', 'muscat', 'riyadh'],
    paths: [
      { d: 'M30 100 V62 Q50 40 70 62 V100 Z', t: 0.85 },
      { d: 'M16 100 V34 h5 V100 Z M18.5 34 L18.5 24', t: 0.7 },
      { d: 'M79 100 V34 h5 V100 Z', t: 0.7 },
      { d: 'M14 34 h9 l-4.5 -10 Z M77 34 h9 l-4.5 -10 Z', t: 0.7 },
    ],
    circles: [{ cx: 50, cy: 46, r: 2.5, t: 0.85 }],
  },
  { // Burj-style spire
    keys: ['dubai', 'burj'],
    paths: [
      { d: 'M50 0 L58 100 H42 Z', t: 0.85 },
      { d: 'M36 100 V64 h8 V100 Z M56 100 V64 h8 V100 Z', t: 0.6 },
    ],
  },
  { // Opera House shells
    keys: ['sydney', 'australia'],
    paths: [
      { d: 'M12 100 Q22 52 50 58 L42 100 Z', t: 0.85 },
      { d: 'M40 100 Q52 46 80 54 L70 100 Z', t: 0.7 },
      { d: 'M68 100 Q80 60 94 66 L90 100 Z', t: 0.55 },
    ],
  },
  { // Golden Gate
    keys: ['san francisco', 'golden gate'],
    paths: [
      { d: 'M20 100 V30 h6 V100 Z M74 100 V30 h6 V100 Z', t: 0.85 },
      { d: 'M10 52 Q50 20 90 52 l0 5 Q50 26 10 57 Z', t: 0.7 },
      { d: 'M6 62 h88 v6 H6 Z', t: 0.85 },
    ],
  },
  { // Statue of Liberty (torch arm)
    keys: ['new york', 'nyc', 'liberty'],
    paths: [
      { d: 'M42 100 V48 h14 V100 Z', t: 0.85 },
      { d: 'M54 54 L68 22 h5 L60 58 Z', t: 0.85 },
      { d: 'M44 40 l-6 -8 4 -2 4 6 3 -8 4 2 -3 10 Z', t: 0.7 },
      { d: 'M30 100 h40 l-4 -8 H34 Z', t: 0.6 },
    ],
    circles: [{ cx: 50, cy: 44, r: 5, t: 0.85 }, { cx: 70, cy: 18, r: 4, t: 0.6 }],
  },
  { // Sagrada spires
    keys: ['barcelona', 'sagrada'],
    paths: [
      { d: 'M28 100 L33 30 h4 L42 100 Z', t: 0.7 },
      { d: 'M44 100 L49 16 h4 L58 100 Z', t: 0.85 },
      { d: 'M60 100 L65 34 h4 L74 100 Z', t: 0.7 },
    ],
    circles: [{ cx: 51, cy: 12, r: 3, t: 0.85 }, { cx: 35, cy: 26, r: 2.5, t: 0.7 }, { cx: 67, cy: 30, r: 2.5, t: 0.7 }],
  },
  { // Taj Mahal
    keys: ['agra', 'taj', 'india', 'delhi'],
    paths: [
      { d: 'M32 100 V66 Q50 44 68 66 V100 Z', t: 0.85 },
      { d: 'M18 100 V56 h6 V100 Z M76 100 V56 h6 V100 Z', t: 0.6 },
      { d: 'M14 96 h72 v4 H14 Z', t: 0.7 },
      { d: 'M49 44 h2 v-8 h-2 Z', t: 0.85 },
    ],
  },
  { // Christ the Redeemer
    keys: ['rio', 'brazil'],
    paths: [
      { d: 'M47 100 V44 h6 V100 Z', t: 0.85 },
      { d: 'M22 48 h56 v6 H22 Z', t: 0.85 },
      { d: 'M30 100 L50 74 L70 100 Z', t: 0.55 },
    ],
    circles: [{ cx: 50, cy: 38, r: 5, t: 0.85 }],
  },
  { // Windmill
    keys: ['amsterdam', 'netherlands', 'holland'],
    paths: [
      { d: 'M42 100 L46 52 h8 L58 100 Z', t: 0.85 },
      { d: 'M50 48 L28 26 l4 -4 22 22 22 -22 4 4 -22 22 22 22 -4 4 -22 -22 -22 22 -4 -4 Z', t: 0.7 },
    ],
    circles: [{ cx: 50, cy: 48, r: 4, t: 0.85 }],
  },
  { // Castle keep
    keys: ['glasgow', 'edinburgh', 'scotland', 'castle'],
    paths: [
      { d: 'M30 100 V42 h6 v8 h8 v-8 h12 v8 h8 v-8 h6 V100 Z', t: 0.85 },
      { d: 'M46 100 v-20 a4 5 0 0 1 8 0 v20 Z', t: 0.5 },
      { d: 'M64 42 V26 l12 5 -12 5 Z', t: 0.7 },
    ],
  },
  { // Gondola
    keys: ['venice', 'venezia'],
    paths: [
      { d: 'M10 76 Q50 92 90 74 Q64 84 34 84 Q18 82 10 76 Z', t: 0.85 },
      { d: 'M86 74 q6 -8 2 -14 q0 8 -6 12 Z', t: 0.85 },
      { d: 'M56 82 L60 46 h3 L60 82 Z', t: 0.7 },
    ],
  },
  { // Marina Bay
    keys: ['singapore', 'marina bay'],
    paths: [
      { d: 'M26 100 V44 h10 V100 Z M45 100 V44 h10 V100 Z M64 100 V44 h10 V100 Z', t: 0.85 },
      { d: 'M18 44 Q50 28 82 44 l0 -8 Q50 22 18 36 Z', t: 0.7 },
    ],
  },
  { // Palm — coastal & island escapes
    keys: ['riviera', 'nice', 'cannes', 'maldives', 'male', 'bali', 'phuket', 'beach', 'ibiza', 'seychelles', 'mahe'],
    paths: [
      { d: 'M50 100 Q46 70 52 44 l5 1 Q52 72 56 100 Z', t: 0.85 },
      { d: 'M54 46 Q34 34 20 42 Q36 26 55 40 Z M54 46 Q74 32 86 42 Q72 26 54 40 Z M54 44 Q44 22 28 22 Q46 14 56 40 Z M55 44 Q66 22 80 24 Q64 14 54 40 Z',
        t: 0.7 },
    ],
    circles: [{ cx: 66, cy: 52, r: 3, t: 0.6 }, { cx: 60, cy: 58, r: 2.5, t: 0.6 }],
  },
  { // Alpine peaks — mountain regions
    keys: ['chamonix', 'dolomites', 'alps', 'zermatt', 'aspen', 'innsbruck'],
    paths: [
      { d: 'M6 100 L36 30 L52 62 L68 22 L96 100 Z', t: 0.85 },
      { d: 'M30 44 L36 30 L42 44 L36 40 Z M62 34 L68 22 L74 34 L68 30 Z', t: 0.3 },
    ],
  },
];

export function markFor(name: string): Mark | null {
  const n = (name || '').toLowerCase();
  for (const m of MARKS) {
    if (m.keys.some(k => n.includes(k))) return m;
  }
  return GENERIC;
}
