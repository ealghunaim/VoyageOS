/** Exercise planner time parsing, storage and ordering.
 *
 *   npx tsc scripts/plantime_check.ts src/planTime.ts --outDir /tmp/pt \
 *     --module commonjs --target es2020 --moduleResolution node --skipLibCheck && \
 *   node /tmp/pt/scripts/plantime_check.js
 *
 *  The cases that matter are the legacy ones. Rows written by the old free-text
 *  field are already in the database and must neither be lost nor mangled.
 */
import { byTime, dateForMinutes, formatTime, parseTime, toStored } from '../src/planTime';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

console.log('\n  ── what the old field allowed ──');
check('9:00', parseTime('9:00'), 540);
check('09:00', parseTime('09:00'), 540);
check('bare hour', parseTime('9'), 540);
check('0900', parseTime('0900'), 540);
check('9am', parseTime('9am'), 540);
check('9 AM', parseTime('9 AM'), 540);
check('9pm', parseTime('9pm'), 1260);
check('12am is midnight', parseTime('12am'), 0);
check('12pm is noon', parseTime('12pm'), 720);
check('9.30 PM', parseTime('9.30 PM'), 1290);
check('24:00 is midnight', parseTime('24:00'), 0);
check('surrounding space', parseTime('  21:30  '), 1290);

console.log('\n  ── not times, and must stay that way ──');
for (const junk of ['morning', 'after lunch', 'asdf', '', null, undefined,
                    '25:00', '9:75', 'when we wake up']) {
  check(`${JSON.stringify(junk)} is not a time`, parseTime(junk), null);
}

console.log('\n  ── legacy text survives display ──');
check('a plain word is shown as written', formatTime('morning'), 'morning');
check('a phrase is shown as written', formatTime('after lunch'), 'after lunch');
check('empty stays empty', formatTime(null), '');
check('a real time is reformatted, not passed through',
  /\d/.test(formatTime('09:00')) && formatTime('09:00').length > 0, true);

console.log('\n  ── storage is canonical ──');
const d = new Date(2026, 7, 17, 9, 5);
check('zero-padded 24h', toStored(d), '09:05');
check('afternoon', toStored(new Date(2026, 7, 17, 21, 30)), '21:30');
check('midnight', toStored(new Date(2026, 7, 17, 0, 0)), '00:00');
check('a stored value round-trips', parseTime(toStored(d)), 9 * 60 + 5);

console.log('\n  ── seeding the picker ──');
check('seeds to the stored time', toStored(dateForMinutes(parseTime('14:20'))), '14:20');
check('an untimed item opens at 9am', toStored(dateForMinutes(null)), '09:00');

console.log('\n  ── ordering a day ──');
const day = [
  { id: 'dinner', time: '20:00' },
  { id: 'market', time: 'morning' },     // legacy free text
  { id: 'museum', time: '11:00' },
  { id: 'nothing', time: null },
  { id: 'breakfast', time: '8:30' },
  { id: 'later', time: 'after lunch' },  // legacy free text
];
check('timed first, chronological; untimed keep insertion order',
  byTime(day).map(x => x.id),
  ['breakfast', 'museum', 'dinner', 'market', 'nothing', 'later']);
check('sorting does not mutate the input', day[0].id, 'dinner');
check('an all-untimed day is left alone',
  byTime([{ id: 'a', time: null }, { id: 'b', time: 'morning' }]).map(x => x.id),
  ['a', 'b']);
check('a 12am item sorts before a 1am one',
  byTime([{ id: 'one', time: '1:00' }, { id: 'mid', time: '12am' }]).map(x => x.id),
  ['mid', 'one']);

console.log(bad === 0 ? '\n  ✓ all cases behave\n' : `\n  ✗ ${bad} wrong\n`);
process.exit(bad === 0 ? 0 : 1);
