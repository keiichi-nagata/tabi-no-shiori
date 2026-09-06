-- 移動ブロックにも「メモ（旅行中の記録）」を追加。既存の note は「備考」（編集画面で設定）。
alter table public.transits
  add column if not exists memo text not null default '';
