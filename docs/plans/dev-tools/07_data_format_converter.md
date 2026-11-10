# Step 07: YAML/JSON/TOML変換

> 着手前に [00_overview.md](00_overview.md) の「全エージェント共通ルール」を読むこと。

## 担当

| 項目 | 値 |
|---|---|
| 編集ファイル | `src/views/DataFormatConverter.vue`（これのみ） |
| ブランチ | `feat/dev-tools-data-format` |
| 追加依存 | `yaml`, `smol-toml`（Step 01 で導入済み。**追加インストールしない**） |

## 目的

設定ファイルでよく使う YAML / JSON / TOML を相互に変換する。既存の `JsonFormatter.vue` は変更しない（共存させる）。

## 着手前の確認

`node_modules/yaml/README.md` と `node_modules/smol-toml/README.md` で、`parse` / `stringify` の API とエラーオブジェクトの形（行番号・列番号の取り方）を確認する。

## 機能要件

### 必須

1. **入力形式**: 自動判定 / JSON / YAML / TOML
   - 自動判定: 先頭の空白を除いて `{` か `[` で始まるなら JSON → TOML として parse 成功なら TOML → それ以外は YAML
   - 判定結果を「判定: YAML」のように表示する
2. **出力形式**: JSON / YAML / TOML（入力と同じ形式を選んだ場合は整形として動く）
3. **インデント**: 2 / 4（JSON・YAML に適用）
4. **エラー表示**: パースエラーは**行番号・列番号付き**で表示する（ライブラリのエラーから取得できる範囲で）
5. **TOML 出力の制約への対応**
   - TOML はトップレベルがテーブル（オブジェクト）でないと表せない → 配列やスカラーなら「TOML のトップレベルはテーブルである必要があります」と表示
   - TOML は `null` を表せない → `null` を含む場合はエラーメッセージを表示（どのキーかわかれば表示）
6. **日時の扱い**: TOML の日時型を JSON に出すときは ISO 8601 文字列にする
7. 出力に `CopyButton`
8. **入出力の入れ替え**ボタン（出力を入力に移し、形式も入れ替える）

### 任意（余裕があれば）

9. 複数ドキュメントの YAML（`---` 区切り）を JSON 配列として出力
10. JSON のキーをソートするオプション

## UI 構成

```
入力: [自動判定 ▼] (判定: YAML)        出力: [JSON ▼]  インデント: [2 ▼]  [⇄]
[ 入力 textarea                ]   [ 出力 textarea (readonly) ] [copy]
(エラー: 3行目 5列目: ...)
```

## 動作確認

入力 JSON:

```json
{"name":"toolbox","tags":["vue","nix"],"port":8080,"debug":false}
```

| 操作 | 期待結果 |
|---|---|
| 上の JSON → YAML | `name: toolbox` / `tags:` + `  - vue` + `  - nix` / `port: 8080` / `debug: false` |
| 上の JSON → TOML | `name = "toolbox"` / `tags = ["vue", "nix"]`（空白の入り方はライブラリ依存で可）/ `port = 8080` / `debug = false` |
| 上の YAML 出力を入力して → JSON | 元の JSON と同じ内容（整形済み） |
| 自動判定に `title = "x"` | 判定: TOML |
| 自動判定に `a: 1` | 判定: YAML |
| `{"a": null}` → TOML | null を表せない旨のエラー、画面は落ちない |
| `[1, 2, 3]` → TOML | トップレベルがテーブルでない旨のエラー |
| TOML `date = 2026-11-10T09:00:00+09:00` → JSON | `"date": "2026-11-10T09:00:00+09:00"` 相当の ISO 文字列 |
| YAML `a: [1, 2` | 行・列付きのパースエラー |
| インデント 4 で JSON 出力 | 4スペースインデントになる |
| 入れ替えボタン | 出力が入力に移り、入力形式と出力形式が入れ替わる |
