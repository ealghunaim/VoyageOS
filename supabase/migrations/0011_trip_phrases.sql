-- 0011: trip_phrases (phrasebook cache)  — documented 2026-07-31
-- Backfill only. Created in the Supabase dashboard when the phrasebook shipped
-- and never given a migration, so a fresh database came up without it and
-- GET /v1/trips/{id}/phrases 500'd on first write.
--
-- Shape read back from the live database, so this reproduces prod exactly.
-- Idempotent: no-ops against the existing table. Identical shape to
-- trip_family_play (0010), including the nullable generated_at.
--
-- The only index (trip_phrases_pkey) is created automatically by the primary
-- key below, so no explicit CREATE INDEX belongs here.
create table if not exists public.trip_phrases (
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
