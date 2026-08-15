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
