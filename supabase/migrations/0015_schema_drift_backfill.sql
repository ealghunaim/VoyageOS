-- 0015: backfill columns that existed only in the dashboard  — documented 2026-07-31
-- Seventeen columns across seven tables had been added to prod by hand and were
-- never captured in a migration, so a database provisioned from this directory
-- came up structurally incomplete. It failed loudly the moment a trip was
-- created ("Could not find the 'airline' column of 'trips' in the schema
-- cache") — but only because create_trip touches trips early. Drift in the
-- other tables would have surfaced later and more confusingly.
--
-- Types and defaults read back from the live database, so these match prod
-- exactly. All add-column-if-not-exists, so this no-ops against prod and
-- completes a fresh database.
--
-- Run scripts/audit_schema.py to check this class of drift hasn't returned.

-- The trip record the app actually edits: travel mode, flight details, and the
-- visa status the traveler confirms for themselves in the Guide's Know tab.
alter table public.trips
  add column if not exists travel_mode text,
  add column if not exists airline     text,
  add column if not exists visa_status text,
  add column if not exists cabin_class text,
  add column if not exists depart_time text,
  add column if not exists segments    jsonb   not null default '[]'::jsonb,
  add column if not exists with_kids   boolean not null default false;

-- AccuWeather's opaque location id, cached so the weather engine doesn't
-- re-resolve a place on every refresh.
alter table public.destinations
  add column if not exists accu_location_key text;

-- Per-bag weight target, in grams (api/packing weight endpoints).
alter table public.bags
  add column if not exists target_limit_g integer;

-- Catalog flag: items you genuinely cannot travel without.
alter table public.items
  add column if not exists trip_critical boolean not null default false;

-- Per-item style tag and weight, both surfaced in the packing UI.
alter table public.packing_list_items
  add column if not exists style_tag text,
  add column if not exists weight_g  integer;

-- Notification scheduling: the local send time and its timezone, the topic used
-- for governance/rate limits, and the idempotency key that stops a rescheduled
-- run from sending twice.
alter table public.notification_schedule
  add column if not exists local_time text,
  add column if not exists tz_name    text,
  add column if not exists topic      text,
  add column if not exists idem_key   text;

-- Traveler age band, used when tailoring packing suggestions per companion.
alter table public.trip_travelers
  add column if not exists age_band text;
