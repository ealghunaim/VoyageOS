-- 0007: daily planner  — applied 2026-07-30
-- Day-by-day itinerary items for a trip. `day` is a 1-based index into the
-- trip's date range (shift-safe if the trip dates move). Distinct from the
-- journal (trip_notes), which is a backward-looking log.
--
-- IMPORTANT: run in the Supabase SQL editor BEFORE deploying the backend.
create table if not exists public.trip_plan_items (
  id         uuid        primary key default uuid_generate_v4(),
  trip_id    uuid        not null references public.trips(id) on delete cascade,
  day        int         not null default 1,
  time       text,
  title      text        not null,
  note       text,
  done       boolean     not null default false,
  seq        int         not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists trip_plan_items_trip_day on public.trip_plan_items (trip_id, day, seq);

alter table public.trip_plan_items enable row level security;
drop policy if exists "plan via trip" on public.trip_plan_items;
create policy "plan via trip" on public.trip_plan_items for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
