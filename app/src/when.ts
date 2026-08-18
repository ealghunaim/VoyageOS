// Showing a moment to a traveller.
//
// The reminder rows and the journal used bare `toLocaleString()`, which is two
// problems in one call.
//
// SECONDS. It renders "6:00:00 PM". A reminder is set to the minute and fires
// to the minute; the seconds are always :00 and say nothing. They are noise in
// the one place a glance has to be quick.
//
// THE AMBIGUOUS DATE. It renders the date numerically — "08/09/2026" is the
// 8th of September to most of the world and the 9th of August to the US, and
// nothing on screen says which. A tester hit exactly this. The locale is
// respected, but respecting it does not help when both readings are plausible
// and the reader cannot tell which locale the phone is using.
//
// Naming the month removes the ambiguity outright rather than hoping the
// reader knows the convention. "9 Aug" and "Aug 9" are both unmistakable, and
// which one appears still follows the device.

/** Date and time, no seconds, month by name. */
export function formatStamp(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit',
  });
}

/** Time alone, no seconds — for rows already grouped under a day. */
export function formatClock(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
