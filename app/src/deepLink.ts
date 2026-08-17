// Reading what Supabase sends back on a recovery link.
//
// Its own module so it can be exercised directly — scripts/deeplink_check.ts.
// This is the join between an email and a signed-in session, and every failure
// mode here is silent: a link that parses to nothing looks identical to a link
// the user never tapped.
//
// THE SHAPE, AND WHY THE TOKENS ARE IN THE FRAGMENT
//
// The email contains a Supabase URL, not ours. Tapping it hits
// /auth/v1/verify?token=…&type=recovery&redirect_to=voyageos://reset-password,
// Supabase validates the one-time token, and only then redirects to our scheme
// with the real session attached:
//
//   voyageos://reset-password#access_token=…&refresh_token=…&type=recovery
//
// After the # — a fragment, not a query. That is deliberate on their part:
// fragments are not sent to servers and stay out of proxy and referrer logs.
// It also means anything reading these as query parameters finds nothing,
// which is the mistake this module exists to make impossible.
//
// FAILURES ARRIVE THE SAME WAY
//
// An expired or reused link redirects to the same scheme with an error
// fragment instead of tokens. That is not an edge case — recovery links are
// single-use and time-limited, so "I tapped it twice" and "I opened it an hour
// later" are both ordinary. They have to produce a message, not a blank screen.

export type AuthLink =
  | { kind: 'recovery'; accessToken: string; refreshToken: string }
  | { kind: 'error'; code: string; message: string };

/** Split a `k=v&k=v` blob, tolerating an empty string. */
function params(blob: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of (blob || '').split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = i < 0 ? pair : pair.slice(0, i);
    const v = i < 0 ? '' : pair.slice(i + 1);
    if (!k) continue;
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      out[k] = v;                      // malformed escapes: keep the raw value
    }
  }
  return out;
}

/** What this link means, or null if it is not one of ours.
 *
 *  Reads BOTH the fragment and the query. Supabase puts recovery tokens in the
 *  fragment, but errors have been observed in either depending on where the
 *  redirect was rejected, and a caller should not have to know which.
 */
export function parseAuthLink(url: string | null | undefined): AuthLink | null {
  if (!url || typeof url !== 'string') return null;

  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const queryPart = url.includes('?')
    ? url.slice(url.indexOf('?') + 1, url.includes('#') ? url.indexOf('#') : undefined)
    : '';
  const p = { ...params(queryPart), ...params(hash) };   // fragment wins

  // Errors first. A link carrying both an error and stale tokens is not a
  // success — treating it as one would sign someone in on a dead link.
  if (p.error || p.error_code) {
    return {
      kind: 'error',
      code: p.error_code || p.error || 'unknown',
      message: p.error_description || 'That link is no longer valid.',
    };
  }

  if (p.access_token && p.refresh_token) {
    // `type` is not required to equal 'recovery': the same shape arrives from
    // magic links and email confirmations, and all of them mean "here is a
    // session". Demanding an exact value would reject links that work.
    return { kind: 'recovery', accessToken: p.access_token, refreshToken: p.refresh_token };
  }

  return null;
}
