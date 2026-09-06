-- スポット種別に出発地・到着地を追加
alter table public.spots
  drop constraint if exists spots_kind_check;
alter table public.spots
  add constraint spots_kind_check
  check (kind in ('spot', 'hotel', 'departure', 'arrival'));
