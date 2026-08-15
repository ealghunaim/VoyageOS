// One copy of "what tier is this user on", shared by every screen.
//
// The top bar renders everywhere, so a badge in it cannot fetch per screen —
// that would be a request per navigation, all returning the same row. This is
// a module-level cache with subscribers instead: fetched once after sign-in,
// refreshed deliberately after a purchase.
//
// NOT AN AUTHORITY. This exists to draw a badge. Anything that GATES a paid
// feature must ask the server at the moment it matters — the API owns the
// limit, and a cached tier is by definition a tier from before the webhook
// that might have changed it. Being briefly wrong here costs a wrong pill;
// being briefly wrong in a gate costs someone the thing they paid for.
import { useEffect, useState } from 'react';

import { getSubscription, Subscription } from './api';
import { onSignOut } from './auth';

let current: Subscription | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(s: Subscription | null) => void>();

function publish() {
  listeners.forEach(fn => fn(current));
}

/** Fetch the tier. Concurrent calls share one request — mount of several
 *  screens at once should not become several identical GETs. */
export function refreshSubscription(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = getSubscription()
    .then(s => { current = s; publish(); })
    .catch(() => { /* a failed read leaves the last known value in place */ })
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Drop the cache on sign-out, so the next account never inherits a badge. */
export function clearSubscription(): void {
  current = null;
  publish();
}

/** The cached row without subscribing. For the post-purchase poll, which
 *  needs to read the value it just refreshed rather than wait for a render. */
export function currentSubscription(): Subscription | null {
  return current;
}

// Registered once, at import. Without it the cache outlives the session and
// the next account to sign in on this device sees the previous person's tier
// in the top bar until something happens to refetch.
onSignOut(clearSubscription);

export function useSubscription(): Subscription | null {
  const [sub, setSub] = useState<Subscription | null>(current);
  useEffect(() => {
    listeners.add(setSub);
    if (!current) refreshSubscription();
    return () => { listeners.delete(setSub); };
  }, []);
  return sub;
}
