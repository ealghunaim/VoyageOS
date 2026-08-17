// VoyageOS auth — Supabase Auth over plain REST (no SDK), tokens in the
// phone's encrypted keychain via expo-secure-store. The publishable key is
// designed to ship in apps; sessions are what we protect.
import * as SecureStore from 'expo-secure-store';
import * as CFG from './config';
import { userIdFromToken } from './jwt';
import { signOutOfPurchases } from './purchases';

const SB_URL: string = (CFG as any).SUPABASE_URL ?? '';
const SB_KEY: string = (CFG as any).SUPABASE_ANON_KEY ?? '';

let access = '';
let refreshTok = '';
let expiresAt = 0; // epoch seconds
let email = '';
let userId = '';

const K = { a: 'vo_access', r: 'vo_refresh', e: 'vo_exp', m: 'vo_email', u: 'vo_uid' };

function headers() {
  return { apikey: SB_KEY, 'Content-Type': 'application/json' };
}

async function persist(json: any): Promise<void> {
  access = json.access_token ?? '';
  refreshTok = json.refresh_token ?? '';
  expiresAt = Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600);
  await SecureStore.setItemAsync(K.a, access);
  await SecureStore.setItemAsync(K.r, refreshTok);
  await SecureStore.setItemAsync(K.e, String(expiresAt));
  if (json.user?.email) { email = json.user.email; await SecureStore.setItemAsync(K.m, email); }
  // The refresh-token response does not always carry `user`, so fall back to
  // the token itself rather than clearing an id we already knew.
  const id = json.user?.id ?? userIdFromToken(access);
  if (id) { userId = id; await SecureStore.setItemAsync(K.u, id); }
}

export function hasAuthKeys(): boolean {
  return !!(SB_URL && SB_KEY);
}

export function getToken(): string {
  return expiresAt > Date.now() / 1000 + 30 ? access : '';
}

export async function loadSession(): Promise<'authed' | 'anon' | 'nokeys'> {
  if (!hasAuthKeys()) return 'nokeys';
  access = (await SecureStore.getItemAsync(K.a)) ?? '';
  refreshTok = (await SecureStore.getItemAsync(K.r)) ?? '';
  expiresAt = Number((await SecureStore.getItemAsync(K.e)) ?? 0);
  email = (await SecureStore.getItemAsync(K.m)) ?? '';
  userId = (await SecureStore.getItemAsync(K.u)) ?? '';
  // Pre-vo_uid session: recover the id from the token and write it back, so
  // this only ever happens once per install.
  if (!userId && access) {
    userId = userIdFromToken(access);
    if (userId) await SecureStore.setItemAsync(K.u, userId);
  }
  if (!refreshTok) return 'anon';
  if (getToken()) return 'authed';
  return (await refreshSession()) ? 'authed' : 'anon';
}

export async function refreshSession(): Promise<boolean> {
  if (!refreshTok) return false;
  try {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ refresh_token: refreshTok }),
    });
    const json = await res.json();
    if (!res.ok || !json.access_token) { await signOut(); return false; }
    await persist(json);
    return true;
  } catch { return false; }
}

function authError(json: any): string {
  return json?.error_description || json?.msg || json?.message || 'Authentication failed.';
}

export async function signIn(email: string, password: string): Promise<void> {
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error(authError(json));
  await persist(json);
}

export async function signUp(email: string, password: string): Promise<'authed' | 'confirm'> {
  const res = await fetch(`${SB_URL}/auth/v1/signup`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(authError(json));
  if (json.access_token) { await persist(json); return 'authed'; }
  return 'confirm'; // email confirmation is enabled — check the inbox
}

/** Run something on every sign-out, from any path.
 *
 *  A registry rather than a direct call because the things that need to react
 *  — the subscription cache, for one — import api.ts, which imports this
 *  file. Importing them back would be a cycle in the modules the app cannot
 *  start without. Callers register; auth stays dependency-free.
 */
type SignOutHook = () => void;
const signOutHooks: SignOutHook[] = [];
export function onSignOut(fn: SignOutHook): void { signOutHooks.push(fn); }

export function getEmail(): string { return email; }

/** Our Supabase user id, or '' when signed out.
 *
 *  RevenueCat is configured with this, which is what lets the webhook tell
 *  whose purchase it is. Callers MUST treat '' as "do not configure": handing
 *  RevenueCat an empty or guessed id means the purchase succeeds and the tier
 *  lands on nobody — the user pays and stays free, with no error anywhere.
 */
export function getUserId(): string { return userId; }

/** Confirm the current user's password, for a destructive action.
 *
 *  Checked against Supabase DIRECTLY, exactly as sign-in does. The password
 *  never reaches the VoyageOS API — deleting an account is an ordinary
 *  authenticated call, and adding a route that accepts a plaintext password
 *  would create a credential path where none needs to exist.
 *
 *  Answers true/false rather than throwing: the caller shows "that password
 *  is not right", and a network failure is indistinguishable from a wrong
 *  password from the user's point of view — both mean "we could not confirm
 *  it, nothing has happened".
 */
export async function verifyPassword(password: string): Promise<boolean> {
  if (!email || !password) return false;
  try {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    return !!(res.ok && json.access_token);
  } catch {
    return false;
  }
}

/** Ask Supabase to email a recovery link.
 *
 *  Answers nothing about whether the address exists — deliberately. The caller
 *  shows the same message either way, because a reset form that distinguishes
 *  "sent" from "no such account" is an account-enumeration oracle: anyone can
 *  learn who has an account by typing addresses into it.
 *
 *  Throws only on transport or rate-limit failure, which the caller maps to a
 *  retry message.
 */
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const res = await fetch(
    `${SB_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
    { method: 'POST', headers: headers(), body: JSON.stringify({ email }) },
  );
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error_description || j.msg || j.message || msg; } catch {}
    throw new Error(msg);
  }
}

/** Adopt the session a recovery link hands us.
 *
 *  The link has already proven the person controls the mailbox, so Supabase
 *  returns a real session — this stores it exactly as sign-in would, which is
 *  what lets the next call (setting the new password) authenticate.
 *
 *  Note this signs them IN before they have chosen a password. That is how
 *  Supabase recovery works and is safe: the one-time token was the proof, and
 *  it is spent.
 */
export async function adoptRecoverySession(accessToken: string, refreshToken: string): Promise<boolean> {
  try {
    // Fetch the user so the session is real rather than assumed, and so email
    // and id are populated the way persist() would.
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { ...headers(), Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const user = await res.json();
    await persist({ access_token: accessToken, refresh_token: refreshToken,
                    expires_in: 3600, user });
    return true;
  } catch {
    return false;
  }
}

/** Set a new password for the currently-signed-in user. */
export async function setPassword(password: string): Promise<void> {
  const res = await fetch(`${SB_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: { ...headers(), Authorization: `Bearer ${access}` },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error_description || j.msg || j.message || msg; } catch {}
    throw new Error(msg);
  }
}

export async function signOut(): Promise<void> {
  // Here rather than at the call sites. signOut() is reached three ways —
  // Profile, App's sign-out button, and refreshSession() when a refresh fails
  // — and RevenueCat must be detached on all of them. Leaving a customer
  // attached on a shared device hands the next account the previous person's
  // entitlements: a tier they never bought, with nothing to explain it.
  // It never throws, so signing out cannot be blocked by the store.
  await signOutOfPurchases();
  // Everything else that caches per-user state. Failures here must not block
  // signing out, so each hook is isolated.
  for (const fn of signOutHooks) {
    try { fn(); } catch { /* a broken hook cannot trap someone in an account */ }
  }
  access = ''; refreshTok = ''; expiresAt = 0; email = ''; userId = '';
  await SecureStore.deleteItemAsync(K.a);
  await SecureStore.deleteItemAsync(K.r);
  await SecureStore.deleteItemAsync(K.e);
  await SecureStore.deleteItemAsync(K.m);
  await SecureStore.deleteItemAsync(K.u);
}
