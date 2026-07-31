-- 0014: device_tokens (push notification targets)  — documented 2026-07-31
-- Backfill only. Created in the Supabase dashboard and never given a migration,
-- so a fresh database came up without it and device registration 500'd.
-- Shape read back from the live database. Idempotent: no-ops against prod.
--
-- user_id deliberately has NO foreign key — that matches prod. Do not add one.
--
-- token is the primary key, not a surrogate id: api/me/router.py upserts with
-- on_conflict="token" so re-registering the same device updates its row rather
-- than accumulating duplicates. One row per device, not per user.
--
-- updated_at carries a default because that upsert sends only
-- {user_id, token, platform}.
create table if not exists public.device_tokens (
  user_id    uuid        not null,
  token      text        not null primary key,
  platform   text        not null default 'ios',
  updated_at timestamptz not null default now()
);

alter table public.device_tokens enable row level security;

drop policy if exists "own tokens" on public.device_tokens;
create policy "own tokens" on public.device_tokens for all
  using (user_id = auth.uid());
