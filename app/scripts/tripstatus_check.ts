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
import {
  clampDay, classify, dayLabel, daysUntilDay, isoDay, needsDebrief, sortForTab, whenLabel,
} from '../src/tripStatus';

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

console.log('\n  ── journal days ──');
check('a Date becomes a local ISO day', isoDay(NOW), '2026-08-17');
check('single digits pad', isoDay(new Date(2026, 0, 5, 23, 59)), '2026-01-05');

// THE TIMEZONE TRAP, ASSERTED FROM BOTH SIDES.
//
// `toISOString().slice(0,10)` was used in three date pickers and shifted the
// day for anyone west of Greenwich: New York, picking 18 August at 9pm, stored
// the 19th. It survived because this project is developed at UTC+3, where the
// wrong implementation happens to agree with the right one.
//
// So both ends of the day are asserted. A UTC implementation fails the late
// case in any negative-offset zone and the early case in any positive-offset
// one — which means this check catches the bug wherever it is run, instead of
// only where someone thought to look.
check('late evening does not roll FORWARD (catches UTC impl west of Greenwich)',
  isoDay(new Date(2026, 7, 17, 23, 59)), '2026-08-17');
check('early morning does not roll BACK (catches UTC impl east of Greenwich)',
  isoDay(new Date(2026, 7, 17, 0, 1)), '2026-08-17');
check('midnight exactly', isoDay(new Date(2026, 7, 17, 0, 0)), '2026-08-17');
check('one minute to midnight', isoDay(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
// A picker hands back local midnight; storing then re-reading must be a no-op.
check('a picked day round-trips through storage',
  isoDay(new Date(2026, 7, 17, 0, 0)) === '2026-08-17'
    && daysUntilDay(isoDay(new Date(2026, 7, 17, 0, 0)), NOW) === 0, true);

check('a day inside the trip is kept', clampDay('2026-08-14', '2026-08-10', '2026-08-20'), '2026-08-14');
check('the first day is inside', clampDay('2026-08-10', '2026-08-10', '2026-08-20'), '2026-08-10');
check('the last day is inside', clampDay('2026-08-20', '2026-08-10', '2026-08-20'), '2026-08-20');
check('before clamps up', clampDay('1998-03-02', '2026-08-10', '2026-08-20'), '2026-08-10');
check('after clamps down', clampDay('2026-09-01', '2026-08-10', '2026-08-20'), '2026-08-20');
check('a trip with no dates does not clamp', clampDay('2026-09-01', null, null), '2026-09-01');

check('today', dayLabel('2026-08-17', NOW), 'Today');
check('yesterday', dayLabel('2026-08-16', NOW), 'Yesterday');
check('tomorrow', dayLabel('2026-08-18', NOW), 'Tomorrow');
check('an ordinary day gets a real date', /\d/.test(dayLabel('2026-08-12', NOW)), true);
check('an ordinary day is not "Today"', dayLabel('2026-08-12', NOW) === 'Today', false);
check('garbage is echoed, not blanked', dayLabel('not-a-day', NOW), 'not-a-day');

console.log(bad === 0 ? '\n  ✓ all cases behave\n' : `\n  ✗ ${bad} wrong\n`);
process.exit(bad === 0 ? 0 : 1);
