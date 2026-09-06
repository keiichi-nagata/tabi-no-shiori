-- memo 列（旅行中の記録。備考=note とは別）が両テーブルに存在することを保証する。
-- 0001/0004 が部分的にしか適用されていない場合の保険。何度実行しても安全。

alter table public.spots
  add column if not exists note text not null default '';
alter table public.spots
  add column if not exists memo text not null default '';

alter table public.transits
  add column if not exists note text not null default '';
alter table public.transits
  add column if not exists memo text not null default '';

-- 確認用（実行結果に memo/note が両方出れば OK）:
--   select table_name, column_name from information_schema.columns
--   where table_schema='public' and table_name in ('spots','transits')
--     and column_name in ('note','memo') order by table_name, column_name;
