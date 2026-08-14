// RevenueCat, phase 1b — the plumbing only.
//
// This module deliberately does NOT import ./auth. The caller passes the user
// id in. auth.ts calls signOutOfPurchases() on the way out, and a two-way
// import between them would be a cycle in the two modules the app cannot
// start without.
//
// IDENTITY IS THE WHOLE POINT
//
// Purchases is configured WITH our Supabase user id rather than configured
// first and logged in after. If it starts without one, RevenueCat mints an
// anonymous $RCAnonymousID:… and a purchase made in that window belongs to a
// ghost — recoverable only through aliasing and a TRANSFER event. Configuring
// with the id means the webhook's app_user_id IS our user id, which is what
// makes "whose purchase is this" a lookup rather than a guess.
//
// The failure this avoids has no error message: the purchase succeeds, Apple
// charges the card, and the tier lands on nobody. The user pays and stays
// free.
//
// NOT HERE, ON PURPOSE
//
// No paywall UI, no react-native-purchases-ui, no tier comparison. Phase 3
// owns how this is presented; 1b only proves money can move and lands on the
// right account. Adding the UI package later costs another native rebuild,
// which is the honest price of not building Phase 3 early.
import { Platform } from 'react-native';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import * as CFG from './config';

const IOS_KEY: string = (CFG as any).REVENUECAT_IOS_KEY ?? '';

/** Whether configure() has succeeded. Every other call checks it: the SDK
 *  throws if used before configuration, and a throw during a purchase flow is
 *  a worse experience than a disabled button. */
let ready = false;

/** Who we configured for, so a session change can be detected rather than
 *  assumed. */
let configuredFor = '';

export function isReady(): boolean { return ready; }

/** Start RevenueCat for a signed-in user.
 *
 *  Safe to call repeatedly — reconfiguring for the same user is a no-op, and
 *  for a different one it switches identity via logIn rather than leaving the
 *  previous customer attached.
 *
 *  Returns false and does nothing when there is no user id or no API key.
 *  Both are "cannot attribute a purchase", and it is better to have no
 *  purchase flow at all than one that charges the wrong account.
 */
export async function configurePurchases(userId: string): Promise<boolean> {
  if (!userId) {
    // getUserId() returns '' when signed out or when a legacy session could
    // not be resolved. Configuring anonymously here is exactly the ghost-
    // customer case, so we decline.
    console.log('[purchases] no user id — not configuring');
    return false;
  }
  if (!IOS_KEY) {
    console.log('[purchases] no API key in config — not configuring');
    return false;
  }
  if (Platform.OS !== 'ios') {
    // Android needs its own key and a Play Console product set; neither
    // exists yet. Silently configuring with the iOS key would fail at
    // purchase time instead of here.
    return false;
  }

  try {
    if (ready && configuredFor === userId) return true;
    if (ready && configuredFor !== userId) {
      // Same app session, different account. logIn moves the SDK to the new
      // identity; without it the next purchase is filed under the old one.
      await Purchases.logIn(userId);
      configuredFor = userId;
      return true;
    }
    await Purchases.configure({ apiKey: IOS_KEY, appUserID: userId });
    ready = true;
    configuredFor = userId;
    console.log('[purchases] configured');
    return true;
  } catch (e) {
    // Never fatal. A failure here must not stop the app launching — the user
    // simply cannot buy anything this session.
    console.log('[purchases] configure failed:', String(e));
    ready = false;
    return false;
  }
}

/** Detach the current customer. Called from auth.signOut().
 *
 *  MUST run on every sign-out path. On a shared device, skipping it leaves the
 *  next account attached to the previous person's entitlements — they would
 *  receive a tier they never bought, and we would have no record of why.
 *
 *  Never throws: signing out has to succeed even if RevenueCat is unhappy.
 */
export async function signOutOfPurchases(): Promise<void> {
  configuredFor = '';
  if (!ready) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.log('[purchases] logOut failed:', String(e));
  }
}

/** The offerings to show, or null. Null means "no paywall": no configuration,
 *  no products set up yet, or the store is unreachable. */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!ready) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    console.log('[purchases] getOfferings failed:', String(e));
    return null;
  }
}

export type PurchaseResult =
  | { status: 'purchased' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Buy a package.
 *
 *  Cancellation is a first-class result, not an error. A user backing out of
 *  the Apple sheet is the most common outcome of opening a paywall, and
 *  showing them an error message for it reads as a bug.
 *
 *  The caller must NOT treat 'purchased' as "the tier is now active". Our
 *  server is the authority, and it learns from the webhook, which may land
 *  after this resolves. Re-read GET /v1/subscription rather than trusting
 *  CustomerInfo — otherwise the app and the API can disagree about what the
 *  user just bought.
 */
export async function purchase(pkg: PurchasesPackage): Promise<PurchaseResult> {
  if (!ready) return { status: 'error', message: 'Purchases are unavailable right now.' };
  try {
    await Purchases.purchasePackage(pkg);
    return { status: 'purchased' };
  } catch (e: any) {
    if (e?.userCancelled) return { status: 'cancelled' };
    return { status: 'error', message: e?.message ?? 'The purchase could not be completed.' };
  }
}

/** Restore previous purchases.
 *
 *  In 1b rather than Phase 3 because App Review rejects apps that sell
 *  subscriptions without a restore path — and because a user reinstalling on
 *  a new phone has genuinely paid and would otherwise be stuck.
 */
export async function restore(): Promise<boolean> {
  if (!ready) return false;
  try {
    await Purchases.restorePurchases();
    return true;
  } catch (e) {
    console.log('[purchases] restore failed:', String(e));
    return false;
  }
}
