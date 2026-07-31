-- 0010: trip_family_play (Party Play cache)  — documented 2026-07-31
-- Backfill only. Created in the Supabase dashboard when Party Play shipped and
-- never given a migration, so a fresh database came up without it and
-- GET /v1/trips/{id}/family-play 500'd on first write.
--
-- Shape read back from the live database, so this reproduces prod exactly.
-- Idempotent: no-ops against the existing table.
--
-- generated_at is nullable here (default now(), no NOT NULL) — that is what
-- prod has, not an oversight in transcription. trip_guides (0009) uses a
-- NOT NULL created_at instead.
--
-- The only index (trip_family_play_pkey) is created automatically by the
-- primary key below, so no explicit CREATE INDEX belongs here.
create table if not exists public.trip_family_play (
  trip_id      uuid        primary key references public.trips(id) on delete cascade,
  payload      jsonb       not null default '{}'::jsonb,
  model        text,
  generated_at timestamptz default now()
);

-- RLS was disabled on this table until 2026-07-31, when the statements below
-- were applied by hand to prod to bring it in line with trip_guides (0009);
-- verified afterwards with relrowsecurity = true. Backend uses the
-- service-role key and bypasses RLS; this guards direct client reads.
alter table public.trip_family_play enable row level security;

drop policy if exists "read own family play" on public.trip_family_play;
create policy "read own family play" on public.trip_family_play for select
  using (exists (select 1 from public.trips t
                 where t.id = trip_family_play.trip_id and t.owner_id = auth.uid()));
