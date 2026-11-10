# Step 2: AreaConverter（面積単位変換）

## 目的

面積の単位を相互に変換するツールを追加する。SI単位（mm²〜km²）、メートル法派生（a, ha）、ヤード・ポンド法（in², ft², yd², acre, mi²）、日本の慣用単位（坪・畳）に対応。

## 新規ファイル

- [src/views/AreaConverter.vue](../../src/views/AreaConverter.vue)

## 単位一覧

基準単位: **m²（平方メートル）**

| 単位 | 読み | 1単位＝何m² | 備考 |
|---|---|---|---|
| mm² | 平方ミリメートル | 0.000001 | |
| cm² | 平方センチメートル | 0.0001 | |
| m² | 平方メートル | 1 | 基準単位 |
| a | アール | 100 | 100m² |
| ha | ヘクタール | 10000 | 100a |
| km² | 平方キロメートル | 1,000,000 | |
| in² | 平方インチ | 0.00064516 | |
| ft² | 平方フィート | 0.09290304 | |
| yd² | 平方ヤード | 0.83612736 | |
| acre | エーカー | 4046.8564224 | |
| mi² | 平方マイル | 2589988.110336 | |
| 坪 | つぼ | 3.305785... | 約3.306m² (400/121) |
| 畳 | じょう | 1.6528926... | 中京間 = 半坪 (200/121) |

> **坪 / 畳の係数について：** 坪 = 400/121 m²（メートル法と尺貫法の換算で正確値）。畳は地域差があるが、中京間（1.6528 m² ≒ 半坪）を採用する旨を備考に明記。

## 実装スケルトン

```vue
<template>
  <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">面積単位変換</h1>
    <div class="mb-4 flex gap-2">
      <input type="number" v-model.number="inputValue" class="border rounded p-2 flex-1" />
      <select v-model="inputUnit" class="border rounded p-2">
        <option v-for="u in units" :key="u.name" :value="u.name">
          {{ u.name }} ({{ u.reading }})
        </option>
      </select>
    </div>
    <table class="w-full border-collapse">
      <!-- thead は WeightConverter と同じ構成 -->
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
  name: "AreaConverter",
  data() {
    return {
      inputValue: 1,
      inputUnit: "m²",
      units: [
        { name: "mm²",  reading: "平方ミリメートル",  remark: "" },
        { name: "cm²",  reading: "平方センチメートル", remark: "" },
        { name: "m²",   reading: "平方メートル",       remark: "基準単位" },
        { name: "a",    reading: "アール",             remark: "100m²" },
        { name: "ha",   reading: "ヘクタール",         remark: "100a" },
        { name: "km²",  reading: "平方キロメートル",   remark: "" },
        { name: "in²",  reading: "平方インチ",         remark: "" },
        { name: "ft²",  reading: "平方フィート",       remark: "" },
        { name: "yd²",  reading: "平方ヤード",         remark: "" },
        { name: "acre", reading: "エーカー",           remark: "" },
        { name: "mi²",  reading: "平方マイル",         remark: "" },
        { name: "坪",   reading: "つぼ",               remark: "400/121 m²" },
        { name: "畳",   reading: "じょう",             remark: "中京間 (半坪)" }
      ],
      conversionRates: {
        "mm²": 1e-6,
        "cm²": 1e-4,
        "m²": 1,
        a: 100,
        ha: 10000,
        "km²": 1e6,
        "in²": 0.00064516,
        "ft²": 0.09290304,
        "yd²": 0.83612736,
        acre: 4046.8564224,
        "mi²": 2589988.110336,
        坪: 400 / 121,
        畳: 200 / 121
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

- `1 ha` 入力 → `10000 m²` / `100 a` / `約3025 坪`
- `1 acre` 入力 → `約4046.86 m²` / `約1224.17 坪`
- `1 坪` 入力 → `約3.3058 m²` / `2 畳`
- `1 km²` 入力 → `1000000 m²` / `100 ha` / `約0.3861 mi²`
