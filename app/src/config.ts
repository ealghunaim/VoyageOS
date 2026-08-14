import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const API_URL = extra.apiUrl ?? '';
export const APP_KEY = extra.appKey ?? '';
export const SUPABASE_URL = extra.supabaseUrl ?? '';
export const SUPABASE_ANON_KEY = extra.supabaseAnonKey ?? '';

// RevenueCat's PUBLIC SDK key (Apple), prefix `appl_`. Designed to ship in
// the app binary, like the Supabase publishable key above — it can start a
// purchase but cannot read or change anyone's subscription. The webhook
// signing secret is a different credential entirely and lives only in the
// server's environment; it must never appear here.
export const REVENUECAT_IOS_KEY = extra.revenueCatIosKey ?? '';

// The 1b purchase harness. A config flag rather than __DEV__ because an
// installed build runs its embedded bundle, where __DEV__ is false and the
// harness vanished — and the device could not be talked into loading from
// Metro (dev menu, deep links and a tunnel all failed). Sandbox purchases
// need a real device, so the trigger has to survive into a real build.
//
// Turning it off is a config flip, not a code change. It MUST be false before
// anything reaches the App Store.
export const SHOW_PURCHASE_HARNESS =
  (extra as unknown as Record<string, unknown>).showPurchaseHarness === true;
