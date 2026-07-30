-- 0004: trip origin / start point  — applied 2026-07-30
-- The traveler's departure point for a trip. Prefilled from the profile
-- "home" (user_preferences.extras.home_origin, no column needed there), but
-- overridable per trip. Feeds Go transit advice + departure-weather packing.
--
-- IMPORTANT: run this in the Supabase SQL editor BEFORE deploying the backend
-- that sends these fields. PostgREST rejects inserts with unknown columns, so
-- create_trip would 500 until the columns exist. (Same as the run-in-dashboard
-- flow noted in 0003.)
alter table public.trips
  add column if not exists origin         text,
  add column if not exists origin_country text,
  add column if not exists origin_lat     double precision,
  add column if not exists origin_lng     double precision;
