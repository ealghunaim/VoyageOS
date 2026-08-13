/** Reading our own user id out of an access token.
 *
 *  Its own module so it can be exercised directly — scripts/jwt_check.ts.
 *  auth.ts cannot be imported outside the app (it pulls in expo-secure-store),
 *  and this is the function that decides which RevenueCat customer a purchase
 *  belongs to. Getting it wrong means the purchase succeeds and the tier lands
 *  on nobody: the user pays and stays free, with no error anywhere.
 *
 *  NOT A SECURITY BOUNDARY. The signature is deliberately not verified. This
 *  token comes out of our own keychain and is read only for our own id; the
 *  server verifies it on every request. A client that lied to itself here
 *  would break nothing but its own subscription mapping.
 */
export function userIdFromToken(jwt: string): string {
  try {
    const payload = (jwt ?? '').split('.')[1];
    if (!payload) return '';
    // base64url → base64, then restore the padding JWTs omit.
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const decode = (globalThis as any).atob;
    if (typeof decode !== 'function') return '';
    const sub = JSON.parse(decode(padded))?.sub;
    return typeof sub === 'string' ? sub : '';
  } catch {
    // Any malformed token answers '' rather than throwing. Callers treat ''
    // as "do not configure RevenueCat", which is the safe outcome.
    return '';
  }
}
