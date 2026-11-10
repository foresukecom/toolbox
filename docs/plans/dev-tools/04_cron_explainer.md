# Step 04: cron式解説

> 着手前に [00_overview.md](00_overview.md) の「全エージェント共通ルール」を読むこと。

## 担当

| 項目 | 値 |
|---|---|
| 編集ファイル | `src/views/CronExplainer.vue`（これのみ） |
| ブランチ | `feat/dev-tools-cron` |
| 追加依存 | `cronstrue`, `cron-parser`（Step 01 で導入済み。**追加インストールしない**） |

## 目的

cron 式を日本語で説明し、次回以降の実行日時を一覧表示する。GitHub Actions の `schedule` は **UTC** で解釈されるため、JST との取り違えを防げることを売りにする。

## 着手前の確認（重要）

`cron-parser` はメジャーバージョンで API が異なる。**実装前に必ず確認すること。**

```bash
node -p "require('cron-parser/package.json').version"
```

- v4 系: `parser.parseExpression(expr, { tz, currentDate })` → `.next().toDate()`
- v5 系: `CronExpressionParser.parse(expr, { tz, currentDate })` → `.next().toDate()`

どちらでも `node_modules/cron-parser/README.md` を読んで、実際の API に合わせる。

`cronstrue` の日本語ロケールは `import 'cronstrue/locales/ja'` を読み込んだうえで `cronstrue.toString(expr, { locale: 'ja', use24HourTimeFormat: true })` で使う。import パスは `node_modules/cronstrue/locales/` の中身を見て確認する。

## 機能要件

### 必須

1. **入力**: cron 式のテキスト入力（等幅フォント）。初期値 `0 9 * * 1-5`
2. **説明文**: `cronstrue` による日本語の説明を大きめに表示
3. **フィールド分解表**: 分 / 時 / 日 / 月 / 曜日 の各フィールドの値と意味を表で表示
4. **次回実行日時**: 直近 **10件**を表示
   - タイムゾーン切り替え: `Asia/Tokyo` / `UTC`
   - 各行に JST と UTC の両方を併記（`YYYY-MM-DD (曜) HH:mm`）
5. **「GitHub Actions として解釈」の注意書き**: UTC 選択時に「GitHub Actions の schedule は UTC。JST 9:00 に動かしたいなら `0 0 * * *`」のような説明を出す
6. **プリセット**: クリックで入力に反映するボタン（毎分 `* * * * *` / 毎時0分 `0 * * * *` / 毎日0時 `0 0 * * *` / 平日9時 `0 9 * * 1-5` / 毎月1日 `0 0 1 * *` / 15分ごと `*/15 * * * *`）
7. **エラー表示**: 不正な式は画面を落とさずエラーメッセージを出す

### 任意（余裕があれば）

8. 6フィールド（秒付き）の式への対応と、その旨の表示
9. `@daily` / `@hourly` などのマクロ対応

## 実装メモ

- 次回実行日時は入力とタイムゾーンから求める `computed` にする。基準時刻は `data` に持ち、**`setInterval` での自動更新はしない**（必要なら「今を基準に再計算」ボタン）
- 曜日の `0` と `7` はどちらも日曜。ライブラリの挙動を確認しておく

## 動作確認

基準時刻によって結果は変わるので、**曜日・時刻のパターン**が合っているかを確認する。

| 入力 | TZ | 期待結果 |
|---|---|---|
| `0 9 * * 1-5` | Asia/Tokyo | 平日（月〜金）の JST 09:00 だけが並ぶ。土日は出ない |
| `0 9 * * 1-5` | UTC | UTC 09:00 = JST 18:00 の平日が並ぶ |
| `0 0 * * *` | UTC | 毎日 JST 09:00 |
| `*/15 * * * *` | Asia/Tokyo | :00 / :15 / :30 / :45 が連続する |
| `0 0 1 * *` | Asia/Tokyo | 毎月1日 00:00 |
| `0 0 29 2 *` | Asia/Tokyo | うるう年の2月29日のみ（次は 2028-02-29） |
| `61 * * * *` | — | エラー表示、画面は落ちない |
| `abc` | — | エラー表示 |
| 空文字 | — | 何も表示しない |
| プリセット「15分ごと」クリック | — | 入力が `*/15 * * * *` になり、表示が更新される |
