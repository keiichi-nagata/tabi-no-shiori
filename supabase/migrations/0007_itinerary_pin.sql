-- 作成者が「どの端末でも」PIN を確認できるように、平文の PIN も保持する。
-- itineraries の所有者ポリシー（auth.uid() = user_id）で保護されるため、
-- 閲覧できるのは作成者本人のみ。共有 API（get-shared）は pin を返さない。
-- 照合は従来どおり pin_hash で行う。
alter table public.itineraries
  add column if not exists pin text;
