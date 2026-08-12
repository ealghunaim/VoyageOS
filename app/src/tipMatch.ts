/** Matching a traveller's tip to a guide restaurant.
 *
 *  Its own module so the rule can be exercised directly — see
 *  scripts/tipmatch_check.ts. The rule is the whole feature: the Eat card
 *  shows "what to order" and "when to go" only when a real person posted
 *  about that exact restaurant, so a match that is wrong does not degrade the
 *  feature, it fabricates a testimonial.
 *
 *  EXACT after normalising, never fuzzy. Normalisation removes only what
 *  cannot change which place is meant — case, accents, punctuation, doubled
 *  spaces, a leading article. Anything still unequal stays unmatched. No edit
 *  distance, no substring, no token overlap: "Sushi Bar Origami" and "Sushi
 *  Bar Origano" are different restaurants, and every fuzzy rule that unites
 *  them is a rule that misattributes someone.
 */
export const normName = (v: string): string =>
  (v ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // café → cafe
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')                       // & . ' - → space
    .replace(/^(the|le|la|el|il) /, '')
    .replace(/\s+/g, ' ')
    .trim();

type Matchable = { restaurant: string; order_rec?: string; when_rec?: string };

/** name → the newest tip carrying an order or timing recommendation. A tip
 *  with neither says nothing a restaurant card can borrow, so it is skipped
 *  rather than shown as an empty attribution. Input is newest-first. */
export function indexTips<T extends Matchable>(tips: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const t of tips ?? []) {
    if (!t.order_rec && !t.when_rec) continue;
    const k = normName(t.restaurant);
    if (k && !m.has(k)) m.set(k, t);
  }
  return m;
}
