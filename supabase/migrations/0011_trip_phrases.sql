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

-- RLS was disabled on this table until 2026-07-31, when the statements below
-- were applied by hand to prod to bring it in line with trip_guides (0009);
-- verified afterwards with relrowsecurity = true. Backend uses the
-- service-role key and bypasses RLS; this guards direct client reads.
alter table public.trip_phrases enable row level security;

drop policy if exists "read own phrases" on public.trip_phrases;
create policy "read own phrases" on public.trip_phrases for select
  using (exists (select 1 from public.trips t
                 where t.id = trip_phrases.trip_id and t.owner_id = auth.uid()));
