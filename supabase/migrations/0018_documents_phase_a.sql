-- 0018: document vault, phase A — renewal reminders  — 2026-08-02
--
-- Phase A stores only what a renewal reminder needs: what the document is,
-- which country it is for, when it expires, and free text. Document numbers
-- and photo uploads are deliberately NOT here — that is Class C data and
-- lands in phase B behind encryption and a private bucket. No column added
-- by this migration holds anything sensitive.
--
-- Touches exactly one table, public.documents. No new tables, no new
-- indexes, no RLS changes, no storage buckets.
--
-- IMPORTANT: apply to prod BEFORE deploying the backend. Unlike 0017 there
-- is no resilience net: the API writes `notes` and `updated_at` on every
-- create and edit, and offers driving_license as a type. Against an
-- un-migrated database those are hard errors the traveller sees as a failed
-- save, not a degraded log line.

-- 1. Widen the type whitelist. driving_license is new; every existing value
--    is carried over unchanged, so no row can be invalidated by this.
--
--    A CHECK constraint cannot be extended in place, so this is drop-then-add.
--    The drop finds the constraint by what it DOES, not by what it is called.
--    dev names it documents_type_check, but this database has a history of
--    objects created by hand in the dashboard (see 0014), so prod may carry a
--    different name. Dropping by an assumed name would silently no-op there
--    and the add below would then sit ALONGSIDE the old constraint — both
--    enforced, driving_license still rejected, and nothing visibly wrong.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.documents'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%passport%'
  loop
    execute format('alter table public.documents drop constraint %I', c.conname);
    raise notice 'dropped check constraint %', c.conname;
  end loop;
end $$;

alter table public.documents
  add constraint documents_type_check
  check (type in ('passport', 'visa', 'insurance', 'vaccination',
                  'driving_license', 'ticket', 'permit', 'other'));

-- 2. Free-text notes. Nullable: most documents will not have any.
--    Named `notes` and documented as non-sensitive on purpose — it must not
--    become the place a passport number gets typed by hand. Phase B adds a
--    real encrypted field for that.
alter table public.documents
  add column if not exists notes text;

-- 3. Edit tracking. The table had created_at but no updated_at, so an edited
--    document was indistinguishable from an untouched one. Set explicitly by
--    the API on PATCH rather than by a trigger, so the write path stays
--    readable in one place.
alter table public.documents
  add column if not exists updated_at timestamptz not null default now();

-- Verification. Run this with the rest; it prints what actually landed rather
-- than leaving you to trust a "Success" message. Expect exactly one row whose
-- definition includes driving_license, and has_notes/has_updated_at both true.
select
  current_database()                                        as database,
  (select count(*) from pg_constraint
     where conrelid = 'public.documents'::regclass and contype = 'c') as check_constraints,
  (select string_agg(pg_get_constraintdef(oid), ' | ') from pg_constraint
     where conrelid = 'public.documents'::regclass and contype = 'c') as definition,
  (select count(*) > 0 from information_schema.columns
     where table_name = 'documents' and column_name = 'notes')        as has_notes,
  (select count(*) > 0 from information_schema.columns
     where table_name = 'documents' and column_name = 'updated_at')   as has_updated_at;
