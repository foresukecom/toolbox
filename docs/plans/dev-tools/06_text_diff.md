# Step 06: テキスト差分

> 着手前に [00_overview.md](00_overview.md) の「全エージェント共通ルール」を読むこと。

## 担当

| 項目 | 値 |
|---|---|
| 編集ファイル | `src/views/TextDiff.vue`（これのみ） |
| ブランチ | `feat/dev-tools-diff` |
| 追加依存 | `diff`（jsdiff。Step 01 で導入済み。**追加インストールしない**） |

## 目的

2つのテキストの差分を色分けして表示する。設定ファイルや API レスポンスの比較に使う。

## 着手前の確認

```bash
node -p "require('diff/package.json').version"
```

`node_modules/diff/README.md` で、使用バージョンの `diffLines` / `diffWords` / `diffChars` のオプション（`ignoreWhitespace`, `ignoreCase`, `maxEditLength`, `timeout`, `intlSegmenter` など）の有無を確認してから実装する。

## 機能要件

### 必須

1. **入力**: 左右2つのテキストエリア（「変更前」「変更後」）。「左右入れ替え」ボタン
2. **比較単位**: 行 / 単語 / 文字 の切り替え
3. **オプション**: 空白を無視 / 大文字小文字を無視
4. **表示**
   - 追加は緑背景、削除は赤背景（取り消し線）、変更なしはそのまま
   - 行単位のときは行番号（変更前 / 変更後）を表示
   - 統計: `+N 行 / -N 行`（単語・文字単位では「追加 N / 削除 N」）
5. **完全一致**のときは「差分はありません」と表示
6. **HTML エスケープ**: 差分結果を `v-html` で描画しないこと。`v-for` でパーツごとに `<span>` を出す（XSS 防止）
7. **大きな入力への配慮**: 入力変更時に毎回計算すると重いので、入力はデバウンス（300ms 程度）してから差分を計算する。タイマーは `beforeUnmount` で解除する。ライブラリに `timeout` / `maxEditLength` があれば設定し、打ち切られたら「差分が大きすぎます」と表示する

### 任意（余裕があれば）

8. 左右並び（side-by-side）表示と、上下（unified）表示の切り替え
9. 日本語の単語単位差分: `Intl.Segmenter('ja', { granularity: 'word' })` が使えれば利用する（ライブラリが `intlSegmenter` オプションに対応していればそれを使う）
10. unified diff 形式（`createTwoFilesPatch`）でのコピー

## UI 構成

```
[ 変更前 textarea ]   [ 変更後 textarea ]
              [⇄ 左右入れ替え]
単位: (•) 行 ( ) 単語 ( ) 文字   [ ] 空白を無視  [ ] 大文字小文字を無視

+1 行 / -1 行
  1  1   apple
  2    - banana
     2 + blueberry
  3  3   cherry
```

## 動作確認

| 変更前 | 変更後 | 設定 | 期待結果 |
|---|---|---|---|
| `apple\nbanana\ncherry` | `apple\nblueberry\ncherry` | 行 | `banana` が削除、`blueberry` が追加、`+1 / -1` |
| 同じテキスト | 同じテキスト | 行 | 「差分はありません」 |
| `Hello World` | `Hello  World` | 行 + 空白を無視 | 差分なし |
| `Hello` | `hello` | 文字 + 大文字小文字を無視 | 差分なし |
| `今日は晴れです` | `今日は雨です` | 文字 | `晴れ` が削除、`雨` が追加 |
| `👍OK` | `👎OK` | 文字 | 絵文字が文字化けせずに表示される（サロゲートペアが分断されない） |
| `<script>alert(1)</script>` | `<b>x</b>` | 行 | タグが文字列として表示され、スクリプトは実行されない |
| 1万行程度のテキスト同士 | — | 行 | 入力中に固まらない |
| 左右入れ替えボタン | — | — | 入力が入れ替わり、追加と削除が反転する |
