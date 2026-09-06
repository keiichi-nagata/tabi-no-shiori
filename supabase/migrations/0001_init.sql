-- 旅のしおり: スキーマと RLS
-- 実行: supabase db push  もしくは  supabase SQL Editor に貼り付け

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
create table if not exists public.itineraries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  title          text not null default '旅のしおり',
  destination    jsonb not null default '[]'::jsonb,   -- string[]
  start_date     date not null,
  end_date       date not null,
  arrival_time   text,
  departure_time text,
  adults         integer not null default 1,
  children       jsonb not null default '[]'::jsonb,   -- number[]（年齢）
  packing_notes  text not null default '',
  plan_meta      jsonb not null default '{}'::jsonb,
  pin_hash       text,
  pin_salt       text,
  created_at     timestamptz not null default now()
);

create table if not exists public.days (
  id            uuid primary key default gen_random_uuid(),
  itinerary_id  uuid not null references public.itineraries (id) on delete cascade,
  day_index     integer not null,
  date          date not null,
  theme         text not null default ''
);

create table if not exists public.spots (
  id               uuid primary key default gen_random_uuid(),
  day_id           uuid not null references public.days (id) on delete cascade,
  "order"          integer not null,
  time             text not null default '',
  name             text not null default '',
  note             text not null default '',
  memo             text not null default '',        -- 旅行中の感想
  is_ai_suggested  boolean not null default false
);

create table if not exists public.transits (
  id        uuid primary key default gen_random_uuid(),
  day_id    uuid not null references public.days (id) on delete cascade,
  "order"   integer not null,
  mode      text not null default '',
  duration  text not null default '',
  note      text not null default ''
);

-- PIN 試行回数の記録（レート制限用。クライアントからは触れない）
create table if not exists public.pin_attempts (
  itinerary_id  uuid not null references public.itineraries (id) on delete cascade,
  client_key    text not null,
  fail_count    integer not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (itinerary_id, client_key)
);

create index if not exists idx_days_itinerary on public.days (itinerary_id);
create index if not exists idx_spots_day on public.spots (day_id);
create index if not exists idx_transits_day on public.transits (day_id);
create index if not exists idx_itineraries_user on public.itineraries (user_id, created_at desc);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table public.itineraries  enable row level security;
alter table public.days         enable row level security;
alter table public.spots        enable row level security;
alter table public.transits     enable row level security;
alter table public.pin_attempts enable row level security;

-- 所有者のみ自分のしおりを読み書きできる
drop policy if exists "own itineraries" on public.itineraries;
create policy "own itineraries" on public.itineraries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own days" on public.days;
create policy "own days" on public.days
  for all
  using (exists (select 1 from public.itineraries i where i.id = days.itinerary_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.itineraries i where i.id = days.itinerary_id and i.user_id = auth.uid()));

drop policy if exists "own spots" on public.spots;
create policy "own spots" on public.spots
  for all
  using (exists (
    select 1 from public.days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = spots.day_id and i.user_id = auth.uid()))
  with check (exists (
    select 1 from public.days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = spots.day_id and i.user_id = auth.uid()));

drop policy if exists "own transits" on public.transits;
create policy "own transits" on public.transits
  for all
  using (exists (
    select 1 from public.days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = transits.day_id and i.user_id = auth.uid()))
  with check (exists (
    select 1 from public.days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = transits.day_id and i.user_id = auth.uid()));

-- pin_attempts: ポリシーを作らない = 誰も直接アクセス不可（Edge Function の service role のみ）
