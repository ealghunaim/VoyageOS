// The one line a traveller reads after applying a kit.
//
// The old alert said "N added · M already on the list", which was true when a
// match meant "skip". Now a match usually means the quantity CHANGED, and
// "already on the list" would be asserting that nothing happened to items we
// had just modified — the worst kind of wrong, because it reads as
// reassurance.
//
// So the summary names what happened, and the counts decompose:
//   already_there === merged + skipped
//   capped ⊆ merged
import type { KitApplied, KitConflict } from './api';

/** "3 added · 4 already listed — 3 merged, 1 skipped" */
export function summarise(r: KitApplied): string {
  const parts: string[] = [];
  if (r.added) parts.push(`${r.added} added`);
  if (r.already_there) {
    const how: string[] = [];
    if (r.merged) how.push(`${r.merged} merged`);
    if (r.skipped) how.push(`${r.skipped} skipped`);
    parts.push(`${r.already_there} already listed — ${how.join(', ')}`);
  }
  if (r.capped) {
    // Surfaced because a silent cap is a quantity the traveller believes they
    // asked for and did not get.
    parts.push(`${r.capped} capped at 99`);
  }
  return parts.join(' · ') || 'Nothing to add — the kit is already on this list';
}

/** One Review row: what happened to this item, in the item's own terms. */
export function describe(c: KitConflict): string {
  if (c.action === 'skipped') return 'already listed, kit copy skipped';
  const sum = `merged ${c.from_qty}+${c.added_qty} → ${c.to_qty}`;
  return c.capped_at ? `${sum}, capped at ${c.capped_at}` : sum;
}
