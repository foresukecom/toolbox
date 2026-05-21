# Step 7: ルーター登録 / ホーム画面タイル追加（共通作業）

## 目的

Step 1〜6 で作成した6つの新規 Vue コンポーネントを、アプリのナビゲーション（ルーティング・タイトル・ホーム画面のタイル一覧）に組み込む。

## 編集対象ファイル

1. [src/router/index.js](../../src/router/index.js) — 6 ルート追加
2. [src/router/pageTitles.js](../../src/router/pageTitles.js) — 6 エントリ追加
3. [src/views/HomePage.vue](../../src/views/HomePage.vue) — 「単位ツール」カテゴリに 6 タイル追加

## 1. ルーター追加 — `src/router/index.js`

ファイル上部 import 群に追加：

```js
import WeightConverter      from "../views/WeightConverter.vue";
import AreaConverter        from "../views/AreaConverter.vue";
import VolumeConverter      from "../views/VolumeConverter.vue";
import TemperatureConverter from "../views/TemperatureConverter.vue";
import DataSizeConverter    from "../views/DataSizeConverter.vue";
import DurationConverter    from "../views/DurationConverter.vue";
```

`routes` 配列に追加（既存 `length-converter` ルートに続けて配置）：

```js
{
  path: "/weight-converter",
  name: "weight-converter",
  component: WeightConverter,
  meta: { title: `${appName}: ${pageTitles.weightConverter}` }
},
{
  path: "/area-converter",
  name: "area-converter",
  component: AreaConverter,
  meta: { title: `${appName}: ${pageTitles.areaConverter}` }
},
{
  path: "/volume-converter",
  name: "volume-converter",
  component: VolumeConverter,
  meta: { title: `${appName}: ${pageTitles.volumeConverter}` }
},
{
  path: "/temperature-converter",
  name: "temperature-converter",
  component: TemperatureConverter,
  meta: { title: `${appName}: ${pageTitles.temperatureConverter}` }
},
{
  path: "/data-size-converter",
  name: "data-size-converter",
  component: DataSizeConverter,
  meta: { title: `${appName}: ${pageTitles.dataSizeConverter}` }
},
{
  path: "/duration-converter",
  name: "duration-converter",
  component: DurationConverter,
  meta: { title: `${appName}: ${pageTitles.durationConverter}` }
},
```

### 命名規約

| name (kebab-case) | path | コンポーネント |
|---|---|---|
| `weight-converter` | `/weight-converter` | `WeightConverter` |
| `area-converter` | `/area-converter` | `AreaConverter` |
| `volume-converter` | `/volume-converter` | `VolumeConverter` |
| `temperature-converter` | `/temperature-converter` | `TemperatureConverter` |
| `data-size-converter` | `/data-size-converter` | `DataSizeConverter` |
| `duration-converter` | `/duration-converter` | `DurationConverter` |

## 2. ページタイトル — `src/router/pageTitles.js`

既存 `lengthConverter: '距離単位変換'` の付近に追加：

```js
weightConverter:      '重さ単位変換',
areaConverter:        '面積単位変換',
volumeConverter:      '体積単位変換',
temperatureConverter: '温度単位変換',
dataSizeConverter:    'データ量単位変換',
durationConverter:    '期間単位変換',
```

## 3. ホーム画面タイル — `src/views/HomePage.vue`

`data()` 内のカテゴリ配列を探し、「単位ツール」カテゴリの `tiles` 配列を以下のように展開：

```js
{
  name: '単位ツール',
  tiles: [
    { title: '距離単位変換',     route: 'length-converter' },      // 既存
    { title: '重さ単位変換',     route: 'weight-converter' },      // 新規
    { title: '面積単位変換',     route: 'area-converter' },        // 新規
    { title: '体積単位変換',     route: 'volume-converter' },      // 新規
    { title: '温度単位変換',     route: 'temperature-converter' }, // 新規
    { title: 'データ量単位変換', route: 'data-size-converter' },   // 新規
    { title: '期間単位変換',     route: 'duration-converter' }     // 新規
  ],
},
```

> タイル色は既存 `titleToColor()` メソッドがタイトル文字列のハッシュから自動算出するため、追加作業は不要。

## 動作確認

1. `npm run serve`（または開発サーバー起動コマンド）でローカル起動
2. ブラウザで `/` を開き、「単位ツール」カテゴリに 7 個のタイル（既存1＋新規6）が並んでいるか確認
3. 各タイルをクリックしてルートが正しく解決され、URL が `/weight-converter` 等に切り替わるか確認
4. 各画面でブラウザタブのタイトルが `<appName>: ○○単位変換` の形になっているか確認
5. 直接URL（例: `/weight-converter`）アクセスでも正しく表示されるか確認
6. ホームに戻るリンク（既存 [Header.vue](../../src/components/Header.vue) のロゴ等）が新ツール画面でも機能するか確認

## 全工程完了後の最終確認

1. `npm run lint`（あれば）でリンタ警告が出ないこと
2. `npm run build` でビルドが通ること（`dist/` が生成され、エラー・警告が出ないこと）
3. ビルド成果物をローカルプレビュー（`npm run preview` 相当）で開き、本番ビルドでも各ツールが正常動作することを確認
4. （任意）[Netlify](https://www.netlify.com/) のプレビューデプロイで本番環境同等の動作確認
