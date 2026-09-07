# 旅のしおり

日程・人数・行きたい場所を入力すると、AI が旅行プランを 5 案提示。選択・手動編集を経て「旅のしおり」を完成させ、**PIN コード付きの共有 URL** で同行者と共有できる Web アプリです。旅行中も感想メモを追記でき、作成したしおりは履歴として残ります。

- フロントエンド：**Next.js（App Router / 静的エクスポート）** → **GitHub Pages** に GitHub Actions で自動デプロイ
- バックエンド：**Supabase**（Postgres + Auth + Edge Functions）
- AI：**Anthropic API（Claude）** を Edge Function 経由で呼び出し（API キーはサーバーに秘匿）

> **デモモード**：`NEXT_PUBLIC_SUPABASE_URL` が未設定でもアプリは起動します。その場合、AI 提案はテンプレート生成、データはブラウザの `localStorage` にのみ保存され、共有 URL は同一ブラウザ内でのみ開けます。まず動きを見たいときはこのモードでどうぞ。

---

## 画面フロー

| 画面 | パス | 内容 |
| --- | --- | --- |
| ① 入力 | `/` | 目的地・日程・到着/出発予定・人数（子どもは年齢）・行きたい場所 |
| ② プラン提案 | `/plans` | AI が 5 案をカード表示（王道／子連れ省エネ／グルメ／定番×穴場／弾丸）。AI 提案スポットは ✦ で区別 |
| ③ 選択・編集 | `/edit`（`?id=` で作成後の再編集） | タイムラインでスポット／宿泊先の追加・削除・時刻調整、D&D 並べ替え、別の日へ移動、移動ブロックの挿入。移動手段を選ぶと所要時間の AI 概算（本番接続時）。各項目に「備考」を設定（しおりに表示） |
| ④ 完成しおり | `/itinerary/?id=…` | 表紙・日別タイムライン・持ち物メモ・共有セクション（URL＋PIN）。旅程では各項目に「メモ（旅行中の記録）」を追記可。「しおりを編集する」で ③ を再オープン |
| 共有・閲覧 | `/share/?id=…` | まず PIN 入力 → サーバー側で照合してからデータ返却。PIN を知る人は各項目の「メモ」を編集可 |
| 履歴 | `/history` | ログイン中ユーザーが作成したしおり一覧 |
| ログイン | `/login` | メールアドレス＋パスワード（メール送信なし。iOS ホーム画面追加でも可）。履歴保存のためだけに使用 |

---

## 本番公開チェックリスト（GitHub Pages + Supabase）

1. **GitHub**：リポジトリを作成し `main` に push（下記「1. リポジトリ用意」）。Settings → Pages → Source を **GitHub Actions** に。
2. **Supabase プロジェクト作成** → SQL Editor で `supabase/migrations/` を **0001〜0004 の順**に実行。
3. **Anthropic**：`supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`（任意で `ANTHROPIC_MODEL`）。
4. **Edge Functions デプロイ**：`supabase link` 後に `bash scripts/deploy-functions.sh`（7 関数）。
5. **GitHub Secrets**（Settings → Secrets and variables → Actions）：`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
6. **Supabase Auth**：Authentication → Providers → Email で「Confirm email」を OFF（メール＋パスワードでログイン。詳細は 3-3）。
7. `main` に push すると Actions がビルドして公開。数分後 `https://<you>.github.io/<repo>/` で確認。

> 独自ドメイン／ユーザーページ（`<you>.github.io`）の場合は `.github/workflows/deploy.yml` の `NEXT_PUBLIC_BASE_PATH` を空にする。

---

## セットアップ

### 0. 必要なもの

- Node.js 20+
- Supabase プロジェクト（無料枠で可）
- Anthropic API キー
- GitHub リポジトリ（Pages 有効化）

### 1. リポジトリ用意

```bash
git init
git add .
git commit -m "init: 旅のしおり"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. ローカル起動（デモモード）

```bash
npm install
npm run dev
# http://localhost:3000 → そのまま①〜④を通しで試せる（AI はテンプレート、保存は localStorage）
```

### 3. Supabase を接続する

#### 3-1. スキーマ作成

`supabase/migrations/` の SQL を **番号順に**実行します（Supabase ダッシュボードの **SQL Editor** に貼り付け、または Supabase CLI で `supabase db push`）。

1. [`0001_init.sql`](supabase/migrations/0001_init.sql) — テーブル・RLS
2. [`0002_spot_kind.sql`](supabase/migrations/0002_spot_kind.sql) — `spots.kind`
3. [`0003_spot_kind_endpoints.sql`](supabase/migrations/0003_spot_kind_endpoints.sql) — 出発地・到着地の種別
4. [`0004_transit_memo.sql`](supabase/migrations/0004_transit_memo.sql) — `transits.memo`

#### 3-2. Edge Functions をデプロイ

Supabase CLI は `npx supabase@latest`（Docker 不要）。`<ref>` は Supabase の **Project Settings → General → Reference ID**。

```bash
npx supabase@latest login                       # 初回のみ。ブラウザで承認

# AI キーなどのシークレット（関数側だけで使用）
npx supabase@latest secrets set --project-ref <ref> ANTHROPIC_API_KEY=sk-ant-xxxxx
npx supabase@latest secrets set --project-ref <ref> ANTHROPIC_MODEL=claude-sonnet-5   # 任意

# 7 関数を一括デプロイ
bash scripts/deploy-functions.sh <ref>
# 個別なら: npx supabase@latest functions deploy generate-plans --project-ref <ref> --no-verify-jwt  …（7本）
```

> `supabase link`（DBパスワードが必要）は不要です。`--project-ref` を各コマンドに渡します。
> `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` はデプロイ済み関数に自動注入されます。設定不要です。
> 認証は関数内で行うため全関数 `--no-verify-jwt`（`create-itinerary` / `reset-pin` は関数内で JWT 検証、
> `get-shared` / `update-shared` は PIN 照合）。

#### 3-3. Auth 設定（メール＋パスワード）

ログインは**メールアドレス＋パスワード**方式（メール送信ゼロ。iOS のホーム画面追加でも動き、無料枠のメール送信制限も無関係）。

- **Authentication → Providers → Email** で **「Confirm email」を OFF** にする
  （家族・個人利用向け。確認メールを送らず、登録した瞬間からログイン可能）。
- Confirm email を ON のままにすると登録時に確認メールが飛び、無料枠の送信制限に当たりやすい。ON で運用するなら Authentication → SMTP で独自 SMTP を設定する。

#### 3-4. ローカルで Supabase モードを使う場合

`.env.local` を作成：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
# ローカルは basePath なし
NEXT_PUBLIC_BASE_PATH=
```

### 4. GitHub Pages へデプロイ

1. リポジトリ **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定。
2. リポジトリ **Settings → Secrets and variables → Actions** に登録：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `main` に push すると [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) が走り、`https://<you>.github.io/<repo>/` に公開されます。

`basePath` はワークフローが `/<repo>` を自動設定します。**ユーザーページ**（`<you>.github.io`）や**独自ドメイン**の場合は、ワークフローの `NEXT_PUBLIC_BASE_PATH` を空にしてください。

---

## データモデル

| テーブル | 主なカラム |
| --- | --- |
| `itineraries` | `id, user_id, title, destination(jsonb), start_date, end_date, arrival_time, departure_time, adults, children(jsonb: 年齢配列), packing_notes, plan_meta(jsonb), pin_hash, pin_salt, created_at` |
| `days` | `id, itinerary_id, day_index, date, theme` |
| `spots` | `id, day_id, order, kind('spot'\|'hotel'\|'departure'\|'arrival'), time, name, note(備考), memo(旅行中メモ), is_ai_suggested` |
| `transits` | `id, day_id, order, mode, duration, note(備考=列車番号等), memo(旅行中メモ)` |
| `pin_attempts` | `itinerary_id, client_key, fail_count, locked_until`（PIN 試行回数制限） |

スポットと移動は同じ `day_id` 配下で `order` により表示順を制御し、タイムライン上で交互に描画します。

---

## セキュリティ

- **PIN は 4 桁**。作成時に自動発行（画面で表示、手動変更も可）。
- **PIN は PBKDF2-SHA256 でハッシュ化して保存**。平文は保持しません（`get-shared` / `update-shared` でサーバー照合）。
- **PIN 照合はサーバー側のみ**。不一致時はしおりデータを一切返しません。
- **試行回数制限**：同一クライアント（IP のハッシュをキー）で 5 回失敗すると 10 分ロック。
- RLS により、所有者は自分のしおりだけを読み書き可能。共有アクセスは Edge Function（service role）が PIN 照合後にのみデータを返します。
- 共有 URL と PIN は**別チャネルで伝える**運用前提（UI にも明記）。

---

## デザイン

パスポート／旅行ジャーナル風。ネイビー（表紙・共有欄）、生成りのペーパー（本文）、ブラス（金）のアクセント、判子のような朱赤（スタンプ・感想メモ）。見出しは明朝体（Shippori Mincho）、本文はゴシック体（Zen Kaku Gothic New）。タイムラインは縦ライン＋ドット、感想メモは付箋風（少し傾ける）。

---

## ディレクトリ

```
app/                     画面（App Router, 全て client component）
components/               UI コンポーネント（タイムライン, D&D 編集, PIN 入力 等）
lib/                      型・状態管理(zustand)・API 抽象（Supabase/デモ両対応）
supabase/
  migrations/             0001_init 〜 0004_transit_memo（番号順に実行）
  functions/              Edge Functions（Deno / TypeScript）
    generate-plans/       ② 5案生成
    estimate-transit/     ③ 前後スポットから移動所要時間を AI で概算
    format-itinerary/     ④ しおり整形（新規スポットは追加しない）
    create-itinerary/     保存 + PIN 発行（要ログイン）
    reset-pin/            PIN 再発行（所有者のみ）
    get-shared/           PIN 照合 → しおり返却
    update-shared/        PIN 照合 → スポット・移動の「メモ」更新
    _shared/              CORS / PIN ハッシュ / Anthropic / レート制限 等
scripts/deploy-functions.sh  Edge Functions を一括デプロイ
.github/workflows/deploy.yml
```

## npm スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 静的エクスポート（`out/` を生成） |
| `npm run lint` | ESLint |
