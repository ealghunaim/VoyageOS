// Device-local reminder mirror (v0.5 dev delivery — Part 9 adapter pattern).
// The server materializes + governs; the phone arms the actual dings.
// Production flip: remote Expo Push in a development build — server side is ready.
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function permissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<boolean> {
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}

export type Reminder = {
  id: string;
  send_at: string;
  payload: { title?: string; body?: string };
};

/** Arms the governed schedule on-device. Idempotent per reminder id. */
export async function syncReminders(reminders: Reminder[]): Promise<number> {
  // dedupe: clear previously armed reminders before re-arming
  await Notifications.cancelAllScheduledNotificationsAsync();

  let armed = 0;
  for (const r of reminders) {
    const when = new Date(r.send_at);
    if (when.getTime() <= Date.now()) continue;
    await Notifications.cancelScheduledNotificationAsync(r.id).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: {
        title: r.payload.title ?? 'VoyageOS',
        body: r.payload.body ?? '',
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
    armed++;
  }
  return armed;
}

/** The instant-gratification proof: a ding 5 seconds from now. */
export async function testPing(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'VoyageOS is live',
      body: 'Reminders will arrive like this — at the right moment, never more than 3 a day.',
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}

export function deviceTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}
