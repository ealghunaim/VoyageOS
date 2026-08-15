// The two decisions in the paywall that must not be got wrong, kept out of
// React so they can be exercised directly — see scripts/paywall_check.ts.
//
// Both exist because a mistake in either is silent and expensive: one would
// sell someone the wrong tier, the other would tell a paying customer their
// payment failed.

// ── which tier is this package? ────────────────────────────────────────────
//
// Mapped on the PRODUCT identifier, never the package identifier. Package
// identifiers are slots and are routinely wrong: this project's live offering
// has explorer on $rc_monthly, traveler on $rc_annual and voyager on
// $rc_lifetime, because the default template's slots were repurposed. Reading
// those would sell an annual plan that is monthly and a lifetime plan that is
// neither.
//
// This mirrors ENTITLEMENT_TO_TIER on the server. The server decides what a
// purchase GRANTS; this only decides what the screen SHOWS. They must agree,
// and if they ever disagree the server wins — which is why a purchase is
// always reconciled against the API afterwards rather than trusted locally.

export type Tier = 'explorer' | 'traveler' | 'voyager';

const PRODUCT_TO_TIER: Record<string, Tier> = {
  'com.ealghunaim.voyageos.explorer.monthly': 'explorer',
  'com.ealghunaim.voyageos.traveler.monthly': 'traveler',
  'com.ealghunaim.voyageos.voyager.monthly': 'voyager',
};

/** The tier this product sells, or null if we do not recognise it.
 *
 *  Null is the important case. An unrecognised product is skipped and logged,
 *  never guessed onto a tier — a wrong guess here charges someone for one
 *  plan and shows them another, and neither we nor they would notice until
 *  the entitlement did not match. A missing row on a paywall is a visible,
 *  harmless bug; a mislabelled one is a refund.
 */
export function tierForProduct(productId: string | null | undefined): Tier | null {
  if (!productId) return null;
  return PRODUCT_TO_TIER[productId] ?? null;
}

/** Rank, so tiers render in ladder order regardless of the order RevenueCat
 *  returns packages in. */
export const TIER_RANK: Record<Tier, number> = {
  explorer: 1, traveler: 2, voyager: 3,
};

// ── has the purchase landed on the server yet? ─────────────────────────────
//
// A purchase completes on the device before our webhook necessarily has. The
// SDK saying "purchased" and the API saying "explorer" are different facts,
// and only the second one gates anything.

export type PollState =
  | { done: false }
  | { done: true; outcome: 'active' }
  | { done: true; outcome: 'pending' };

/** Whether to keep polling, and what to tell the user when we stop.
 *
 *  THE TIMEOUT IS NOT A FAILURE. The money left their account; the only thing
 *  we are waiting on is our own webhook. Reporting failure to someone who has
 *  just paid is the worst outcome in this feature — worse than a slow spinner,
 *  worse than a stale badge — because it invites them to pay twice or demand a
 *  refund for something that worked.
 *
 *  So there is no 'failed' outcome here at all. It is either confirmed active,
 *  or confirmed received-and-pending. The type makes the wrong message
 *  unrepresentable rather than merely discouraged.
 */
export function pollDecision(args: {
  serverTier: string | null;
  tierBefore: string;
  elapsedMs: number;
  timeoutMs: number;
}): PollState {
  const { serverTier, tierBefore, elapsedMs, timeoutMs } = args;
  // Any change from what we had is the webhook landing. Compared against the
  // tier BEFORE the purchase rather than the expected one: an upgrade, a
  // resubscribe after lapsing, and a store-side substitution all count, and
  // waiting for one exact string would hang on all three.
  if (serverTier && serverTier !== tierBefore) {
    return { done: true, outcome: 'active' };
  }
  if (elapsedMs >= timeoutMs) {
    return { done: true, outcome: 'pending' };
  }
  return { done: false };
}

/** What to say when polling stops. Kept next to the decision so the two
 *  cannot drift — the whole point is that 'pending' never reads as failure. */
export const POLL_COPY = {
  active: 'Your plan is active.',
  pending: 'Payment received. Your plan will activate shortly.',
} as const;
