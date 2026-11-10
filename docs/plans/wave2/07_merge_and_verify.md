# Step 07: 統合・最終確認

[Wave 1 の統合手順](../dev-tools/08_merge_and_verify.md) と同じ流れで行う。違いは以下。

## 1. 事前チェック

```bash
for t in base csv bootstrap rss images; do
  echo "== feat/wave2-$t"; git diff --stat feat/wave2...feat/wave2-$t
done
```

期待: `base` / `csv` は担当の View 1本、`rss` / `images` は担当の View と自分の関数ディレクトリのみ、`bootstrap` は既存 View・`public/index.html`・`main.css` のみ。

## 2. マージ

`base` → `csv` → `rss` → `images` → `bootstrap` の順でマージする（既存ファイルを触る `bootstrap` を最後にする）。

## 3. 全体確認

1. `yarn lint` / `yarn build` / `just test-functions`
2. `just functions 9999` と `VUE_APP_NETLIFY_FUNCTION_DOMAIN=http://localhost:9999 yarn serve` で起動し、5つの Issue の画面をひと通り確認
3. RSS / 画像の関数に、内部アドレス（`http://127.0.0.1/`、`http://localtest.me/`）を渡して拒否されることを確認
4. Bootstrap 撤去後、ホームと既存ツールの見た目が崩れていないこと

## 4. デプロイ時の注意（PR 本文に書く）

- 関数は別の Netlify サイト（`VUE_APP_NETLIFY_FUNCTION_DOMAIN`）で動いているため、そちらにも `rss-feed` / `page-images` がデプロイされる
- 関数側のサイトに環境変数 `ALLOWED_ORIGINS`（本番のフロントエンドの Origin）を設定する。未設定だと CORS は `*` になる
- 外部 URL を取得する関数なので、デプロイ後に Netlify の関数ログで呼び出し量を確認する

## 5. PR

- 本文に `Closes #15`、`Closes #19`、`Closes #21`、`Closes #36`、`Closes #51` を書く
- 向き先は、PR #87（`feat/dev-tools`）がマージ済みなら `develop`、未マージなら `feat/dev-tools`
