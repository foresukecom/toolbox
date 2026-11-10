# Step 06: Webページ内の全画像のメタデータ（Issue #19）

> 着手前に [00_overview.md](00_overview.md) の「全エージェント共通ルール」と「関数つきツールのローカル確認」を読むこと。

## 担当

| 項目 | 値 |
|---|---|
| 編集ファイル | `src/views/PageImageMetadata.vue`、`netlify/functions/page-images/`（新規） |
| ブランチ | `feat/wave2-images` |
| 追加依存 | `node-html-parser`、`exifr`（Step 01 で導入済み） |
| ポート | dev 8095 / 関数 9995 |

## 目的

Web ページの URL を入れると、ページ内の画像を集めて、それぞれの EXIF などのメタデータを一覧表示する。「自分のサイトの画像に位置情報が残っていないか」の確認に使える。

## 関数 `page-images`

ファイル: `netlify/functions/page-images/page-images.js`（`exports.handler`）

### リクエスト

`GET /.netlify/functions/page-images?url=<URL>`

### 処理

Netlify の同期関数は10秒で打ち切られるため、**全体で8秒以内**に返す。

1. `url` がなければ 400。`OPTIONS` には CORS ヘッダー付きの 204 を返す
2. `safeFetch(url, { accept: 'text/html', maxBytes: 2MB, timeoutMs: 3000 })`。HTML でなければ `{ error: 'not_html' }` を 422 で返す
3. **画像の収集**（`node-html-parser`）
   - `<img src>`、`<img srcset>` と `<source srcset>`（各候補の先頭）、`<meta property="og:image">`
   - 取得後の URL 基準で絶対 URL にし、重複を除く。`http:` / `https:` のみ対象にする。`data:` URI は件数だけ数える
   - **最大20件**。それを超えた分は件数だけ返す
4. **メタデータの取得**（同時に4件まで）
   - `safeFetch(imgUrl, { accept: 'image/*', maxBytes: 256KB, truncate: true, timeoutMs: 3000 })`。EXIF はファイルの先頭にあるので、先頭だけ読めば足りる
   - `exifr.parse(buffer, { tiff: true, exif: true, gps: true, xmp: false, icc: false })`
   - 返す項目: `Make`、`Model`、`LensModel`、`DateTimeOriginal`、`Software`、`Artist`、`Copyright`、`ImageWidth` / `ImageHeight`（または `ExifImageWidth` / `ExifImageHeight`）、GPS（`latitude` / `longitude`）
   - EXIF がない、読めない場合は `metadata: null` にし、`note` に理由を書く（形式が非対応・先頭だけでは読めなかった、など）
   - 開始から7秒を過ぎたら、新しい画像の取得は始めずに `skipped` として返す
5. `safeFetch` の例外は `errorResponse(event, err)` で返す。画像1件ごとの失敗は、その画像の `error` に入れる（全体は失敗にしない）

### レスポンス（200）

```json
{
  "page": "https://example.com/",
  "title": "ページのタイトル",
  "found": 35,
  "dataUriCount": 2,
  "images": [
    {
      "url": "https://example.com/a.jpg",
      "alt": "代替テキスト",
      "contentType": "image/jpeg",
      "bytesRead": 262144,
      "truncated": true,
      "hasGps": true,
      "metadata": { "Make": "Apple", "Model": "iPhone 15", "DateTimeOriginal": "2026-11-01T10:00:00.000Z", "latitude": 35.68, "longitude": 139.76 },
      "note": null,
      "error": null
    }
  ],
  "skipped": 15
}
```

## 画面 `PageImageMetadata.vue`

1. URL の入力欄と「取得」ボタン（Enter キーでも取得）
2. 取得中の表示とエラーメッセージ（コードを日本語に変換）
3. 概要: ページのタイトル、見つかった画像数、調べた数、スキップした数、**位置情報を含む画像の数**（1件以上なら目立つ警告色で表示）
4. 画像ごとのカード: 画像の URL（リンク）、alt、形式、主なメタデータ、GPS の有無と座標
5. フィルター: すべて / メタデータあり / 位置情報あり
6. **サムネイルは初期状態では表示しない**。「サムネイルを表示」スイッチを ON にしたときだけ `<img>` で読み込む（ON にするとブラウザから取得先へ直接アクセスする旨を注記する）
7. 地図は表示しない（座標の数値のみ）
8. 注意書き: 「入力した URL と画像は、このサイトのサーバー（Netlify Functions）から取得します」
9. リンクは `http:` / `https:` のみ。`target="_blank" rel="noopener noreferrer"`
10. 関数の URL は `${process.env.VUE_APP_NETLIFY_FUNCTION_DOMAIN}/.netlify/functions/page-images`

## 動作確認

### 関数（curl）

| 入力 `url` | 期待結果 |
|---|---|
| EXIF 付きの画像が載っているページ（例: Wikimedia Commons の写真のファイルページ） | 少なくとも1件で `metadata` に `Make` / `Model` などが入る |
| 画像の多いページ（例: `https://github.com/`） | `images` は最大20件、超えた分が `skipped` などに数えられる。8秒以内に返る |
| `https://example.com/` | `images` が空で正常終了 |
| 画像ファイルの URL を直接指定 | `not_html`（422） |
| `http://127.0.0.1/`、`http://localtest.me/` | `blocked_address`（400） |
| ページ内の画像が内部アドレスを指している場合 | その画像だけ `error` が入り、全体は成功する |
| `url` なし | 400 |

### 画面

- 概要とカードが表示され、フィルターで絞り込める
- サムネイルは、スイッチを ON にするまで取得先への通信が発生しない（Network タブで確認）
- エラー時にメッセージが出て、画面は落ちない
