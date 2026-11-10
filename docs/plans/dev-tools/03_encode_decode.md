# Step 03: エンコード/デコード

> 着手前に [00_overview.md](00_overview.md) の「全エージェント共通ルール」を読むこと。

## 担当

| 項目 | 値 |
|---|---|
| 編集ファイル | `src/views/EncodeDecode.vue`（これのみ） |
| ブランチ | `feat/dev-tools-encode` |
| 追加依存 | なし |

## 目的

Base64 / URL / HTML エンティティのエンコードとデコードを1画面で行う。日本語（UTF-8）を正しく扱えることを重視する。

## 機能要件

### 必須

1. **方式の切り替え**（タブ or ラジオボタン）
   - Base64
   - Base64URL（`+`→`-`、`/`→`_`、`=` を除去）
   - URL（`encodeURIComponent`）
   - URL（`encodeURI`、URL 全体用）
   - HTML エンティティ
2. **方向の切り替え**: エンコード ⇔ デコード。「入れ替え」ボタンで出力を入力に移して方向を反転する
3. **UTF-8 対応**: Base64 は `TextEncoder` → バイト列 → `btoa`、デコードは `atob` → バイト列 → `TextDecoder('utf-8', { fatal: true })`。UTF-8 として不正なら「UTF-8 として解釈できません」と表示する
4. **HTML エンティティ**
   - エンコード: `& < > " '` の5文字を `&amp; &lt; &gt; &quot; &#39;` に変換
   - デコード: 名前付き（`&amp;` など）・10進（`&#12354;`）・16進（`&#x3042;`）に対応。`DOMParser` を使ってもよいが、**`innerHTML` に入力を直接入れない**こと（XSS 防止）
5. **エラー表示**: 不正な Base64、不正な `%` シーケンス（`decodeURIComponent` の `URIError`）などは画面を落とさずメッセージを出す
6. 出力に `CopyButton`

### 任意（余裕があれば）

7. **画像 → Data URI**: ファイル選択（`<input type="file" accept="image/*">`）→ `FileReader.readAsDataURL` → Data URI を表示し、プレビュー画像を出す。2MB 超なら警告する
8. Base64 デコード結果がテキストでない場合（`fatal` で失敗した場合）に16進ダンプを表示する

## UI 構成

```
方式: (•) Base64 ( ) Base64URL ( ) URL(Component) ( ) URL(全体) ( ) HTML
方向: (•) エンコード ( ) デコード    [⇅ 入れ替え]

[ 入力テキストエリア ]
(エラーメッセージ)
[ 出力テキストエリア(readonly) ] [copy]

(任意) ## 画像 → Data URI
[ファイル選択]  <プレビュー>  [ data:image/png;base64,... ] [copy]
```

## 動作確認

| 方式 / 方向 | 入力 | 期待出力 |
|---|---|---|
| Base64 / エンコード | `こんにちは` | `44GT44KT44Gr44Gh44Gv` |
| Base64 / デコード | `44GT44KT44Gr44Gh44Gv` | `こんにちは` |
| Base64 / エンコード | `hello` | `aGVsbG8=` |
| Base64URL / エンコード | `hello` | `aGVsbG8` |
| Base64 / デコード | `%%%` | エラー表示（画面は落ちない） |
| URL(Component) / エンコード | `a b&c=日本` | `a%20b%26c%3D%E6%97%A5%E6%9C%AC` |
| URL(Component) / デコード | `%E6%97%A5` | `日` |
| URL(Component) / デコード | `%E6%97` | エラー表示 |
| URL(全体) / エンコード | `https://example.com/検索?q=a b` | `https://example.com/%E6%A4%9C%E7%B4%A2?q=a%20b` |
| HTML / エンコード | `<a href="x">&</a>` | `&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;` |
| HTML / デコード | `&#x3042;&#12354;&amp;` | `ああ&` |
| HTML / デコード | `<img src=x onerror=alert(1)>` | そのまま文字列として表示され、alert は出ない |
| 入れ替えボタン | エンコード結果を入力へ | 方向がデコードになり、元の文字列に戻る |
