// When is a trip, exactly once.
//
// This existed in two places that disagreed. The Home list split trips on
// END date — correct — while the badge on each card computed "past" from the
// START date, so a trip that began yesterday and runs another week appeared in
// Upcoming and was labelled "past" at the same time. Two definitions of the
// same word in one file, and the wrong one was the one users read.
//
// The rule, stated once: a trip is finished when its LAST day has passed, or
// when it has been explicitly completed. Between its first and last day it is
// in progress, which is a state the old code had no name for — and that
// namelessness is what let it be lumped in with "past".
//
// Dates are compared as calendar days in the traveller's own timezone, not as
// instants. A trip ending "today" is not over at 00:01, and someone in Tokyo
// should not see a trip end early because a server is in UTC.

export type TripWhen = 'upcoming' | 'in_progress' | 'finished';

type TripLike = {
  start_date: string;
  end_date: string;
  status?: string | null;
};

/** Local midnight for a YYYY-MM-DD string.
 *
 *  `new Date("2026-08-17")` parses as UTC midnight, which is the previous
 *  evening west of Greenwich — the classic off-by-one that makes a trip end a
 *  day early. Splitting the parts forces local time.
 */
function localDay(iso: string): number {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d).getTime();
}

function todayLocal(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** Whole days from today until `iso`. Negative once it is in the past. */
export function daysUntilDay(iso: string, now: Date = new Date()): number {
  const target = localDay(iso);
  if (isNaN(target)) return 0;
  return Math.round((target - todayLocal(now)) / 86400000);
}

/** A Date as YYYY-MM-DD in local time — the inverse of localDay(). */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A day pinned inside the trip.
 *
 *  Mirrors entry_date_for() in api/notes/router.py. Both ends clamp rather
 *  than reject: at either edge the intent is obvious, and the server clamps
 *  anyway — doing it here too means the screen shows what will actually be
 *  stored instead of briefly showing something else.
 */
export function clampDay(iso: string, start?: string | null, end?: string | null): string {
  if (start && iso < start) return start;
  if (end && iso > end) return end;
  return iso;
}

/** How a day is written above a journal entry. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  // Parseability is checked FIRST. daysUntilDay() answers 0 for anything it
  // cannot read, so asking it before this would label a broken date "Today" —
  // a wrong date stated confidently, which is worse than an ugly one.
  const d = localDay(iso);
  if (isNaN(d)) return iso;
  const n = daysUntilDay(iso, now);
  if (n === 0) return 'Today';
  if (n === -1) return 'Yesterday';
  if (n === 1) return 'Tomorrow';
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

/** The trip's days, in order: day 1 is the start date.
 *
 *  Walked with setDate(), NOT by adding 86400000ms. A day is not always
 *  86400000ms long — the ones that end a DST period are an hour longer, and
 *  ms-arithmetic drifts an hour per transition until it crosses midnight and
 *  starts repeating dates. The planner did exactly this, and a week over the
 *  US November transition showed Sunday 1 November twice and labelled every
 *  following day one early.
 *
 *  Capped, because `days` drives a rendered list and a mistyped end date a
 *  decade out should not try to draw four thousand cards.
 */
export function tripDays(startDate: string, endDate: string, cap = 60):
    { k: number; iso: string; date: Date }[] {
  const start = localDay(startDate);
  const end = localDay(endDate);
  if (isNaN(start)) return [];
  const span = isNaN(end) ? 1 : Math.max(1, Math.round((end - start) / 86400000) + 1);
  const out: { k: number; iso: string; date: Date }[] = [];
  const d = new Date(start);
  for (let k = 1; k <= Math.min(span, cap); k++) {
    out.push({ k, iso: isoDay(d), date: new Date(d) });
    d.setDate(d.getDate() + 1);   // calendar-aware; survives DST
  }
  return out;
}

export function classify(trip: TripLike, now: Date = new Date()): TripWhen {
  // An explicit completion wins over the calendar: someone who has debriefed a
  // trip has told us it is over, whatever the dates say.
  if (trip.status === 'completed') return 'finished';
  const end = daysUntilDay(trip.end_date, now);
  if (!isNaN(end) && end < 0) return 'finished';
  const start = daysUntilDay(trip.start_date, now);
  return start > 0 ? 'upcoming' : 'in_progress';
}

/** The words on the card. */
export function whenLabel(trip: TripLike, now: Date = new Date()): string {
  const where = classify(trip, now);
  if (where === 'finished') return 'finished';
  if (where === 'in_progress') {
    // Departure day is in progress, but "today" is the word that earns its
    // place on the card — it is the one day the traveller needs to act on.
    if (daysUntilDay(trip.start_date, now) === 0) return 'today';
    const left = daysUntilDay(trip.end_date, now);
    if (left === 0) return 'last day';
    return left === 1 ? 'ends tomorrow' : `${left} days left`;
  }
  const n = daysUntilDay(trip.start_date, now);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
}

/** A finished trip nobody has debriefed yet.
 *
 *  Only finished trips qualify: nudging someone to reflect on a trip they are
 *  still on would be both wrong and slightly insulting.
 */
export function needsDebrief(trip: TripLike, now: Date = new Date()): boolean {
  return classify(trip, now) === 'finished' && trip.status !== 'completed';
}

/** Sorted for the tab they are in: soonest first while they are ahead of you,
 *  most recent first once they are behind. */
export function sortForTab<T extends TripLike>(trips: T[], tab: TripWhen | 'all',
                                               now: Date = new Date()): T[] {
  const rank: Record<TripWhen, number> = { in_progress: 0, upcoming: 1, finished: 2 };
  return [...trips].sort((a, b) => {
    if (tab === 'all') {
      const d = rank[classify(a, now)] - rank[classify(b, now)];
      if (d !== 0) return d;
    }
    const finished = classify(a, now) === 'finished';
    return finished
      ? b.start_date.localeCompare(a.start_date)
      : a.start_date.localeCompare(b.start_date);
  });
}
