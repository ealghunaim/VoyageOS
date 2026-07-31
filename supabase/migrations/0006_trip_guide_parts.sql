-- 0006: two-phase guide cache  — applied 2026-07-30
-- Progressive guide: phase 'a' (Know + Eat, fast/Haiku) and phase 'b'
-- (Play + Visit + Go, Sonnet) generate and cache independently so the first
-- tab paints in seconds while the rest fills in behind it. One row per
-- (trip, phase); backend uses the service-role key so RLS never blocks it,
-- but the owner policy is here for defense-in-depth like the other trip tables.
--
-- IMPORTANT: run in the Supabase SQL editor BEFORE deploying the backend.
create table if not exists public.trip_guide_parts (
  trip_id    uuid        not null references public.trips(id) on delete cascade,
  phase      text        not null check (phase in ('a', 'b')),
  payload    jsonb       not null,
  model      text,
  updated_at timestamptz not null default now(),
  primary key (trip_id, phase)
);

alter table public.trip_guide_parts enable row level security;

drop policy if exists "guide parts via trip" on public.trip_guide_parts;
create policy "guide parts via trip" on public.trip_guide_parts for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
