# 多単位変換ツール群の追加 — 概要

## 背景

`toolbox` は Vue 3 製の便利ツール集（現在27ツール）で、単位変換は [LengthConverter.vue](../../src/views/LengthConverter.vue)（距離単位）1本のみ。ユーザー要望により**重さ・面積・体積・温度・データ量・期間**の6カテゴリを、それぞれ独立した別画面ツールとして追加する。

## 目的

- 「単位ツール」カテゴリを充実させる（現在は距離のみ → 7ツール体制へ）
- 既存 [LengthConverter.vue](../../src/views/LengthConverter.vue) のテーブル表示UI／係数ベース変換のパターンを踏襲し、リポジトリ全体の一貫性を保つ
- 温度のみ非線形換算が必要なので計算ロジックを関数化（UIは他5ツールと完全同一）

## スコープ

**含む**

- 新規 Vue ファイル6本（`src/views/` 配下）
- ルーター登録（`src/router/index.js`、`src/router/pageTitles.js`）
- ホームページのタイル追加（`src/views/HomePage.vue`）

**含まない**

- 既存 [LengthConverter.vue](../../src/views/LengthConverter.vue) の変更（共存方針）
- [ANALYSIS_REPORT.md](../../ANALYSIS_REPORT.md) で指摘されている既存バグ修正
- 単位変換ロジックの共通ユーティリティ化（既存リポジトリは views/ 配下の各ツールが自己完結している慣習を踏襲）

## 追加ツール一覧

| # | ファイル名 | ルートパス | 表示名 | 計算方式 |
|---|---|---|---|---|
| 1 | `WeightConverter.vue` | `/weight-converter` | 重さ単位変換 | 係数ベース（基準: g） |
| 2 | `AreaConverter.vue` | `/area-converter` | 面積単位変換 | 係数ベース（基準: m²） |
| 3 | `VolumeConverter.vue` | `/volume-converter` | 体積単位変換 | 係数ベース（基準: L） |
| 4 | `TemperatureConverter.vue` | `/temperature-converter` | 温度単位変換 | **関数ベース**（基準: K経由） |
| 5 | `DataSizeConverter.vue` | `/data-size-converter` | データ量単位変換 | 係数ベース（基準: byte） |
| 6 | `DurationConverter.vue` | `/duration-converter` | 期間単位変換 | 係数ベース（基準: 秒） |

## 共通実装パターン（5本／温度以外）

```vue
<template>
  <div>
    <input type="number" v-model.number="inputValue" />
    <select v-model="inputUnit">
      <option v-for="u in units" :key="u.name" :value="u.name">
        {{ u.name }} ({{ u.reading }})
      </option>
    </select>
    <table>
      <tr v-for="u in units" :key="u.name">
        <td>{{ u.name }}</td>
        <td>{{ u.reading }}</td>
        <td>{{ formatNumber(convertValue(u.name)) }}</td>
        <td>{{ u.remark }}</td>
      </tr>
    </table>
  </div>
</template>
<script>
export default {
  data() {
    return {
      inputValue: 1,
      inputUnit: '<基準単位>',
      units: [ /* {name, reading, remark} */ ],
      conversionRates: { /* 基準単位を1とする係数 */ }
    };
  },
  methods: {
    convertValue(targetUnit) {
      const inBase = this.inputValue / this.conversionRates[this.inputUnit];
      return inBase * this.conversionRates[targetUnit];
    },
    formatNumber(n) {
      if (!isFinite(n) || n === 0) return String(n);
      const abs = Math.abs(n);
      if (abs >= 1e9 || abs < 1e-4) return n.toExponential(4);
      return Number(n.toPrecision(7)).toString();
    }
  }
};
</script>
```

### LengthConverter からの改良点

- [LengthConverter.vue](../../src/views/LengthConverter.vue) の `.toFixed(1)` は小さい値を `0.0` に潰すため、`formatNumber` ヘルパーで桁数自動調整＋指数表記フォールバックに置き換える
- 6本とも純粋計算のみで `setInterval` / `requestAnimationFrame` を使わないため、[ANALYSIS_REPORT.md](../../ANALYSIS_REPORT.md) で指摘されたタイマーリーク問題（SosuCounter / AllTimeProgress 等）は再発しない

## ステップ一覧（このディレクトリ内ファイル）

1. [01_weight_converter.md](01_weight_converter.md) — 重さ単位変換
2. [02_area_converter.md](02_area_converter.md) — 面積単位変換
3. [03_volume_converter.md](03_volume_converter.md) — 体積単位変換
4. [04_temperature_converter.md](04_temperature_converter.md) — 温度単位変換
5. [05_data_size_converter.md](05_data_size_converter.md) — データ量単位変換
6. [06_duration_converter.md](06_duration_converter.md) — 期間単位変換
7. [07_router_and_home_registration.md](07_router_and_home_registration.md) — ルーター/ホーム登録（共通作業）

## 全体の動作確認

すべてのステップ完了後に以下を実施：

1. `npm run serve`（または `npm run dev` 相当のコマンド）でローカル起動
2. ホーム画面の「単位ツール」カテゴリに6タイルが追加されているか確認
3. 各ツールへ遷移してブラウザタブのタイトルが `<アプリ名>: ○○単位変換` になっているか確認
4. 各ステップの動作確認セクションに記載した代表的な換算が正しく表示されるか確認
5. 極端な値（`0.001`, `1e9` など）でも数値表示が破綻しないか
6. `npm run lint` と `npm run build` を実行し、警告・エラーが出ないことを確認
