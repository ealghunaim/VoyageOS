// Face ID on the Documents surface, and the five ways it can go wrong.
//
// AN APP LOCK, NOT SIGN-IN. The session already persists in SecureStore, so
// nobody types a password after the first time. This gates one room — the one
// holding passport numbers — and never the front door.
//
// THE GOVERNING RULE: a lock that can strand you is worse than no lock. The
// data behind this is the document you need at a border, and every branch
// below is written so that losing biometrics never means losing access.
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY = 'voyageos.biometric.documents';

/** What the device can actually do, asked rather than assumed. */
export type BiometricCapability =
  | 'unavailable'   // no sensor at all — the toggle should not exist
  | 'unenrolled'    // sensor present, nothing registered — explain, don't arm
  | 'ready';

export async function capability(): Promise<BiometricCapability> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return 'unavailable';
    return (await LocalAuthentication.isEnrolledAsync()) ? 'ready' : 'unenrolled';
  } catch {
    // A throwing capability check is indistinguishable from no hardware, and
    // treating it as "ready" would arm a lock we cannot open.
    return 'unavailable';
  }
}

/** Per DEVICE, not per account: it protects this phone, not the login. */
export async function isEnabled(): Promise<boolean> {
  try { return (await SecureStore.getItemAsync(KEY)) === '1'; }
  catch { return false; }
}

export async function setEnabled(on: boolean): Promise<void> {
  try {
    if (on) await SecureStore.setItemAsync(KEY, '1');
    else await SecureStore.deleteItemAsync(KEY);
  } catch { /* a toggle that cannot persist simply stays off */ }
}

export type UnlockResult =
  | 'granted'
  | 'cancelled'      // a decision, not a failure — say nothing
  | 'unavailable';   // biometrics vanished since it was enabled

/** Ask for Face ID. Returns granted only on a real success. */
export async function unlock(): Promise<UnlockResult> {
  const cap = await capability();

  // RE-ENROLMENT LOSS. iOS invalidates biometrics when a face or finger is
  // re-registered, and the phone may also have been wiped and restored. If we
  // insisted here, someone's own passport number would be locked behind a
  // sensor that no longer knows them, recoverable only by reinstalling. The
  // toggle self-disables instead and Documents opens.
  if (cap !== 'ready') {
    await setEnabled(false);
    return 'unavailable';
  }

  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock your documents',
      cancelLabel: 'Not now',
      // PASSCODE FALLBACK ALLOWED, deliberately. Sunglasses, a bandage, a bad
      // angle at a border desk — refusing the passcode is the strand case, and
      // the passcode already protects everything else on the phone, so
      // permitting it costs nothing real.
      disableDeviceFallback: false,
    });
    if (r.success) return 'granted';
    return 'cancelled';
  } catch {
    // Never leave the user shut out because the API threw.
    return 'unavailable';
  }
}
