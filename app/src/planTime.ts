// Times on planner items.
//
// The column is free text (0007: `time text`), filled until now by a 54-pixel
// input with the placeholder "9:00" and no validation whatsoever. Whatever was
// typed was stored and rendered verbatim, so a day's plan could read
//
//    9:00 · Breakfast      9 · Museum      morning · Market      asdf · Dinner
//
// and sort by insertion order, because nothing ever read those strings as
// times. A picker fixes what goes in from here on. It cannot fix what is
// already stored, and deleting or rewriting those rows in a migration would
// throw away something the traveller typed on purpose — "morning" is a
// perfectly good plan.
//
// So: parse tolerantly, store canonically, and pass through anything that is
// not a time. An unparseable legacy string still displays exactly as written
// and simply sorts after the times, with the other untimed items.

/** Canonical stored form. New writes only ever use this. */
export function toStored(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Minutes past midnight, or null when this is not a time at all.
 *
 *  Deliberately generous about legacy input — "9", "9am", "0900", "9.30 PM"
 *  were all typeable into the old field and all meant something.
 */
export function parseTime(raw: string | null | undefined): number | null {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return null;

  const m = s.match(/^(\d{1,2})[:.\s]?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;

  let h = parseInt(m[1], 10);
  // "0900" arrives as a 4-digit run: the regex takes 09 and 00 because the
  // separator is optional. "930" is genuinely ambiguous (9:30 or 09:30?) and
  // the regex reads it as 9:30, which is the reading a person intends.
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const suffix = (m[3] || '').replace(/\./g, '');

  if (suffix === 'pm' && h < 12) h += 12;
  if (suffix === 'am' && h === 12) h = 0;
  // 24:00 is a real way to write midnight-at-the-end-of-the-day; nothing above
  // it is.
  if (h === 24 && min === 0) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** A Date carrying `mins` past midnight, for seeding the picker. */
export function dateForMinutes(mins: number | null): Date {
  const d = new Date();
  d.setHours(mins == null ? 9 : Math.floor(mins / 60), mins == null ? 0 : mins % 60, 0, 0);
  return d;
}

/** What the row shows.
 *
 *  Real times follow the device's own convention — a traveller who reads 9 PM
 *  should not be shown 21:00 because the storage format happens to be 24-hour.
 *  Anything unparseable is returned untouched: it is the traveller's own words.
 */
export function formatTime(raw: string | null | undefined): string {
  const mins = parseTime(raw);
  if (mins == null) return (raw ?? '').trim();
  try {
    return dateForMinutes(mins).toLocaleTimeString(undefined, {
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    // If Intl is unavailable the stored 24-hour form is still readable, which
    // is a better outcome than an empty slot where a time should be.
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

type Timed = { time?: string | null; seq?: number | null; created_at?: string | null };

/** Chronological within a day; untimed items keep their own order at the end.
 *
 *  Untimed last rather than first: a plan with no clock on it is a "sometime
 *  today", and floating those above a 09:00 would misrepresent the day.
 */
export function byTime<T extends Timed>(items: T[]): T[] {
  return [...items]
    .map((it, i) => ({ it, i, t: parseTime(it.time) }))
    .sort((a, b) => {
      if (a.t == null && b.t == null) return a.i - b.i;
      if (a.t == null) return 1;
      if (b.t == null) return -1;
      return a.t - b.t || a.i - b.i;
    })
    .map(x => x.it);
}
