// Push registration — silently inert inside Expo Go (remote push needs the
// dev build); the moment the M3 build runs, this lights up the cloud pipe.
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { req } from './api';

const DEVICE_ID_KEY = 'voyageos.device_id';

/**
 * A stable id for this install, minted once and kept in SecureStore.
 *
 * Expo issues a new push token for every install, so keying the server's
 * device_tokens table on the token meant a new token was an extra row rather
 * than a replacement. They accumulated across builds until one reminder was
 * being delivered five times to one phone.
 *
 * SecureStore survives app updates — the thing that was actually churning —
 * and is already the app's persistence for auth tokens, so this needs no new
 * native module. It does NOT bridge Expo Go and the standalone app: separate
 * keychain namespaces mean separate ids, so a development phone still sees
 * both. iOS offers no cross-app device identity, and Expo Go is a dev tool.
 */
async function deviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  // randomUUID exists on Hermes; the fallback keeps this from throwing on any
  // runtime that lacks it, since a weaker id is far better than no id.
  const fresh = (globalThis.crypto as any)?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
  return fresh;
}

export async function registerForPush(): Promise<void> {
  try {
    const projectId =
      (Constants as any)?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    if (!projectId) return; // Expo Go / unlinked project — dev build unlocks this
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const ask = await Notifications.requestPermissionsAsync();
      if (ask.status !== 'granted') return;
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await req('/v1/me/device-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS === 'android' ? 'android' : 'ios' }),
    });
    console.log('[push] token registered');
  } catch (e) {
    console.log('[push] skipped:', (e as Error).message);
  }
}
