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

-- NOTE: prod has RLS DISABLED on this table, so this file deliberately does not
-- enable it — these migrations document what exists, they don't change it.
-- The fix is staged separately in supabase/manual/enable_rls_guide_cache.sql
-- and still needs to be applied. Once it is, this file should gain the matching
-- enable + policy so fresh databases and prod agree.
