/** Exercise the user-id extraction.
 *
 *   npx tsc scripts/jwt_check.ts src/jwt.ts --outDir /tmp/jwtcheck \
 *     --module commonjs --target es2020 --moduleResolution node --skipLibCheck && \
 *   node /tmp/jwtcheck/scripts/jwt_check.js
 *
 *  The malformed cases matter most: every one must answer '' rather than
 *  throw, because '' is what tells the caller not to configure RevenueCat.
 *  A throw here happens during session load, which is app launch.
 */
import { userIdFromToken } from '../src/jwt';

const UID = '11111111-1111-4111-8111-111111111111';

const b64url = (o: unknown) =>
  Buffer.from(JSON.stringify(o)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const token = (payload: unknown) => `header.${b64url(payload)}.signature`;

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = got === want;
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

console.log('\n── a real token shape ──');
check('plain sub', userIdFromToken(token({ sub: UID, role: 'authenticated' })), UID);
check('sub alongside many claims',
  userIdFromToken(token({ aud: 'authenticated', exp: 1893456000, sub: UID, email: 'a@b.c' })), UID);

console.log('\n── padding, which JWTs strip ──');
// Exercise every remainder-mod-4 so a padding bug cannot hide behind one case.
for (const pad of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
  check(`sub with filler "${pad}"`, userIdFromToken(token({ sub: UID, x: pad })), UID);
}

console.log('\n── base64url characters ──');
// '?' and '~' in a value push - and _ into the encoding.
const tricky = '??~~??~~';
check('payload containing - and _ when encoded',
  userIdFromToken(token({ sub: UID, note: tricky })), UID);

console.log('\n── malformed input must return "" and never throw ──');
for (const [label, input] of [
  ['empty string', ''],
  ['not a jwt', 'garbage'],
  ['only a header', 'header'],
  ['header and dot', 'header.'],
  ['undefined-ish', undefined as any],
  ['null-ish', null as any],
  ['payload is not base64', 'header.!!!!.sig'],
  ['payload is not json', `header.${Buffer.from('nope').toString('base64')}.sig`],
  ['json without sub', token({ email: 'a@b.c' })],
  ['sub is a number', token({ sub: 12345 })],
  ['sub is null', token({ sub: null })],
  ['sub is an object', token({ sub: { id: UID } })],
] as const) {
  let threw = false;
  let got: string | undefined;
  try { got = userIdFromToken(input as string); } catch { threw = true; }
  const ok = !threw && got === '';
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${threw ? '  THREW' : `  → ${JSON.stringify(got)}`}`);
}

console.log(bad === 0 ? '\n  ✓ all cases behave\n' : `\n  ✗ ${bad} wrong\n`);
process.exit(bad === 0 ? 0 : 1);
