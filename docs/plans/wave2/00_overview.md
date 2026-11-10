# Wave 2（GitHub Issue 対応）— 概要と並列実装ガイド

## 背景

GitHub の未対応 Issue 5件を、herdr で5体のエージェントを並列稼働させて実装する。進め方は [Wave 1](../dev-tools/00_overview.md) と同じで、**準備（直列）→ 実装（並列）→ 統合（直列）** の3段構成にする。

## 対象 Issue と担当

| Step | Issue | 内容 | エージェント | 担当ファイル（これのみ編集可） | dev ポート | 関数ポート |
|---|---|---|---|---|---|---|
| [02](02_base_converter.md) | #36 | 2/8/10/16進数変換 | `base` | `src/views/BaseConverter.vue` | 8091 | — |
| [03](03_csv_formatter.md) | #15 | CSV整形 | `csv` | `src/views/CsvFormatter.vue` | 8092 | — |
| [04](04_remove_bootstrap.md) | #51 | Bootstrap 撤去（Tailwind へ置き換え） | `bootstrap` | 既存 View の Bootstrap クラス部分、`public/index.html`、`src/assets/css/main.css` | 8093 | — |
| [05](05_rss_reader.md) | #21 | RSSフィードの検索・取得 | `rss` | `src/views/RssReader.vue`、`netlify/functions/rss-feed/` | 8094 | 9994 |
| [06](06_page_image_metadata.md) | #19 | Webページ内の全画像のメタデータ | `images` | `src/views/PageImageMetadata.vue`、`netlify/functions/page-images/` | 8095 | 9995 |

`bootstrap` だけは既存ファイルを触る。ほかの4体は新規ファイルしか触らないので、ぶつからない。

## Step 01 で準備済みのもの

| 項目 | 内容 |
|---|---|
| 依存 | `papaparse` 5.7.0、`exifr` 7.1.3、`node-html-parser` 9.0.7、`fast-xml-parser` 5.12.0 |
| スタブ | 上記4つの新規 View（「準備中」） |
| 登録 | ルート、ページタイトル、ホーム（基数変換→数値ツール、CSV整形→開発者ツール、RSS・画像→新カテゴリ「Webツール」`cat-web`） |
| 共通ライブラリ | [`netlify/lib/safe-fetch.js`](../../../netlify/lib/safe-fetch.js)（外部 URL の安全な取得。テストは `just test-functions`） |
| 関数の簡易サーバ | [`scripts/functions-dev.js`](../../../scripts/functions-dev.js)（`just functions <port>`） |
| 環境変数 | `.env.sample` に `ALLOWED_ORIGINS`（関数の CORS 許可 Origin） |

## 全エージェント共通ルール

[Wave 1 の共通ルール](../dev-tools/00_overview.md#全エージェント共通ルール) に従う。違いは以下。

- **編集範囲は上の表の「担当ファイル」**。`rss` と `images` は、自分の関数ディレクトリ（`netlify/functions/<name>/`）にファイルを作ってよい
- `rss` と `images` は、外部 URL の取得に**必ず `netlify/lib/safe-fetch.js` の `safeFetch` を使う**。`fetch` / `axios` / `http.request` で直接取りに行かない。ライブラリ自体は編集しない（直したい点があれば最終報告に書く）
- 関数のレスポンスは JSON のみ。取得した HTML や画像をそのまま返さない（汎用プロキシにしない）
- CORS ヘッダーとエラー応答は、ライブラリの `corsHeaders(event)` / `errorResponse(event, err)` を使う
- 画面側で外部の URL をリンクとして表示するときは、`http:` / `https:` 以外のリンクを作らない（`javascript:` 対策）。`target="_blank"` には `rel="noopener noreferrer"` を付ける
- `v-html` は使わない

### 関数つきツールのローカル確認（`rss` / `images`）

```bash
# 1. 関数の簡易サーバ（別ペインで）
just functions 9994

# 2. 関数だけ確認
curl 'http://localhost:9994/.netlify/functions/rss-feed?url=https://example.com/'

# 3. 画面とつないで確認
VUE_APP_NETLIFY_FUNCTION_DOMAIN=http://localhost:9994 yarn serve --port 8094
```

Netlify の同期関数は**10秒でタイムアウト**する。処理時間の上限はこれを前提に決める。

## herdr での運用

- worktree: `~/worktrees/toolbox-w2-<エージェント名>`、ブランチ `feat/wave2-<エージェント名>`（派生元 `feat/wave2`）
- ワークスペース名: `w2-<エージェント名>`
- プロンプトは Wave 1 と同じテンプレートを使う（計画ファイルのパスとポートを差し替える）

## 統合

全員が完了したら [07_merge_and_verify.md](07_merge_and_verify.md) を実施する。
