/** Exercise the recovery-link parser.
 *
 *   npx tsc scripts/deeplink_check.ts src/deepLink.ts --outDir /tmp/dl \
 *     --module commonjs --target es2020 --moduleResolution node --skipLibCheck && \
 *   node /tmp/dl/scripts/deeplink_check.js
 *
 *  The error cases matter as much as the success one: recovery links are
 *  single-use and expire, so "tapped twice" and "opened an hour later" are
 *  ordinary, and both must produce a message rather than a blank screen.
 */
import { parseAuthLink } from '../src/deepLink';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
};

console.log('\n── the real success shape (tokens in the FRAGMENT) ──');
check('recovery link',
  parseAuthLink('voyageos://reset-password#access_token=AAA&refresh_token=BBB&expires_in=3600&token_type=bearer&type=recovery'),
  { kind: 'recovery', accessToken: 'AAA', refreshToken: 'BBB' });

check('order does not matter',
  parseAuthLink('voyageos://reset-password#type=recovery&refresh_token=BBB&access_token=AAA'),
  { kind: 'recovery', accessToken: 'AAA', refreshToken: 'BBB' });

check('magic-link/confirm shape also yields a session',
  parseAuthLink('voyageos://reset-password#access_token=AAA&refresh_token=BBB&type=signup'),
  { kind: 'recovery', accessToken: 'AAA', refreshToken: 'BBB' });

console.log('\n── expired / reused links must explain themselves ──');
check('otp_expired',
  parseAuthLink('voyageos://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'),
  { kind: 'error', code: 'otp_expired', message: 'Email link is invalid or has expired' });

check('error in the QUERY rather than the fragment',
  parseAuthLink('voyageos://reset-password?error=access_denied&error_code=otp_expired&error_description=expired'),
  { kind: 'error', code: 'otp_expired', message: 'expired' });

check('error with no description still has a message',
  (parseAuthLink('voyageos://reset-password#error=access_denied') as any)?.message,
  'That link is no longer valid.');

console.log('\n── an error alongside stale tokens is NOT a success ──');
check('error wins over tokens',
  (parseAuthLink('voyageos://reset-password#error=access_denied&error_code=otp_expired&access_token=AAA&refresh_token=BBB') as any)?.kind,
  'error');

console.log('\n── not one of ours ──');
for (const [label, url] of [
  ['half a session (no refresh token)', 'voyageos://reset-password#access_token=AAA'],
  ['half a session (no access token)',  'voyageos://reset-password#refresh_token=BBB'],
  ['bare scheme',                        'voyageos://reset-password'],
  ['empty fragment',                     'voyageos://reset-password#'],
  ['unrelated deep link',                'voyageos://trip/123'],
  ['the dev-client launcher URL',        'exp+voyageos://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'],
  ['empty string', ''], ['null', null as any], ['undefined', undefined as any],
  ['not a string', 42 as any],
] as const) {
  check(`${label} → null`, parseAuthLink(url as any), null);
}

console.log('\n── encoding ──');
check('percent-encoded description is decoded',
  (parseAuthLink('voyageos://reset-password#error=x&error_code=y&error_description=Email%20link%20is%20invalid') as any)?.message,
  'Email link is invalid');
check('a token containing an = survives',
  (parseAuthLink('voyageos://reset-password#access_token=aa.bb==&refresh_token=cc') as any)?.accessToken,
  'aa.bb==');

console.log(bad === 0 ? '\n  ✓ all cases behave\n' : `\n  ✗ ${bad} wrong\n`);
process.exit(bad === 0 ? 0 : 1);
