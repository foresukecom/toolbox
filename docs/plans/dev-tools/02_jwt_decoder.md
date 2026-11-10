# Step 02: JWTデコーダー

> 着手前に [00_overview.md](00_overview.md) の「全エージェント共通ルール」を読むこと。

## 担当

| 項目 | 値 |
|---|---|
| 編集ファイル | `src/views/JwtDecoder.vue`（これのみ） |
| ブランチ | `feat/dev-tools-jwt` |
| 追加依存 | なし（`atob` / `TextDecoder` / Web Crypto を使う） |

## 目的

JWT を貼り付けると header / payload を整形表示し、時刻クレームを読みやすくする。トークンを外部サイトに貼りたくない、という需要に応える。

## 機能要件

### 必須

1. **入力**: テキストエリア。前後の空白と `Bearer ` プレフィックスは自動で除去する
2. **分解表示**: header / payload を整形済み JSON（インデント2）で表示し、それぞれ `CopyButton` を付ける。signature は Base64URL 文字列のまま表示
3. **Base64URL デコード**: `-`→`+`、`_`→`/` に置換し、`=` パディングを補ってから `atob`。結果は **`TextDecoder('utf-8')` で UTF-8 として復号**する（`atob` の結果をそのまま使うと日本語が化ける）
4. **時刻クレーム**: `exp` / `iat` / `nbf` があれば表として表示
   - JST の日時（`YYYY-MM-DD HH:mm:ss`、`dayjs` は既存依存なので利用可）
   - 現在からの相対表記（例: `3時間後` / `2日前`）
5. **状態バッジ**: `exp` が過去なら「期限切れ」、`nbf` が未来なら「まだ有効でない」、それ以外は「有効期間内」
6. **警告**: `alg` が `none` なら警告を表示
7. **エラー表示**: セグメントが3つでない、Base64URL として不正、JSON として不正 のそれぞれで、何が悪いかがわかるメッセージを出す

### 任意（余裕があれば）

8. **署名検証（HS256 / HS384 / HS512 のみ）**: シークレット入力欄を設け、`crypto.subtle.importKey('raw', ...)` + `crypto.subtle.verify('HMAC', ...)` で検証して ✓ / ✗ を表示。RS / ES 系は「未対応」と表示する
9. 有効期限までのカウントダウン（使う場合は `beforeUnmount` でタイマーを解除）

## UI 構成

```
[ JWT 入力テキストエリア ]
(エラーメッセージ)
[状態バッジ]  [alg none 警告]

## Header        [copy]
{ 整形JSON }

## Payload       [copy]
{ 整形JSON }

## 時刻クレーム
| クレーム | UNIX | JST | 相対 |

## Signature
<base64url 文字列>
(任意) シークレット [______]  → ✓ 署名一致
```

## 動作確認

テスト用トークン（jwt.io のサンプル、シークレットは `your-256-bit-secret`）：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

| 入力 | 期待結果 |
|---|---|
| 上記トークン | header `{"alg":"HS256","typ":"JWT"}`、payload に `sub` / `name: "John Doe"` / `iat: 1516239022` |
| 同上の `iat` | JST `2018-01-18 10:30:22` |
| `Bearer ` + 上記トークン | 同じ結果になる |
| 同上 + シークレット `your-256-bit-secret`（任意機能） | ✓ 署名一致 |
| 同上 + シークレット `wrong` | ✗ 不一致 |
| payload に日本語を含むトークン（自分で作る: `btoa` ではなく UTF-8 → Base64URL で作成） | 日本語が化けずに表示される |
| `exp` が過去のトークン | 「期限切れ」バッジ |
| `abc.def` | 「セグメントが3つではありません」系のエラー、画面は落ちない |
| 空文字 | 何も表示しない（エラーも出さない） |
