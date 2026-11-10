# Step 04: Bootstrap 撤去（Issue #51）

> 着手前に [00_overview.md](00_overview.md) の「全エージェント共通ルール」を読むこと。

## 担当

| 項目 | 値 |
|---|---|
| 編集ファイル | 既存の View / コンポーネントの Bootstrap クラスを使っている箇所、`public/index.html`、`src/assets/css/main.css` |
| 触らないファイル | Wave 2 の新規 View 4本（`BaseConverter` / `CsvFormatter` / `RssReader` / `PageImageMetadata`）、`src/router/*`、`HomePage.vue` の `categories` 配列 |
| ブランチ | `feat/wave2-bootstrap` |
| 追加依存 | なし |

## 目的

Issue #51「スタイルを Tailwind で指定する」への対応。現在は `public/index.html` で Bootstrap 5.3.0-alpha1 を CDN から読み込んでいるが、Bootstrap のクラスを使っている画面はごく一部しかない。Bootstrap を撤去し、その部分を Tailwind で書き直す。

ブログ風 UI の独自 CSS（`main.css` の `.blog-*` / `.unit-converter` など）は今のデザイン方針なので**そのまま残す**。

## 作業内容

1. **使用箇所の洗い出し**: `src/` 全体で Bootstrap のクラスを使っている箇所を探す。最低限、以下は確認済み
   - `src/views/TimeIssues.vue`: `container` / `row` / `row-cols-1` / `col` / `card` / `card-body` / `card-title` / `card-text` / `text-muted`
   - `src/views/BirthdateInfo.vue`: `card` / `card-header` / `list-group` / `list-group-flush` / `list-group-item`
   - ほかにも `btn` / `form-control` / `table` / `badge` / `alert` / `d-flex` などがないか探す。`container` や `mb-4` のように **Tailwind にも同名のクラスがあるもの**は、どちらの意味で使われているかを見て判断する
2. **Tailwind に置き換え**: 見た目が大きく変わらないように書き換える。`BirthdateInfo.vue` のインライン style（`width: 20%` など）でスマホ幅が崩れているなら、合わせて直してよい
3. **CDN の削除**: `public/index.html` から Bootstrap の `<link>` を削除する。Material Icons の `<link>` も、`src/` で使われていなければ削除する（`material-icons` クラスや `<span class="material-icons">` を検索して確認）
4. **全体の見た目の確認**: Bootstrap の CSS はリセット用のスタイル（Reboot）も含んでいるため、外すと**全画面**のフォント・余白・見出し・リンク・表の見た目が変わる可能性がある
   - 撤去の前後で、全ルートのスクリーンショットを撮って比べる（ヘッドレス Chrome。`playwright-core` を scratchpad に入れて使ってよい。リポジトリには追加しない）
   - 崩れた箇所は、該当 View の Tailwind クラスか `main.css` で直す
   - 比べた結果（変化があった画面と対応内容）を最終報告に書く

## 動作確認

| 確認 | 期待結果 |
|---|---|
| `grep -rn bootstrap public src` | 何も出ない |
| `/time-issues` | カードが縦に並び、名前・説明・期限・残り時間が読める |
| `/birthdate-info` | 星座・干支・曜日のカードが表示され、スマホ幅でも崩れない |
| 全ルートの撤去前後スクリーンショット | 意図しない崩れがない（変化は報告に記載） |
| DevTools の Network | `cdn.jsdelivr.net` への通信がない |
| `yarn lint` / `yarn build` | 成功 |
