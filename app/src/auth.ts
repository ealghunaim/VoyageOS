// VoyageOS auth — Supabase Auth over plain REST (no SDK), tokens in the
// phone's encrypted keychain via expo-secure-store. The publishable key is
// designed to ship in apps; sessions are what we protect.
import * as SecureStore from 'expo-secure-store';
import * as CFG from './config';

const SB_URL: string = (CFG as any).SUPABASE_URL ?? '';
const SB_KEY: string = (CFG as any).SUPABASE_ANON_KEY ?? '';

let access = '';
let refreshTok = '';
let expiresAt = 0; // epoch seconds

const K = { a: 'vo_access', r: 'vo_refresh', e: 'vo_exp' };

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

export async function signOut(): Promise<void> {
  access = ''; refreshTok = ''; expiresAt = 0;
  await SecureStore.deleteItemAsync(K.a);
  await SecureStore.deleteItemAsync(K.r);
  await SecureStore.deleteItemAsync(K.e);
}
