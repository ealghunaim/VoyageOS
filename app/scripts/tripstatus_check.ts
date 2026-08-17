/** Exercise the one definition of when a trip is.
 *
 *   npx tsc scripts/tripstatus_check.ts src/tripStatus.ts --outDir /tmp/ts \
 *     --module commonjs --target es2020 --moduleResolution node --skipLibCheck && \
 *   node /tmp/ts/scripts/tripstatus_check.js
 *
 *  The case that motivated all of this is `an in-progress trip is NOT
 *  finished` — the old badge computed past-ness from the start date, so a trip
 *  you were physically on read "past".
 */
import { classify, daysUntilDay, needsDebrief, sortForTab, whenLabel } from '../src/tripStatus';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

// Mid-afternoon, deliberately: a trip ending "today" must survive the whole day.
const NOW = new Date(2026, 7, 17, 15, 30);   // Mon 17 Aug 2026
const trip = (start: string, end: string, status: string | null = 'upcoming') =>
  ({ start_date: start, end_date: end, status });

console.log('\n  ── classification ──');
check('ahead of you', classify(trip('2026-09-01', '2026-09-08'), NOW), 'upcoming');
check('starts tomorrow', classify(trip('2026-08-18', '2026-08-25'), NOW), 'upcoming');
check('starts today', classify(trip('2026-08-17', '2026-08-24'), NOW), 'in_progress');
check('THE BUG: started, not ended', classify(trip('2026-08-14', '2026-08-24'), NOW), 'in_progress');
check('ends today — still on it', classify(trip('2026-08-10', '2026-08-17'), NOW), 'in_progress');
check('ended yesterday', classify(trip('2026-08-01', '2026-08-16'), NOW), 'finished');
check('one-day trip, today', classify(trip('2026-08-17', '2026-08-17'), NOW), 'in_progress');
check('completed beats the calendar',
  classify(trip('2026-09-01', '2026-09-08', 'completed'), NOW), 'finished');

console.log('\n  ── the words on the card ──');
check('future', whenLabel(trip('2026-08-27', '2026-09-01'), NOW), 'in 10 days');
check('tomorrow', whenLabel(trip('2026-08-18', '2026-08-20'), NOW), 'tomorrow');
check('today', whenLabel(trip('2026-08-17', '2026-08-20'), NOW), 'today');
check('mid-trip never says "past"', whenLabel(trip('2026-08-14', '2026-08-24'), NOW), '7 days left');
check('penultimate day', whenLabel(trip('2026-08-14', '2026-08-18'), NOW), 'ends tomorrow');
check('final day', whenLabel(trip('2026-08-14', '2026-08-17'), NOW), 'last day');
check('over', whenLabel(trip('2026-08-01', '2026-08-10'), NOW), 'finished');

console.log('\n  ── timezone honesty ──');
// The UTC-parse bug: `new Date("2026-08-17")` is the 16th at 19:00 in New York,
// which would end a trip a day early for everyone west of Greenwich.
check('a date string means that local day', daysUntilDay('2026-08-17', NOW), 0);
check('across a DST boundary', daysUntilDay('2026-11-10', new Date(2026, 10, 3, 9, 0)), 7);
check('garbage does not throw', daysUntilDay('', NOW), 0);

console.log('\n  ── the debrief nudge ──');
check('finished, undebriefed', needsDebrief(trip('2026-08-01', '2026-08-10'), NOW), true);
check('already debriefed', needsDebrief(trip('2026-08-01', '2026-08-10', 'completed'), NOW), false);
check('still on it — do not nag', needsDebrief(trip('2026-08-14', '2026-08-24'), NOW), false);
check('not started', needsDebrief(trip('2026-09-01', '2026-09-08'), NOW), false);

console.log('\n  ── ordering ──');
const many = [
  trip('2026-09-20', '2026-09-27'),          // later upcoming
  trip('2026-08-01', '2026-08-10'),          // finished, older
  trip('2026-08-14', '2026-08-24'),          // in progress
  trip('2026-08-12', '2026-08-15'),          // finished, newer
  trip('2026-09-01', '2026-09-08'),          // sooner upcoming
];
check('All: happening, then soonest, then most recent past',
  sortForTab(many, 'all', NOW).map(t => t.start_date),
  ['2026-08-14', '2026-09-01', '2026-09-20', '2026-08-12', '2026-08-01']);
check('Finished: most recent first',
  sortForTab(many.filter(t => classify(t, NOW) === 'finished'), 'finished', NOW)
    .map(t => t.start_date),
  ['2026-08-12', '2026-08-01']);
check('sorting does not mutate the input', many[0].start_date, '2026-09-20');

console.log(bad === 0 ? '\n  ✓ all cases behave\n' : `\n  ✗ ${bad} wrong\n`);
process.exit(bad === 0 ? 0 : 1);
