-- RLS ポリシーとテーブル権限の再適用（「しおりが見つかりません」対策）。
-- 何度実行しても安全。既存ポリシーを作り直し、authenticated ロールに必要な権限を付与する。

-- ── テーブル権限（RLS は別途、行レベルで own 判定する） ──
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.itineraries, public.days, public.spots, public.transits
  to authenticated;

-- ── RLS 有効化 ──
alter table public.itineraries  enable row level security;
alter table public.days         enable row level security;
alter table public.spots        enable row level security;
alter table public.transits     enable row level security;
alter table public.pin_attempts enable row level security;

-- ── 所有者ポリシー（作り直し） ──
drop policy if exists "own itineraries" on public.itineraries;
create policy "own itineraries" on public.itineraries
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own days" on public.days;
create policy "own days" on public.days
  for all to authenticated
  using (exists (select 1 from public.itineraries i where i.id = days.itinerary_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.itineraries i where i.id = days.itinerary_id and i.user_id = auth.uid()));

drop policy if exists "own spots" on public.spots;
create policy "own spots" on public.spots
  for all to authenticated
  using (exists (
    select 1 from public.days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = spots.day_id and i.user_id = auth.uid()))
  with check (exists (
    select 1 from public.days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = spots.day_id and i.user_id = auth.uid()));

drop policy if exists "own transits" on public.transits;
create policy "own transits" on public.transits
  for all to authenticated
  using (exists (
    select 1 from public.days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = transits.day_id and i.user_id = auth.uid()))
  with check (exists (
    select 1 from public.days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = transits.day_id and i.user_id = auth.uid()));

-- pin_attempts はポリシーなし（Edge Function の service role のみアクセス可）
