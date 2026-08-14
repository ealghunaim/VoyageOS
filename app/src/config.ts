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

// The 1b purchase harness — gated so it CANNOT reach a production build.
//
// Two ways in, both impossible to leave on by accident:
//
//   __DEV__                             true only when running from a dev
//                                       server. False in every EAS binary.
//   EXPO_PUBLIC_PURCHASE_HARNESS=1      set per build profile in eas.json,
//                                       inlined into the bundle at build time.
//
// eas.json defines it for `development` and `preview` and NOT for
// `production`. So shipping the harness to the App Store would require adding
// the variable to the production profile — a deliberate edit to a COMMITTED
// file that shows up in a diff and a review.
//
// This replaced an app.json flag. That flag was the wrong shape twice over: it
// defaulted to on, so safety depended on remembering to turn it off, and it
// lived in a skip-worktree file that git never shows — so nobody would ever
// see it in a diff. Here, the unsafe state has to be typed on purpose.
export const SHOW_PURCHASE_HARNESS =
  __DEV__ || process.env.EXPO_PUBLIC_PURCHASE_HARNESS === '1';
