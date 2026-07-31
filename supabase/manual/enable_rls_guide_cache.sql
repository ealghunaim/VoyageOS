-- ============================================================================
-- NOT A MIGRATION — NOT YET APPLIED. Run this by hand in the Supabase SQL
-- editor against prod, then say so, and it gets folded into migrations
-- 0010/0011 so fresh databases and prod agree.
-- ============================================================================
--
-- WHY
-- trip_guides has RLS enabled with a "read own guides" owner policy.
-- trip_family_play and trip_phrases — same kind of per-trip cache, same
-- trip_id → trips(id) ownership chain — have RLS DISABLED and no policies.
-- Confirmed 2026-07-31 by reading pg_class.relrowsecurity and pg_policies.
--
-- IMPACT
-- Not exploitable today: the backend talks to Supabase with the service-role
-- key, which bypasses RLS, and no client reads these tables directly (the app
-- goes through the API; its Supabase client is used only for auth). This is
-- about closing the gap before something does read them directly, and about
-- the three caches being consistent.
--
-- SAFETY
-- Enabling RLS does not affect the service-role backend, so the API keeps
-- working unchanged. The policy mirrors trip_guides' existing "read own"
-- pattern: SELECT only, ownership via trips.owner_id = auth.uid().
-- Idempotent — safe to re-run.

alter table public.trip_family_play enable row level security;

drop policy if exists "read own family play" on public.trip_family_play;
create policy "read own family play" on public.trip_family_play for select
  using (exists (select 1 from public.trips t
                 where t.id = trip_family_play.trip_id and t.owner_id = auth.uid()));

alter table public.trip_phrases enable row level security;

drop policy if exists "read own phrases" on public.trip_phrases;
create policy "read own phrases" on public.trip_phrases for select
  using (exists (select 1 from public.trips t
                 where t.id = trip_phrases.trip_id and t.owner_id = auth.uid()));

-- Verify afterwards — expect relrowsecurity = true for all three:
--   select c.relname, c.relrowsecurity
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public'
--     and c.relname in ('trip_guides','trip_family_play','trip_phrases');
