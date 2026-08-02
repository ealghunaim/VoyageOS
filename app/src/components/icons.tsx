import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { lift, tint } from '../theme';

/**
 * Tile icons — a stacked card carrying a symbol, in flat fills with an ink
 * contour.
 *
 * Construction follows the reference: two slivers peeking out behind a larger
 * front card, all sharing one dark outline. The front card is the surface the
 * symbol lives on, so every icon in the set has the same silhouette and reads
 * as one family; only the symbol changes.
 *
 * `palette` decides where colour comes from:
 *   'accent' — the destination's colour, lifted so dark flags (UK navy) don't
 *              merge with the contour. Ties the icons to the trip, but a dark
 *              flag ends up muted.
 *   'brand'  — a fixed indigo/cyan pair. Always vivid, never muted, and the
 *              flag hero already carries the destination.
 */
export type IconPalette = 'accent' | 'brand';

export default function TileIcon({ kind, accent, size = 30, palette = 'accent' }: {
  kind: string; accent: string; size?: number; palette?: IconPalette;
}) {
  const INK = '#0D182A';
  const top  = palette === 'brand' ? '#1B2CFB' : lift(accent);
  const mid  = palette === 'brand' ? '#6EE7FF' : tint(lift(accent, 0.52), 0.55);
  const face = palette === 'brand' ? '#FFFFFF' : '#FFFFFF';

  const o = {
    stroke: INK,
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const line = { ...o, fill: 'none' };

  // symbols fill the frame; the stack now lives on the tile itself
  const symbols: Record<string, React.ReactNode> = {
    pack: (
      <>
        <Path d="M9 6.5V5.2A1.6 1.6 0 0 1 10.6 3.6h2.8A1.6 1.6 0 0 1 15 5.2v1.3" {...line} />
        <Rect x="2.8" y="6.5" width="18.4" height="14" rx="2.8" fill={mid} {...o} />
        <Rect x="2.8" y="6.5" width="18.4" height="4.6" rx="2.4" fill={top} {...o} />
        <Line x1="12" y1="11.1" x2="12" y2="20.5" {...line} />
      </>
    ),
    plan: (
      <>
        <Rect x="2.8" y="4.6" width="18.4" height="16.4" rx="2.8" fill={face} {...o} />
        <Path d="M2.8 7.4a2.8 2.8 0 0 1 2.8-2.8h12.8a2.8 2.8 0 0 1 2.8 2.8v2.8H2.8z" fill={top} {...o} />
        <Line x1="7.4" y1="2.6" x2="7.4" y2="6" {...line} />
        <Line x1="16.6" y1="2.6" x2="16.6" y2="6" {...line} />
        <Path d="M8.6 15.4l2.2 2.2 4.6-4.6" {...line} />
      </>
    ),
    know: (
      <>
        <Rect x="5" y="2.8" width="14" height="18.4" rx="2.4" fill={top} {...o} />
        <Path d="M17.4 2.8h1.6v18.4h-1.6z" fill={mid} {...o} />
        <Circle cx="11.4" cy="10" r="3" fill={face} {...o} />
        <Line x1="8.6" y1="16.8" x2="14.2" y2="16.8" {...line} />
      </>
    ),
    // Both the fork head and the knife blade are filled: every other icon in
    // the set leads with a solid shape inside the contour, and unfilled
    // cutlery read as thin line-art next to them.
    eat: (
      <>
        <Path d="M3.8 2.6h5.2v5.4a2.6 2.6 0 0 1-5.2 0z" fill={mid} {...o} />
        <Line x1="5.2" y1="3.6" x2="5.2" y2="6.2" {...line} />
        <Line x1="7.6" y1="3.6" x2="7.6" y2="6.2" {...line} />
        <Line x1="6.4" y1="8" x2="6.4" y2="21.4" {...line} />
        <Path d="M17.2 2.6c2.4 0 3.8 2.4 3.8 5.2s-1.4 4.8-3.8 4.8z" fill={top} {...o} />
        <Line x1="17.2" y1="12.6" x2="17.2" y2="21.4" {...line} />
      </>
    ),
    play: (
      <>
        <Path d="M2.8 9.4V7.6a1.6 1.6 0 0 1 1.6-1.6h15.2a1.6 1.6 0 0 1 1.6 1.6v1.8a2.6 2.6 0 0 0 0 5.2v1.8a1.6 1.6 0 0 1-1.6 1.6H4.4a1.6 1.6 0 0 1-1.6-1.6v-1.8a2.6 2.6 0 0 0 0-5.2z" fill={top} {...o} />
        <Path d="M15 6h4.6a1.6 1.6 0 0 1 1.6 1.6v1.8a2.6 2.6 0 0 0 0 5.2v1.8a1.6 1.6 0 0 1-1.6 1.6H15z" fill={mid} {...o} />
        <Line x1="15" y1="6" x2="15" y2="18" strokeDasharray="1.5 2" {...line} />
      </>
    ),
    visit: (
      <>
        <Path d="M12 21.4s7.4-6 7.4-11.4a7.4 7.4 0 1 0-14.8 0c0 5.4 7.4 11.4 7.4 11.4z" fill={top} {...o} />
        <Circle cx="12" cy="9.8" r="2.9" fill={face} {...o} />
      </>
    ),
    go: (
      <>
        <Path d="M20.8 3.2L3.2 10.4l6.3 2.7 8.9-7.2-7.2 8.9 2.7 6.3z" fill={top} {...o} />
        <Line x1="9.5" y1="13.1" x2="12.4" y2="20.6" {...line} />
      </>
    ),
    journal: (
      <>
        <Path d="M5.4 3.2h11.4A2.6 2.6 0 0 1 19.4 5.8v15H8a2.6 2.6 0 0 1-2.6-2.6z" fill={face} {...o} />
        <Path d="M5.4 3.2h3.4v17.6H8a2.6 2.6 0 0 1-2.6-2.6z" fill={top} {...o} />
        <Line x1="11.4" y1="8" x2="16.4" y2="8" {...line} />
        <Line x1="11.4" y1="11.4" x2="16.4" y2="11.4" {...line} />
        <Path d="M14.6 3.2h2.4v5l-1.2-1.2-1.2 1.2z" fill={mid} {...o} />
      </>
    ),
    sos: (
      <>
        <Path d="M12 2.8l7.4 2.9v5.6c0 4.6-3.1 7.9-7.4 10-4.3-2.1-7.4-5.4-7.4-10V5.7z" fill={top} {...o} />
        <Path d="M10.7 8.4h2.6v2.6h2.6v2.6h-2.6v2.6h-2.6v-2.6H8.1v-2.6h2.6z" fill={face} {...o} />
      </>
    ),
    phrases: (
      <>
        <Path d="M3 7A2.4 2.4 0 0 1 5.4 4.6h8.8A2.4 2.4 0 0 1 16.6 7v3.8a2.4 2.4 0 0 1-2.4 2.4H8l-3.6 2.7v-2.7A1.4 1.4 0 0 1 3 11.8z" fill={top} {...o} />
        <Path d="M12.2 12.4h6.4A2.4 2.4 0 0 1 21 14.8v2.8a2.4 2.4 0 0 1-2.4 2.4v2.2l-3-2.2h-3.4a2.4 2.4 0 0 1-2.4-2.4v-2.8a2.4 2.4 0 0 1 2.4-2.4z" fill={mid} {...o} />
      </>
    ),
    currency: (
      <>
        <Circle cx="12" cy="12" r="8.8" fill={top} {...o} />
        <Circle cx="12" cy="12" r="6" fill={mid} {...o} />
        <Line x1="12" y1="7.6" x2="12" y2="16.4" {...line} />
        <Path d="M14.2 9.6h-3a1.8 1.8 0 0 0 0 3.6h1.4a1.8 1.8 0 0 1 0 3.6H9.6" {...line} />
      </>
    ),
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {symbols[kind] ?? symbols.visit}
    </Svg>
  );
}
