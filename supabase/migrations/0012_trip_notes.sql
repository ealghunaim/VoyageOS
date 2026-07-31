-- 0012: trip_notes (journal)  — documented 2026-07-31
-- Backfill only. Created in the Supabase dashboard and never given a migration,
-- so a fresh database came up without it and the journal endpoints 500'd.
-- Shape read back from the live database. Idempotent: no-ops against prod.
--
-- user_id deliberately has NO foreign key — that matches prod. Do not add one.
-- Rows are scoped by the RLS policy below rather than by referential integrity.
--
-- id and created_at carry defaults because api/notes/router.py inserts only
-- {trip_id, user_id, body, photos}; without them every journal entry would
-- fail on a null primary key.
create table if not exists public.trip_notes (
  id         uuid        primary key default uuid_generate_v4(),
  trip_id    uuid        not null references public.trips(id) on delete cascade,
  user_id    uuid        not null,
  body       text        not null,
  created_at timestamptz not null default now(),
  photos     jsonb       default '[]'::jsonb
);

alter table public.trip_notes enable row level security;

drop policy if exists "own notes" on public.trip_notes;
create policy "own notes" on public.trip_notes for all
  using (user_id = auth.uid());
