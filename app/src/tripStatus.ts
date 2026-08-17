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
