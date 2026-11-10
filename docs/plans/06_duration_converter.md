# Step 6: DurationConverter（期間単位変換）

## 目的

時間の長さ（期間）を相互に変換するツールを追加する。**タイムスタンプ変換（[UnixTimeConverter.vue](../../src/views/UnixTimeConverter.vue)）やタイムゾーン変換（[TimezoneConverter.vue](../../src/views/TimezoneConverter.vue)）とは別物**であることを画面上部の説明文で明示する。

## 新規ファイル

- [src/views/DurationConverter.vue](../../src/views/DurationConverter.vue)

## 単位一覧

基準単位: **秒（秒）**

| 単位 | 読み | 1単位＝何秒 | 備考 |
|---|---|---|---|
| ms | ミリ秒 | 0.001 | |
| 秒 | びょう | 1 | 基準単位 |
| 分 | ふん | 60 | |
| 時間 | じかん | 3,600 | |
| 日 | にち | 86,400 | 24 時間 |
| 週 | しゅう | 604,800 | 7 日 |
| 月 | つき | 2,629,800 | 平均約30.4375日（365.25/12） |
| 年 | ねん | 31,557,600 | ユリウス年（365.25日） |

> **月・年について：** 暦月や暦年は変動するため、平均値（ユリウス年 365.25 日）を採用し、備考に明記する。

## 実装スケルトン

```vue
<template>
  <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">期間単位変換</h1>
    <p class="text-sm text-gray-600 mb-4">
      時間の長さ（期間）を変換します。タイムスタンプ変換は
      <router-link to="/unixtime-converter" class="underline">UnixTime変換</router-link>、
      タイムゾーン換算は
      <router-link to="/timezone-converter" class="underline">タイムゾーン変換</router-link>
      をご利用ください。
    </p>
    <div class="mb-4 flex gap-2">
      <input type="number" v-model.number="inputValue" class="border rounded p-2 flex-1" />
      <select v-model="inputUnit" class="border rounded p-2">
        <option v-for="u in units" :key="u.name" :value="u.name">
          {{ u.name }} ({{ u.reading }})
        </option>
      </select>
    </div>
    <table class="w-full border-collapse">
      <!-- thead は WeightConverter と同構造 -->
      <tbody>
        <tr v-for="u in units" :key="u.name">
          <td class="border p-2">{{ u.name }}</td>
          <td class="border p-2">{{ u.reading }}</td>
          <td class="border p-2 text-right font-mono">
            {{ formatNumber(convertValue(u.name)) }}
          </td>
          <td class="border p-2 text-sm text-gray-600">{{ u.remark }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: "DurationConverter",
  data() {
    return {
      inputValue: 1,
      inputUnit: "時間",
      units: [
        { name: "ms",   reading: "ミリ秒", remark: "" },
        { name: "秒",   reading: "びょう", remark: "基準単位" },
        { name: "分",   reading: "ふん",   remark: "60 秒" },
        { name: "時間", reading: "じかん", remark: "3,600 秒" },
        { name: "日",   reading: "にち",   remark: "24 時間" },
        { name: "週",   reading: "しゅう", remark: "7 日" },
        { name: "月",   reading: "つき",   remark: "平均 30.4375 日 (365.25/12)" },
        { name: "年",   reading: "ねん",   remark: "ユリウス年 365.25 日" }
      ],
      conversionRates: {
        ms: 0.001,
        秒: 1,
        分: 60,
        時間: 3600,
        日: 86400,
        週: 604800,
        月: 2629800,
        年: 31557600
      }
    };
  },
  methods: {
    convertValue(targetUnit) {
      const inBase = this.inputValue * this.conversionRates[this.inputUnit];
      return inBase / this.conversionRates[targetUnit];
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

## 動作確認

- `1 時間` 入力 → `3600 秒` / `60 分` / `約0.0417 日`
- `1 日` 入力 → `86400 秒` / `24 時間` / `1440 分`
- `1 年` 入力 → `約31557600 秒` / `365.25 日` / `12 月`
- `1000 ms` 入力 → `1 秒`
- `90 分` 入力 → `1.5 時間` / `5400 秒`

## 設計上のポイント

- ルーター遷移を案内するため `<router-link>` を使用（ハードコード `<a href>` ではなくVue Routerに統一）
- 上部の説明文（注意書き）はリポジトリ内でこのツールだけ持つ特殊要素 — 既存ツールとUI構造を完全一致させたい場合はこの説明文を簡素化してもよい
