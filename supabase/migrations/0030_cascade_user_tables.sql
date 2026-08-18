-- 0030: three tables that did not follow the user out
--
-- device_tokens, food_tips and flight_api_usage all carry a user_id with NO
-- foreign key, so deleting an auth user left their rows behind. The account
-- deletion drill found this by enumerating every table rather than checking
-- the ones that seemed likely — which is the only reason it was found at all.
--
-- api/account/deletion.py already deletes from all three explicitly, and that
-- code STAYS. This migration is the second belt: application code can be
-- bypassed by a dashboard delete, a support action, or a future path nobody
-- has written yet, and the database is the only layer that cannot be skipped.
--
-- WHY `on delete cascade` AND NOT `set null`
--
-- All three rows are meaningless without the person they belong to. A push
-- token for a deleted account can only ever deliver to nobody; a tip loses
-- its attribution, which is the entire basis on which tips are shown (they
-- are framed as "a traveller who's been"); and a usage row exists to attribute
-- API spend. Orphaning them keeps rows that no longer answer any question,
-- and for food_tips it would leave user-authored content in a table after the
-- user asked to be erased. flight_api_usage.user_id IS nullable, so cascade is
-- stated explicitly rather than relying on the column's nullability.
--
-- IMPORTANT: additive and idempotent. Adding a foreign key does not change
-- what running code writes, so this is safe to apply before any deploy.
-- Existing rows are validated on add; if any point at a user that no longer
-- exists, the ALTER fails loudly rather than silently — see the pre-flight
-- check below, which is the thing to run first.

-- ── pre-flight: are there already orphans? ─────────────────────────────────
-- Run this SELECT on its own first. A non-empty result means the ADD
-- CONSTRAINT below will fail, and those rows must be removed first.
--
--   select 'device_tokens' as t, count(*) from public.device_tokens d
--     where d.user_id is not null
--       and not exists (select 1 from auth.users u where u.id = d.user_id)
--   union all
--   select 'food_tips', count(*) from public.food_tips f
--     where f.user_id is not null
--       and not exists (select 1 from auth.users u where u.id = f.user_id)
--   union all
--   select 'flight_api_usage', count(*) from public.flight_api_usage a
--     where a.user_id is not null
--       and not exists (select 1 from auth.users u where u.id = a.user_id);

-- ── the constraints ───────────────────────────────────────────────────────
alter table public.device_tokens
  drop constraint if exists device_tokens_user_id_fkey;
alter table public.device_tokens
  add constraint device_tokens_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.food_tips
  drop constraint if exists food_tips_user_id_fkey;
alter table public.food_tips
  add constraint food_tips_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.flight_api_usage
  drop constraint if exists flight_api_usage_user_id_fkey;
alter table public.flight_api_usage
  add constraint flight_api_usage_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
