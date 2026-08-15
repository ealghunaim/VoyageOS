// Links Apple requires on a paywall.
//
// Both must be reachable from the purchase screen before anything can be
// submitted for review — this is a gate, not a nicety. A release-safety test
// asserts neither is still a placeholder, so an unfilled link cannot ship
// quietly the way an unset flag once could.

/** Apple's standard EULA. Permitted in place of writing your own, and what
 *  this app uses. */
export const TERMS_URL =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Ours, and it has to be ours — Apple has no standard privacy policy to
 *  borrow, because the policy describes what WE collect. */
export const PRIVACY_URL = 'PLACEHOLDER_PRIVACY_URL';
