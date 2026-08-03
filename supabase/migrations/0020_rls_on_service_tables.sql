-- 0020: close an anon-readable hole on three service-role tables  — 2026-08-03
--
-- SECURITY FIX. Apply to PROD FIRST, immediately. This closes an exposure
-- rather than preparing for a deploy, so the usual migrate-before-deploy
-- ordering does not apply: there is no code change waiting on it, and every
-- hour it is unapplied is an hour the data is readable.
--
-- ai_runs, flight_api_usage and flight_route_cache were created without row
-- level security. In Supabase a table with RLS disabled is readable through
-- PostgREST by the anon role, and the anon key is publishable — it ships
-- inside the app binary. Anyone who extracts it could read these tables in
-- full.
--
-- Verified rather than assumed, by comparing an anon-key read against a
-- service-key read of the same query. Identical row counts means anon sees
-- everything:
--
--   ai_runs              anon=2  service=2   <-- exposed
--   flight_api_usage     anon=2  service=2   <-- exposed
--   flight_route_cache   anon=1  service=1   <-- exposed
--   documents            anon=0  service=0       correct
--   trips                anon=0  service=2       correct
--
-- What was readable:
--   flight_api_usage — user_id with origin, dest and flight_date. Which
--                      traveller searched which route on which day.
--   ai_runs          — user_id with task, model, token counts and cost.
--                      Per-user AI spend and usage patterns.
--   flight_route_cache — public flight schedules. Not sensitive, but closed
--                      anyway so "which tables are deliberately public" never
--                      becomes a question someone has to answer from memory.
--
-- No policies are added, deliberately. Every writer and reader of these three
-- tables is the backend using the service role, which bypasses RLS entirely.
-- Enabling RLS with no policy therefore changes nothing for the application
-- and removes all access for anon and authenticated — which is exactly the
-- posture trips and documents already have.
--
-- Note on how this was missed: migration 0019 justified leaving RLS off by
-- pointing at ai_runs as precedent. ai_runs was itself wrong. Precedent is
-- only evidence if the precedent was checked.

alter table public.ai_runs            enable row level security;
alter table public.flight_api_usage   enable row level security;
alter table public.flight_route_cache enable row level security;

-- Verification. Run with the rest; every row should read rls_enabled = true.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where oid in ('public.ai_runs'::regclass,
              'public.flight_api_usage'::regclass,
              'public.flight_route_cache'::regclass)
order by relname;
