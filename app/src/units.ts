// Weights, shown one way.
//
// grams→kg was formatted in two places with two different rounding rules:
// Packing used toFixed(1) and WeightSheet used toFixed(value % 1000 ? 2 : 1).
// The same bag therefore read "1.5 kg" on the packing screen and "1.50 kg" in
// the sheet you set it from — the kind of disagreement that makes a reader
// distrust both numbers rather than pick one.
//
// One decimal, everywhere. A gram of precision on a suitcase is noise; what
// the traveller is deciding is whether they are over an airline limit, and
// that decision is never made on the second decimal place.

/** Grams as kilograms, for display. `null` for an unset weight. */
export function kg(grams: number | null | undefined): string | null {
  if (grams == null || isNaN(grams)) return null;
  return `${(grams / 1000).toFixed(1)} kg`;
}

/** Whole kilograms — for limits, which are always set in round numbers. */
export function kgWhole(grams: number | null | undefined): string | null {
  if (grams == null || isNaN(grams)) return null;
  return `${(grams / 1000).toFixed(0)} kg`;
}
