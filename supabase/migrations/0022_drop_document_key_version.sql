-- 0022 · drop documents.key_version
--
-- The column was written on every document create, edit and photo upload, and
-- read by nothing. 0021 introduced it with the comment "Rotation reads it to
-- choose the right key" — that was never true. Rotation has always read
-- user_keys.key_version, because which master key wraps a DEK is a fact about
-- the DEK, not about a document.
--
-- A second copy of a fact can only ever drift out of step with the first, and
-- this one did: after the master key rotation to V2, every document row still
-- said 1 while its DEK was on 2. Nothing malfunctioned, because nothing reads
-- it — but an incident responder reading that column would have concluded the
-- documents were still on the leaked key. A field that is wrong and unread is
-- worse than no field.
--
-- ORDERING — THIS ONE IS NOT MIGRATE-FIRST
--
-- The usual order here is migrate prod, then deploy. That is right for
-- additive changes and wrong for a drop: if the column disappears while the
-- running code still writes it, PostgREST rejects the insert and every
-- document create and photo upload 500s until the deploy lands.
--
-- So this migration runs AFTER the code that stops writing the column is live
-- on prod. The column is `not null default 1`, so in the window between the
-- two the database keeps filling it from the default and nothing breaks in
-- either direction.
--
-- Safe to re-run.

alter table public.documents
  drop column if exists key_version;

-- ── verification ─────────────────────────────────────────────────────────
--
-- Expect: documents_key_version_column = 0, user_keys_key_version_column = 1.
-- The second matters as much as the first — the column that rotation actually
-- depends on must still be there.

select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'documents'
       and column_name = 'key_version')  as documents_key_version_column,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'user_keys'
       and column_name = 'key_version')  as user_keys_key_version_column,
  (select count(*) from public.documents) as document_rows;
