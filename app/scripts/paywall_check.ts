/** Exercise the two paywall decisions.
 *
 *   npx tsc scripts/paywall_check.ts src/paywallLogic.ts --outDir /tmp/pw \
 *     --module commonjs --target es2020 --moduleResolution node --skipLibCheck && \
 *   node /tmp/pw/scripts/paywall_check.js
 *
 *  The cases that matter are the negative ones: an unmappable product must
 *  never resolve to a tier, and a timeout must never read as failure.
 */
import { pollDecision, POLL_COPY, tierForProduct, TIER_RANK } from '../src/paywallLogic';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

console.log('\n── product → tier ──');
check('explorer product', tierForProduct('com.ealghunaim.voyageos.explorer.monthly'), 'explorer');
check('traveler product', tierForProduct('com.ealghunaim.voyageos.traveler.monthly'), 'traveler');
check('voyager product',  tierForProduct('com.ealghunaim.voyageos.voyager.monthly'),  'voyager');

console.log('\n── must NOT map (skipped and logged, never guessed) ──');
for (const [label, id] of [
  ['package identifier, not a product', '$rc_monthly'],
  ['the mis-assigned annual slot',      '$rc_annual'],
  ['the mis-assigned lifetime slot',    '$rc_lifetime'],
  ['a yearly product we do not sell',   'com.ealghunaim.voyageos.explorer.yearly'],
  ['a tier we do not have',             'com.ealghunaim.voyageos.premium.monthly'],
  ['someone else\'s bundle',            'com.other.app.voyager.monthly'],
  ['case differs',                      'com.ealghunaim.voyageos.Explorer.monthly'],
  ['trailing space',                    'com.ealghunaim.voyageos.explorer.monthly '],
  ['empty', ''], ['null', null as any], ['undefined', undefined as any],
] as const) {
  check(`${label}: ${JSON.stringify(id)}`, tierForProduct(id as any), null);
}

console.log('\n── ladder order ──');
const shuffled = ['voyager', 'explorer', 'traveler'] as const;
check('sorts to explorer, traveler, voyager',
  [...shuffled].sort((a, b) => TIER_RANK[a] - TIER_RANK[b]),
  ['explorer', 'traveler', 'voyager']);

console.log('\n── poll: the webhook landed ──');
check('tier changed → active',
  pollDecision({ serverTier: 'explorer', tierBefore: 'free', elapsedMs: 1500, timeoutMs: 15000 }),
  { done: true, outcome: 'active' });
check('upgrade from a paid tier also counts',
  pollDecision({ serverTier: 'voyager', tierBefore: 'explorer', elapsedMs: 3000, timeoutMs: 15000 }),
  { done: true, outcome: 'active' });
check('resubscribe after lapsing counts',
  pollDecision({ serverTier: 'explorer', tierBefore: 'free', elapsedMs: 9000, timeoutMs: 15000 }),
  { done: true, outcome: 'active' });

console.log('\n── poll: still waiting ──');
check('unchanged, within the window → keep polling',
  pollDecision({ serverTier: 'free', tierBefore: 'free', elapsedMs: 3000, timeoutMs: 15000 }),
  { done: false });
check('server unreachable, within the window → keep polling',
  pollDecision({ serverTier: null, tierBefore: 'free', elapsedMs: 3000, timeoutMs: 15000 }),
  { done: false });

console.log('\n── poll: timeout is NEVER a failure ──');
const timedOut = pollDecision({ serverTier: 'free', tierBefore: 'free', elapsedMs: 15000, timeoutMs: 15000 });
check('timeout → pending, not failed', timedOut, { done: true, outcome: 'pending' });
check('past the deadline → still pending',
  pollDecision({ serverTier: null, tierBefore: 'free', elapsedMs: 60000, timeoutMs: 15000 }),
  { done: true, outcome: 'pending' });

// The property, not just the value: no reachable outcome may read as failure.
const copy = Object.values(POLL_COPY).join(' ').toLowerCase();
const forbidden = ['fail', 'error', 'unsuccessful', 'declined', 'problem', 'sorry'];
const leaked = forbidden.filter(w => copy.includes(w));
check('no outcome copy says failure', leaked, []);
check('pending copy confirms the payment',
  /payment received/i.test(POLL_COPY.pending), true);

console.log(bad === 0 ? '\n  ✓ all cases behave\n' : `\n  ✗ ${bad} wrong\n`);
process.exit(bad === 0 ? 0 : 1);
