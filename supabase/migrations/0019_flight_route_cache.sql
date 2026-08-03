-- 0019: flight route browsing — cache and usage ledger  — 2026-08-03
--
-- Phase 3 lets a traveller search "what flies BKK to SIN on this date" instead
-- of knowing a flight number up front. That reads from AeroDataBox's airport
-- schedule endpoint, which is metered: measured at 2 API units per call, and
-- the endpoint refuses windows longer than 12 hours, so covering one whole day
-- costs 2 calls = 4 units. The Pro plan carries 6000 units a month, which is
-- about 1500 full-day searches — comfortable for a small userbase and easy to
-- squander if the same route is fetched twice.
--
-- Hence two tables: one so a repeat search costs nothing, one so the spend is
-- observable rather than inferred.
--
-- Neither table gets RLS. Both are written by the service role only and are
-- never read through PostgREST by a client, which is the same position ai_runs
-- occupies.

-- Cached schedules, keyed by the question asked. A day's schedule is stable
-- enough that re-opening the editor should not re-spend; `fetched_at` lets the
-- reader decide when a row is too old to trust rather than baking a TTL in.
create table if not exists public.flight_route_cache (
  origin      text not null,
  dest        text not null,
  flight_date date not null,
  payload     jsonb not null,
  fetched_at  timestamptz not null default now(),
  primary key (origin, dest, flight_date)
);

-- The ledger. Deliberately shaped like ai_runs: one row per request, whether
-- or not it reached the provider, so the cache hit rate is visible and not
-- just the spend.
--
-- units_spent is what we believe the call cost. units_remaining is what the
-- provider's own header reported afterwards, and it is the ground truth the
-- budget guard reads — our arithmetic can drift, their counter cannot.
create table if not exists public.flight_api_usage (
  id              bigint generated always as identity primary key,
  user_id         uuid,
  kind            text not null check (kind in ('route', 'number')),
  origin          text,
  dest            text,
  flight_date     date,
  calls           int  not null default 0,
  units_spent     int,
  units_remaining int,
  cached          boolean not null default false,
  created_at      timestamptz not null default now()
);

-- the budget guard reads the most recent reported remaining, constantly
create index if not exists flight_api_usage_recent_idx
  on public.flight_api_usage (created_at desc)
  where units_remaining is not null;
