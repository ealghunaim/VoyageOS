/** Exercise the tip↔restaurant matching rule.
 *
 *   npx tsc scripts/tipmatch_check.ts src/tipMatch.ts --outDir /tmp/tipmatch \
 *     --module commonjs --target es2020 --moduleResolution node && \
 *   node /tmp/tipmatch/scripts/tipmatch_check.js
 *
 *  The MUST NOT cases matter more than the MUST cases. A missed match costs a
 *  line of advice; a wrong match puts a stranger's words under a restaurant
 *  they never visited.
 */
import { indexTips, normName } from '../src/tipMatch';

const tip = (restaurant: string, order_rec = 'the omakase', when_rec = '') =>
  ({ restaurant, order_rec, when_rec });

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n      got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

console.log('\n── MUST match: the same restaurant, written differently ──');
for (const [guide, posted] of [
  ['Sushi Bar Origami',      'Sushi Bar Origami'],       // identical
  ['Sushi Bar Origami',      'sushi bar origami'],       // case
  ['Café Independants',      'Cafe Independants'],       // accent
  ['Okutan Kappa-Zushi',     'Okutan Kappa Zushi'],      // hyphen
  ['Al Marjan Bakery & Restaurant', "Al Marjan Bakery &  Restaurant"],   // punctuation spacing
  ['Gion Tanto',             '  Gion   Tanto  '],        // stray whitespace
  ['The Sodoh Higashiyama',  'Sodoh Higashiyama'],       // leading article
  ["Nijo Jimonotei",         'Nijo Jimonotei.'],         // trailing punctuation
] as const) {
  const idx = indexTips([tip(posted)]);
  check(`"${guide}"  ←  "${posted}"`, idx.has(normName(guide)), true);
}

console.log('\n── MUST NOT match: different restaurants ──');
for (const [guide, posted, why] of [
  ['Sushi Bar Origami', 'Sushi Bar Origano', 'one letter apart — a real pair of names could differ by this much'],
  ['Kikunoi',           'Kikunoi Roan',      'substring: Roan is a separate restaurant by the same chef'],
  ['Menami',            'Menami Ramen',      'extra word could be a second branch or a different place'],
  ['Marjan Seafood',    'Seafood Marjan',    'token overlap is not identity'],
  ['Omen Kodai-ji',     'Omen Ginkakuji',    'same restaurant name, different branch'],
  ['Gion Tanto',        'Gion Tando',        'transposed letter'],
  ['Al Marjan Bakery & Restaurant', 'Al Marjan Bakery and Restaurant',
   'the deliberate cost of being strict: & and "and" are not equated, so this real ' +
   'pair is missed. Accepted — the alternative is a synonym table, and every entry ' +
   'in one is a new way to match the wrong place'],
] as const) {
  const idx = indexTips([tip(posted)]);
  check(`"${guide}"  ✕  "${posted}"  (${why})`, idx.has(normName(guide)), false);
}

console.log('\n── the index itself ──');
check('a tip with no order and no timing is skipped — nothing to show',
  indexTips([tip('Kikunoi', '', '')]).size, 0);
check('timing alone is enough',
  indexTips([tip('Kikunoi', '', 'book a month ahead')]).size, 1);
check('newest wins when two travellers post the same restaurant',
  indexTips([tip('Kikunoi', 'newest'), tip('Kikunoi', 'older')]).get(normName('Kikunoi'))?.order_rec,
  'newest');
check('an empty tip list matches nothing', indexTips([]).size, 0);
check('a restaurant with no tip gets nothing',
  indexTips([tip('Kikunoi')]).get(normName('Menami')) ?? null, null);
check('a name that normalises to nothing is not a key',
  indexTips([tip('!!!', 'x')]).size, 0);

console.log(bad === 0 ? '\n  ✓ all cases behave\n' : `\n  ✗ ${bad} case(s) wrong\n`);
process.exit(bad === 0 ? 0 : 1);
