# Step 05: RSSフィードの検索・取得（Issue #21）

> 着手前に [00_overview.md](00_overview.md) の「全エージェント共通ルール」と「関数つきツールのローカル確認」を読むこと。

## 担当

| 項目 | 値 |
|---|---|
| 編集ファイル | `src/views/RssReader.vue`、`netlify/functions/rss-feed/`（新規） |
| ブランチ | `feat/wave2-rss` |
| 追加依存 | `fast-xml-parser`、`node-html-parser`（Step 01 で導入済み） |
| ポート | dev 8094 / 関数 9994 |

## 目的

URL を入れると、そのサイトの RSS / Atom フィードを見つけて、記事の一覧を表示する。ブラウザからは CORS で他サイトを直接読めないので、Netlify Function で取得・解析して JSON で返す。

## 関数 `rss-feed`

ファイル: `netlify/functions/rss-feed/rss-feed.js`（`exports.handler`）

### リクエスト

`GET /.netlify/functions/rss-feed?url=<URL>`

### 処理

1. `url` がなければ 400。`OPTIONS` には CORS ヘッダー付きの 204 を返す
2. `safeFetch(url, { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8', maxBytes: 2MB, timeoutMs: 4000 })`
3. **HTML だった場合（フィードの検索）**
   - `<link rel="alternate" type="application/rss+xml | application/atom+xml">` を集め、`href` を取得後の URL 基準で絶対 URL にする
   - 見つからなければ、同じオリジンの `/feed`、`/rss.xml`、`/atom.xml`、`/index.xml`、`/feed.xml` を順に試す（**最大5件、合計の処理時間は8秒以内**）
   - 見つかった候補のうち、先頭のフィードを取得して解析する
4. **XML の解析**（`fast-xml-parser`）
   - RSS 2.0（`rss.channel.item`）、RSS 1.0 / RDF（`rdf:RDF.item`）、Atom（`feed.entry`）に対応
   - 次の形に正規化する。記事は**最大50件**
   - `summary` は HTML タグを除いたプレーンテキストで、300文字まで
   - 日付は ISO 8601 に変換する。解釈できなければ `null`
5. フィードとして解釈できなければ `{ error: 'not_feed' }` を 422 で返す
6. `safeFetch` の例外は `errorResponse(event, err)` で返す

### レスポンス（200）

```json
{
  "source": "https://example.com/",
  "discovered": [
    { "title": "Example Blog", "url": "https://example.com/feed.xml", "type": "rss" }
  ],
  "feed": {
    "url": "https://example.com/feed.xml",
    "type": "rss",
    "title": "Example Blog",
    "siteUrl": "https://example.com/",
    "description": "...",
    "updated": "2026-11-10T00:00:00.000Z",
    "items": [
      { "title": "記事", "link": "https://example.com/post/1", "published": "2026-11-09T12:00:00.000Z", "author": "...", "summary": "..." }
    ]
  }
}
```

`discovered` は、入力がフィードそのものだった場合は空配列でよい。

## 画面 `RssReader.vue`

1. URL の入力欄と「取得」ボタン（入力のたびに通信しない。Enter キーでも取得）
2. 取得中の表示、エラーメッセージ（`error` コードを日本語に変換: `blocked_url` → 「この URL は取得できません」、`not_found` → 「ホスト名を解決できません」、`not_feed` → 「フィードが見つかりませんでした」など）
3. `discovered` が2件以上なら候補を一覧で出し、選ぶとその URL で取得し直す
4. フィードの情報（タイトル、サイト URL、更新日時、記事数）と、記事一覧（タイトルのリンク、公開日時を JST で表示、著者、要約）
5. 「フィード URL をコピー」ボタン
6. 注意書き: 「入力した URL は、取得のためにこのサイトのサーバー（Netlify Functions）から取得先にアクセスします」
7. リンクは `http:` / `https:` のみ。`target="_blank" rel="noopener noreferrer"`
8. 関数の URL は `${process.env.VUE_APP_NETLIFY_FUNCTION_DOMAIN}/.netlify/functions/rss-feed`（`ClientInfo.vue` と同じ方式）

## 動作確認

### 関数（curl）

| 入力 `url` | 期待結果 |
|---|---|
| `https://github.blog/` | `discovered` にフィードがあり、`feed.items` に記事が入る |
| `https://github.blog/feed/` | フィードを直接解析する（`discovered` は空） |
| Atom のフィード（例: `https://github.com/nodejs/node/releases.atom`） | `type: "atom"` で記事が入る |
| `https://example.com/` | `not_feed`（422） |
| `http://127.0.0.1/` | `blocked_address`（400） |
| `http://localtest.me/` | `blocked_address`（400） |
| `file:///etc/passwd` | `blocked_url`（400） |
| `url` なし | 400 |
| どのケースも | 処理時間が8秒以内（`just functions` のログで確認） |

### 画面

- フィードのある URL で記事一覧が表示される
- 候補が複数あるサイトで切り替えられる
- エラー時にメッセージが出て、画面は落ちない
- 記事の要約に HTML タグが文字として出ない（サーバー側で除去済み）
