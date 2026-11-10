# 開発者ツール Wave 1 — 概要と並列実装ガイド

## 背景

[ロードマップ](../../roadmap.md) の優先度「高」6ツールを追加する。今回は [herdr](https://github.com/ogulcancelik/herdr) で AI エージェントを6体並列稼働させて実装する試みを兼ねる。

## 並列化の基本方針

herdr はエージェントごとのターミナル（PTY）を束ねるマルチプレクサで、**ファイルの分離はしない**。同じ作業ツリーで6体が動くと衝突するため、以下の3段構成にする。

```
[Step 01] 準備（直列・1人）
  └ 依存追加 / ルーター・タイトル・ホーム登録 / スタブ6本 を先にコミット
        │
        ├─ worktree A: Step 02 JWT        ─┐
        ├─ worktree B: Step 03 Encode     │
        ├─ worktree C: Step 04 cron       │ 並列（herdr の各ペイン）
        ├─ worktree D: Step 05 Color      │ 各エージェントは自分の .vue 1本だけ編集
        ├─ worktree E: Step 06 Diff       │
        └─ worktree F: Step 07 DataFormat ─┘
                                           │
[Step 08] 統合（直列・1人）  ←──────────────┘
  └ 6ブランチをマージ → lint / build / 動作確認 → PR
```

**ポイント**: 全員が触る共有ファイル（`package.json`, `yarn.lock`, `src/router/*`, `HomePage.vue`, `main.css`）は Step 01 で先に確定させる。並列フェーズでは各エージェントが**自分専用のファイルしか触らない**ので、マージ時にコンフリクトが起きない。

## ツール一覧と担当ファイル

| Step | ツール | 担当ファイル（これのみ編集可） | ルート / name | pageTitles キー | 追加依存 |
|---|---|---|---|---|---|
| [02](02_jwt_decoder.md) | JWTデコーダー | `src/views/JwtDecoder.vue` | `/jwt-decoder` | `jwtDecoder` | なし |
| [03](03_encode_decode.md) | エンコード/デコード | `src/views/EncodeDecode.vue` | `/encode-decode` | `encodeDecode` | なし |
| [04](04_cron_explainer.md) | cron式解説 | `src/views/CronExplainer.vue` | `/cron-explainer` | `cronExplainer` | `cronstrue`, `cron-parser` |
| [05](05_color_converter.md) | カラー変換 | `src/views/ColorConverter.vue` | `/color-converter` | `colorConverter` | なし |
| [06](06_text_diff.md) | テキスト差分 | `src/views/TextDiff.vue` | `/text-diff` | `textDiff` | `diff` |
| [07](07_data_format_converter.md) | YAML/JSON/TOML変換 | `src/views/DataFormatConverter.vue` | `/data-format-converter` | `dataFormatConverter` | `yaml`, `smol-toml` |

## ブランチ構成

| ブランチ | 用途 | 派生元 |
|---|---|---|
| `feat/dev-tools` | 統合ブランチ（Step 01 / 08） | `feat/nix-dev-env`（PR #83。マージ後は `develop`） |
| `feat/dev-tools-jwt` | Step 02 | `feat/dev-tools`（Step 01 完了後） |
| `feat/dev-tools-encode` | Step 03 | 同上 |
| `feat/dev-tools-cron` | Step 04 | 同上 |
| `feat/dev-tools-color` | Step 05 | 同上 |
| `feat/dev-tools-diff` | Step 06 | 同上 |
| `feat/dev-tools-data-format` | Step 07 | 同上 |

## 全エージェント共通ルール

各 Step のプランに加えて、以下を必ず守る。

### 編集範囲

- **編集してよいのは担当ファイル1本のみ。** ロジックが長くなっても別ファイルに分けない（既存 `src/views/` の自己完結型の慣習に合わせる）
- **触ってはいけない**: `package.json`, `yarn.lock`, `src/router/*`, `src/views/HomePage.vue`, `src/assets/css/main.css`, `src/components/*`, 他ツールの `.vue`, `docs/*`
- 既存コンポーネントの **import は可**（例: `@/components/CopyButton.vue` — prop は `textToCopy`）
- 追加の npm パッケージが必要になったら**インストールせず**、コミットメッセージと最終報告に「必要な依存」として書く

### 実装スタイル

- Vue 3 **Options API**（既存ツールに合わせる）。`name` にコンポーネント名を設定
- 画面タイトルはアプリシェル（ヘッダー/パンくず）が表示するので、**`<h1>` は不要**
- ルート要素は `<div class="dev-tool cat-dev">`。アクセントカラーは CSS 変数 `var(--tb-main)` を使う
- レイアウトは Tailwind ユーティリティ、追加スタイルは `<style scoped>`
- 入力は**即時反映**（ボタン不要）。パース失敗は例外で落とさず、入力欄の下にエラーメッセージを表示
- `setInterval` などのタイマーを使う場合は `beforeUnmount` で必ず解除する（過去にタイマーリークのバグあり）
- **外部通信禁止**（`fetch` / `axios` / 外部 CDN）。`localStorage` にも入力を保存しない
- 出力欄には `CopyButton` を付ける

### 完了条件

1. 担当プランの「動作確認」の例がすべて期待どおりになる
2. `yarn lint` がエラー 0
3. `yarn build` が成功
4. `git status` で担当ファイル以外に変更がない
5. 担当ブランチに **commit まで**行う（Conventional Commits・日本語、例: `feat(jwt-decoder): JWTデコーダーを追加`）。**push はしない**

## herdr での運用手順

### 1. Step 01 を完了させる

[01_setup.md](01_setup.md) を1人（人間 or 1エージェント）で実施し、`feat/dev-tools` にコミットする。

### 2. worktree を作る

> **注意**: リポジトリが Dropbox 配下にあるため、worktree（と各 `node_modules`）は **Dropbox の外**に作る。中に作ると同期が大量に走る。

```bash
cd ~/Library/CloudStorage/Dropbox/local_repo/toolbox
mkdir -p ~/worktrees

for t in jwt encode cron color diff data-format; do
  git worktree add -b "feat/dev-tools-$t" ~/worktrees/toolbox-$t feat/dev-tools
  (cd ~/worktrees/toolbox-$t && direnv allow && yarn install)
done
```

- `direnv allow` は Nix 環境（PR #83）が `develop` にマージ済みの場合のみ有効。未マージなら各 worktree で `nix develop ~/Library/CloudStorage/Dropbox/local_repo/toolbox` を使う
- Yarn のキャッシュは共有されるので、2本目以降の `yarn install` は速い

### 3. herdr でエージェントを起動

1 worktree = 1 ペイン。各ペインで worktree に `cd` してから `claude` を起動し、下のプロンプトを渡す。

| ペイン | ディレクトリ | プラン | dev サーバのポート |
|---|---|---|---|
| A | `~/worktrees/toolbox-jwt` | `02_jwt_decoder.md` | 8081 |
| B | `~/worktrees/toolbox-encode` | `03_encode_decode.md` | 8082 |
| C | `~/worktrees/toolbox-cron` | `04_cron_explainer.md` | 8083 |
| D | `~/worktrees/toolbox-color` | `05_color_converter.md` | 8084 |
| E | `~/worktrees/toolbox-diff` | `06_text_diff.md` | 8085 |
| F | `~/worktrees/toolbox-data-format` | `07_data_format_converter.md` | 8086 |

#### エージェントへのプロンプト（テンプレート）

```
docs/plans/dev-tools/00_overview.md の「全エージェント共通ルール」と
docs/plans/dev-tools/<NN_xxx>.md を読んで、そのツールを実装してください。

- 編集してよいのは <担当ファイル> だけです
- dev サーバを起動する場合は `yarn serve --port <ポート>` を使ってください
- 完了条件をすべて満たしたら、現在のブランチに commit してください（push はしない）
- 最後に、実装内容・動作確認の結果・未対応の点を短く報告してください
```

### 4. 監視

herdr のサイドバーで各エージェントの状態（working / blocked / done）を確認する。blocked は権限確認か質問待ちのことが多い。

### 5. 統合

全エージェントが done になったら [08_merge_and_verify.md](08_merge_and_verify.md) を実施する。

## ステップ一覧

1. [01_setup.md](01_setup.md) — 準備（直列）
2. [02_jwt_decoder.md](02_jwt_decoder.md) — JWTデコーダー（並列）
3. [03_encode_decode.md](03_encode_decode.md) — エンコード/デコード（並列）
4. [04_cron_explainer.md](04_cron_explainer.md) — cron式解説（並列）
5. [05_color_converter.md](05_color_converter.md) — カラー変換（並列）
6. [06_text_diff.md](06_text_diff.md) — テキスト差分（並列）
7. [07_data_format_converter.md](07_data_format_converter.md) — YAML/JSON/TOML変換（並列）
8. [08_merge_and_verify.md](08_merge_and_verify.md) — 統合・最終確認（直列）
