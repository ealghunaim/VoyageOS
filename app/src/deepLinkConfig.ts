// Where a recovery link comes back to.
//
// One constant, because it has to be identical in three places or the flow
// breaks silently: what the app sends as redirect_to, what the app listens
// for, and what is whitelisted in Supabase → Auth → URL Configuration →
// Redirect URLs. Supabase refuses any redirect_to that is not on that list and
// falls back to Site URL, which produces an email whose link opens a web page
// instead of the app — with no error anywhere.
//
// MUST be added to the allow-list on BOTH projects: dev for testing, prod
// before v1.1 ships.
export const SCHEME = 'voyageos';
export const RESET_PATH = 'reset-password';
export const RESET_REDIRECT = `${SCHEME}://${RESET_PATH}`;
