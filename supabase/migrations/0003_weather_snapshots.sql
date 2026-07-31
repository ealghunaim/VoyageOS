-- 0003: weather_snapshots (v0.6 weather engine) — applied 2026-07-27
-- (same SQL as run in the dashboard; kept here as the source of truth)
--
-- Backfilled 2026-07-31: this file was comments-only, with the real DDL living
-- solely in the dashboard, so a fresh database provisioned from this directory
-- came up without the table and both the weather engine and trip Q&A failed.
-- Shape read back from the live database. Idempotent: no-ops against prod.
--
-- The unique (destination_id, forecast_date) below is load-bearing, not
-- decorative: _upsert_snapshots() in api/weather/service.py upserts with
-- on_conflict="destination_id,forecast_date" so concurrent refreshes can't race
-- into a unique-violation 500. Without it that upsert fails.
create table if not exists public.weather_snapshots (
  id             uuid        primary key default uuid_generate_v4(),
  destination_id uuid        not null references public.destinations(id) on delete cascade,
  forecast_date  date        not null,
  provider       text        default 'open-meteo',
  temp_min       numeric,
  temp_max       numeric,
  precip_prob    numeric,
  wind_kph       numeric,
  payload        jsonb       default '{}'::jsonb,
  fetched_at     timestamptz,
  unique (destination_id, forecast_date)
);

-- Ownership is two hops away (snapshot -> destination -> trip), unlike the
-- trip-keyed caches which join straight to trips.
alter table public.weather_snapshots enable row level security;

drop policy if exists "read own trip weather" on public.weather_snapshots;
create policy "read own trip weather" on public.weather_snapshots for select
  using (exists (select 1 from public.destinations d
                 join public.trips t on t.id = d.trip_id
                 where d.id = weather_snapshots.destination_id
                   and t.owner_id = auth.uid()));
