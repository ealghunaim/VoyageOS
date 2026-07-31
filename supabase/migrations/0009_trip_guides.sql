-- 0009: trip_guides (guide cache)  — documented 2026-07-31
-- Backfill only. This table has existed in the Supabase project since the guide
-- engine shipped; it was created in the dashboard and never had a migration, so
-- a fresh database provisioned from this directory came up without it and
-- GET /v1/trips/{id}/guide 500'd on first write.
--
-- Shape read back from the live database (pg_attribute + pg_get_constraintdef),
-- so this reproduces prod exactly. Idempotent: no-ops against the existing table.
--
-- Note the surrogate id + unique(trip_id): trip_family_play and trip_phrases
-- (0010/0011) instead key on trip_id directly. Kept as-is rather than
-- normalized — the backend upserts on trip_id either way, and changing a live
-- primary key isn't worth the risk for cosmetic consistency.
--
-- Both of this table's indexes (trip_guides_pkey, trip_guides_trip_id_key) are
-- created automatically by the primary key and unique constraints below, so no
-- explicit CREATE INDEX belongs here.
create table if not exists public.trip_guides (
  id         uuid        primary key default uuid_generate_v4(),
  trip_id    uuid        not null unique references public.trips(id) on delete cascade,
  payload    jsonb       not null default '{}'::jsonb,
  model      text,
  created_at timestamptz not null default now()
);

-- RLS is already enabled on this table in prod, with exactly this policy.
-- Backend uses the service-role key and bypasses RLS; this guards direct
-- client reads. trip_family_play and trip_phrases are NOT protected this way
-- today — see supabase/manual/enable_rls_guide_cache.sql.
alter table public.trip_guides enable row level security;

drop policy if exists "read own guides" on public.trip_guides;
create policy "read own guides" on public.trip_guides for select
  using (exists (select 1 from public.trips t
                 where t.id = trip_guides.trip_id and t.owner_id = auth.uid()));
