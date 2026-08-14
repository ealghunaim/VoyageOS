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
