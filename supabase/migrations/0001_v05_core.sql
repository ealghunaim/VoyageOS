-- Trip OS · v0.5 core schema (subset of Master Design Doc Part 1 §7)
-- Conventions: uuid PKs, timestamptz, RLS on all user data, jsonb for variable payloads.

create extension if not exists "uuid-ossp";

-- ============ identity & preferences ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  home_airport text,
  locale text default 'en',
  unit_system text default 'metric' check (unit_system in ('metric','imperial')),
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  packing_style text not null default 'standard' check (packing_style in ('light','standard','thorough')),
  quiet_hours jsonb not null default '{"start":"22:00","end":"08:00"}',
  notification_daily_cap int not null default 3 check (notification_daily_cap between 1 and 5),
  temperature_comfort_offset int not null default 0,
  emoji_ok boolean not null default false,
  extras jsonb not null default '{}'
);

-- ============ trips ============
create table public.trips (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft','upcoming','active','completed','archived')),
  start_date date not null,
  end_date date not null,
  trip_type text,
  routine boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.trip_travelers (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  guest_name text,
  role text not null default 'owner' check (role in ('owner','editor','viewer')),
  is_child boolean not null default false,
  age_band text check (age_band in ('infant','toddler','child','teen')),
  check (user_id is not null or guest_name is not null)
);

create table public.destinations (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  seq int not null default 1,
  place_name text not null,
  country_code text,
  lat double precision,
  lng double precision,
  arrive_at timestamptz,
  depart_at timestamptz,
  accommodation jsonb not null default '{}'
);

create table public.activities (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  type text not null,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  meta jsonb not null default '{}'
);

-- ============ packing ============
create table public.items (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete cascade, -- null = global catalog
  name text not null,
  category text not null check (category in
    ('clothing','footwear','toiletries','medications','electronics','documents','activity_gear','kids','comfort','misc')),
  default_weight_g int,
  tags text[] not null default '{}',
  perishable boolean not null default false,
  trip_critical boolean not null default false
);

create table public.gear_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  trip_type text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.gear_profile_items (
  profile_id uuid not null references public.gear_profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  qty int not null default 1 check (qty > 0),
  notes text,
  primary key (profile_id, item_id)
);

create table public.packing_lists (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  traveler_id uuid references public.trip_travelers(id) on delete cascade,
  generated_at timestamptz,
  generation_snapshot jsonb not null default '{}' -- inputs hash, model id, prompt version
);

create table public.packing_list_items (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid not null references public.packing_lists(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  name text not null,
  category text not null,
  qty int not null default 1 check (qty between 1 and 14),
  status text not null default 'suggested' check (status in ('suggested','accepted','packed','rejected')),
  source text not null default 'ai' check (source in ('ai','profile','history','manual','template','weather')),
  reason text,
  confidence real check (confidence between 0 and 1),
  bag_id uuid,
  sort int not null default 0
);

create table public.bags (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  traveler_id uuid references public.trip_travelers(id) on delete cascade,
  name text not null,
  kind text not null default 'carryon' check (kind in ('carryon','checked','personal','worn')),
  tare_weight_g int not null default 0,
  target_limit_g int -- v0.5 generic mode: user-picked 7/10/23kg preset; airline rules come later
);

-- ============ proactivity ============
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  traveler_id uuid references public.trip_travelers(id) on delete cascade,
  title text not null,
  kind text not null default 'task',
  due_at timestamptz,
  offset_rule jsonb, -- {"anchor":"departure","days":-3,"time":"18:00"}
  status text not null default 'pending' check (status in ('pending','done','dismissed','expired')),
  source text not null default 'rule'
);

create table public.notification_schedule (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  send_at timestamptz not null,
  local_time text, tz_name text, -- timezone doctrine (Part 3 §3)
  channel text not null default 'push',
  class text not null default 'task',
  topic text,
  payload jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending','sent','actioned','dismissed','suppressed','digested','failed','cancelled')),
  idem_key text unique
);
create index on public.notification_schedule (send_at) where status = 'pending';

create table public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  schedule_id uuid,
  class text not null,
  event text not null, -- sent | actioned | dismissed | suppressed:<reason>
  at timestamptz not null default now()
);

-- ============ documents (v0.5: expiry-only vault) ============
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('passport','visa','insurance','vaccination','ticket','permit','other')),
  label text,
  country_code text,
  expiry_date date,
  file_key text, -- private bucket object; signed URLs only
  created_at timestamptz not null default now()
);

-- ============ the moat ============
create table public.item_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  traveler_id uuid,
  item_id uuid references public.items(id) on delete set null,
  item_name text not null,
  trip_id uuid references public.trips(id) on delete set null,
  event text not null check (event in ('packed','forgot','unused','lost','bought','saved_me')),
  noted_at timestamptz not null default now(),
  meta jsonb not null default '{}'
);

-- ============ ops ============
create table public.ai_runs (
  id bigint generated always as identity primary key,
  user_id uuid,
  task text not null,
  provider text, model text,
  tokens_in int, tokens_out int,
  cost_usd numeric(10,5),
  latency_ms int,
  created_at timestamptz not null default now()
);

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.trips enable row level security;
alter table public.trip_travelers enable row level security;
alter table public.destinations enable row level security;
alter table public.activities enable row level security;
alter table public.items enable row level security;
alter table public.gear_profiles enable row level security;
alter table public.gear_profile_items enable row level security;
alter table public.packing_lists enable row level security;
alter table public.packing_list_items enable row level security;
alter table public.bags enable row level security;
alter table public.tasks enable row level security;
alter table public.notification_schedule enable row level security;
alter table public.notification_log enable row level security;
alter table public.documents enable row level security;
alter table public.item_events enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid());
create policy "own prefs" on public.user_preferences for all using (user_id = auth.uid());
create policy "own trips" on public.trips for all using (owner_id = auth.uid());
create policy "travelers via trip" on public.trip_travelers for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
create policy "destinations via trip" on public.destinations for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
create policy "activities via trip" on public.activities for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
create policy "catalog read" on public.items for select using (owner_id is null or owner_id = auth.uid());
create policy "own items write" on public.items for insert with check (owner_id = auth.uid());
create policy "own items update" on public.items for update using (owner_id = auth.uid());
create policy "own gear" on public.gear_profiles for all using (user_id = auth.uid());
create policy "own gear items" on public.gear_profile_items for all
  using (exists (select 1 from public.gear_profiles g where g.id = profile_id and g.user_id = auth.uid()));
create policy "lists via trip" on public.packing_lists for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
create policy "list items via list" on public.packing_list_items for all
  using (exists (select 1 from public.packing_lists l join public.trips t on t.id = l.trip_id
                 where l.id = list_id and t.owner_id = auth.uid()));
create policy "bags via trip" on public.bags for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
create policy "tasks via trip" on public.tasks for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
create policy "own schedule" on public.notification_schedule for all using (user_id = auth.uid());
create policy "own log" on public.notification_log for select using (user_id = auth.uid());
create policy "own documents" on public.documents for all using (user_id = auth.uid());
create policy "own item events" on public.item_events for all using (user_id = auth.uid());

-- Shared trips (Part 6) will replace owner-only policies with trip_travelers-based
-- policies in a later migration; v0.5 is single-player by design.
