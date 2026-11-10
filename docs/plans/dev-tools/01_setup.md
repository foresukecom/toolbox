# Step 01: 準備（直列・並列フェーズの前に1人で実施）

## 目的

並列フェーズで衝突しうる共有ファイルを先に確定させる。この Step の完了後は、各エージェントが自分の `.vue` 1本だけを編集すればよい状態にする。

## 作業ブランチ

```bash
git switch -c feat/dev-tools feat/nix-dev-env
```

> **前提**
> - `develop` の `yarn.lock` は Yarn 1 形式のため、Yarn 4 環境の `feat/nix-dev-env`（PR #83）から派生させる。PR #83 がマージ済みなら `origin/develop` から派生してよい
> - 各エージェントは worktree 内の `docs/plans/dev-tools/` を読むので、このプラン群が `feat/dev-tools` に含まれている必要がある

## 1. 依存パッケージの追加

```bash
yarn add cronstrue cron-parser diff yaml smol-toml
```

| パッケージ | 使用 Step | 用途 |
|---|---|---|
| `cronstrue` | 04 | cron 式 → 人間向けの説明文（日本語ロケールあり） |
| `cron-parser` | 04 | 次回実行日時の計算（タイムゾーン対応） |
| `diff` | 06 | テキスト差分（jsdiff） |
| `yaml` | 07 | YAML のパース / 出力 |
| `smol-toml` | 07 | TOML のパース / 出力 |

インストール後、各パッケージのバージョンを確認して下表に記入しておく（cron-parser は v4 と v5 で API が違うため、Step 04 の担当がここを参照する）。

| パッケージ | 導入バージョン |
|---|---|
| `cronstrue` | |
| `cron-parser` | |
| `diff` | |
| `yaml` | |
| `smol-toml` | |

## 2. スタブ View の作成（6本）

以下の6ファイルを同じ形で作る（`name` だけ変える）。

- `src/views/JwtDecoder.vue`
- `src/views/EncodeDecode.vue`
- `src/views/CronExplainer.vue`
- `src/views/ColorConverter.vue`
- `src/views/TextDiff.vue`
- `src/views/DataFormatConverter.vue`

```vue
<template>
  <div class="dev-tool cat-dev">
    <p>準備中</p>
  </div>
</template>

<script>
export default {
  name: 'JwtDecoder',
};
</script>
```

## 3. ページタイトル — `src/router/pageTitles.js`

`blueskyShortcodes` の前に追加：

```js
  jwtDecoder: 'JWTデコーダー',
  encodeDecode: 'エンコード/デコード',
  cronExplainer: 'cron式解説',
  colorConverter: 'カラー変換',
  textDiff: 'テキスト差分',
  dataFormatConverter: 'YAML/JSON/TOML変換',
```

## 4. ルーター — `src/router/index.js`

import 群の末尾に追加：

```js
import JwtDecoder from '../views/JwtDecoder.vue'
import EncodeDecode from '../views/EncodeDecode.vue'
import CronExplainer from '../views/CronExplainer.vue'
import ColorConverter from '../views/ColorConverter.vue'
import TextDiff from '../views/TextDiff.vue'
import DataFormatConverter from '../views/DataFormatConverter.vue'
```

`routes` 配列の末尾（`bluesky-shortcodes` の後）に追加：

```js
  {
    path: "/jwt-decoder",
    name: "jwt-decoder",
    component: JwtDecoder,
    meta: { title: `${appName}: ${pageTitles.jwtDecoder}` }
  },
  {
    path: "/encode-decode",
    name: "encode-decode",
    component: EncodeDecode,
    meta: { title: `${appName}: ${pageTitles.encodeDecode}` }
  },
  {
    path: "/cron-explainer",
    name: "cron-explainer",
    component: CronExplainer,
    meta: { title: `${appName}: ${pageTitles.cronExplainer}` }
  },
  {
    path: "/color-converter",
    name: "color-converter",
    component: ColorConverter,
    meta: { title: `${appName}: ${pageTitles.colorConverter}` }
  },
  {
    path: "/text-diff",
    name: "text-diff",
    component: TextDiff,
    meta: { title: `${appName}: ${pageTitles.textDiff}` }
  },
  {
    path: "/data-format-converter",
    name: "data-format-converter",
    component: DataFormatConverter,
    meta: { title: `${appName}: ${pageTitles.dataFormatConverter}` }
  },
```

## 5. ホーム画面 — `src/views/HomePage.vue`

`categories` 配列の「文字列操作ツール」の直後に新カテゴリを追加：

```js
        {
          name: '開発者ツール',
          cssClass: 'cat-dev',
          tiles: [
            { title: 'JWTデコーダー', route: 'jwt-decoder' },
            { title: 'エンコード/デコード', route: 'encode-decode' },
            { title: 'cron式解説', route: 'cron-explainer' },
            { title: 'カラー変換', route: 'color-converter' },
            { title: 'テキスト差分', route: 'text-diff' },
            { title: 'YAML/JSON/TOML変換', route: 'data-format-converter' },
          ],
        },
```

## 6. カテゴリカラー — `src/assets/css/main.css`

`:root` のカテゴリ別アクセントカラーに追加：

```css
  --tb-cat-dev: #16a085;
  --tb-cat-dev-hover: #0e6655;
```

カテゴリクラス群（`.cat-bluesky` の下）に追加：

```css
.cat-dev    { --tb-main: var(--tb-cat-dev);    --tb-main-hover: var(--tb-cat-dev-hover); }
```

## 動作確認

1. `yarn lint` がエラー 0、`yarn build` が成功
2. `yarn serve` → ホームに「開発者ツール」カテゴリと6リンクが表示される（ティール色）
3. 各リンクで「準備中」が表示され、タブタイトルが `開発の友: <ツール名>` になる

## コミット

論理単位で分ける：

1. `chore: 開発者ツール用の依存パッケージを追加`（package.json / yarn.lock）
2. `feat: 開発者ツール6種のスタブとルーティングを追加`（views / router / HomePage / main.css）

完了後、[00_overview.md](00_overview.md) の「herdr での運用手順 → 2. worktree を作る」へ進む。
