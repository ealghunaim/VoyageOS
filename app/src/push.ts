// Push registration — silently inert inside Expo Go (remote push needs the
// dev build); the moment the M3 build runs, this lights up the cloud pipe.
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { req } from './api';

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
