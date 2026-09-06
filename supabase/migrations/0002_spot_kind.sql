-- スポットの種別（観光/食事 か 宿泊先か）を追加
alter table public.spots
  add column if not exists kind text not null default 'spot';

-- 想定値: 'spot' | 'hotel'
alter table public.spots
  drop constraint if exists spots_kind_check;
alter table public.spots
  add constraint spots_kind_check check (kind in ('spot', 'hotel'));
