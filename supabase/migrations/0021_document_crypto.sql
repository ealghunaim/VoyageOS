-- 0021: envelope encryption for document numbers and photos  — 2026-08-04
--
-- Foundation only. No document number or photo is stored by this migration or
-- by the commit that carries it; this is the vault the next commit puts things
-- into.
--
-- IMPORTANT: apply to PROD BEFORE deploying the backend. There is no
-- resilience net — the API writes number_encrypted, number_last4 and
-- key_version on every document create and edit, and reads user_keys on every
-- encrypt. Against an un-migrated database those are hard errors the traveller
-- sees as a failed save.
--
-- THE SCHEME
--
--   MASTER_KEK (env var, never in the repo)
--        │  AES-GCM wrap, AAD = user_id
--        ▼
--   per-user DEK (32 random bytes, one per user)
--        │  stored wrapped in user_keys.wrapped_dek
--        ▼
--   document number  → AES-GCM(DEK) → documents.number_encrypted
--   document photo   → AES-GCM(DEK) → private storage object
--
-- Envelope rather than deriving each user key from the master directly,
-- because the difference is whether rotation is possible at all. Derived keys
-- change when the master changes, so rotating means decrypting and
-- re-encrypting every number and every photo — gigabytes, a maintenance
-- window, and a job nobody runs. Wrapped keys mean rotating the master
-- re-wraps one small row per user and never touches a ciphertext.
--
-- key_version exists from day one for the same reason. Retrofitting it later
-- would mean a migration across already-encrypted data with no way to tell
-- which key wrote which row.

-- ── documents: the encrypted number ──────────────────────────────────────
--
-- bytea, not text: AES-GCM output is binary (nonce ‖ ciphertext ‖ tag) and
-- base64-ing it to fit a text column would waste a third of the space and
-- invite someone to read it as a string.
alter table public.documents
  add column if not exists number_encrypted bytea;

-- The last four digits, in clear, on purpose. A list of documents shows
-- "•••• 4291" for each one; without this every render would decrypt every
-- number — more key use, more exposure, slower. Four digits identify a
-- document to its owner and are useless to anyone else.
alter table public.documents
  add column if not exists number_last4 text;

-- Which master key version wrapped the DEK that encrypted this row. Rotation
-- reads it to choose the right key; a row is only ever re-encrypted if its
-- user's DEK itself is rotated.
alter table public.documents
  add column if not exists key_version int not null default 1;

-- ── user_keys: the wrapped data-encryption keys ──────────────────────────
--
-- One row per user. wrapped_dek is the user's 32-byte DEK sealed with the
-- master KEK, AAD-bound to their user_id so a wrapped key cannot be moved
-- between users even by someone holding the database.
create table if not exists public.user_keys (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  wrapped_dek bytea       not null,
  key_version int         not null default 1,
  created_at  timestamptz not null default now(),
  rotated_at  timestamptz
);

-- RLS on, no policy — deliberately. Every read and write is the backend on the
-- service role, which bypasses RLS. Enabling it with no policy removes all
-- access for anon and authenticated, which is the posture 0020 established for
-- service-only tables. A key material table must never be readable by a client
-- under any circumstances.
alter table public.user_keys enable row level security;

-- documents already carries the right policy from 0001:
--   create policy "own documents" on public.documents for all
--     using (user_id = auth.uid());
-- RLS is per row, not per column, so number_encrypted and number_last4 inherit
-- it automatically. Nothing further is needed there.

-- Verification. Run with the rest.
select
  (select count(*) from information_schema.columns
    where table_name = 'documents'
      and column_name in ('number_encrypted','number_last4','key_version')) as new_document_columns,
  (select count(*) from information_schema.tables
    where table_name = 'user_keys')                                          as user_keys_exists,
  (select relrowsecurity from pg_class where oid = 'public.user_keys'::regclass) as user_keys_rls,
  (select count(*) from pg_policies where tablename = 'user_keys')           as user_keys_policies;
-- expect: 3, 1, true, 0
