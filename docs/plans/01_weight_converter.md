# Step 1: WeightConverter（重さ単位変換）

## 目的

質量（重さ）の単位を相互に変換するツールを追加する。SI単位系（mg〜t）に加えてヤード・ポンド法（oz, lb）と日本の伝統単位（匁・貫）に対応。

## 新規ファイル

- [src/views/WeightConverter.vue](../../src/views/WeightConverter.vue)

## 単位一覧

基準単位: **g（グラム）**

| 単位 | 読み | 1単位＝何g | 備考 |
|---|---|---|---|
| mg | ミリグラム | 0.001 | |
| g | グラム | 1 | 基準単位 |
| kg | キログラム | 1000 | |
| t | トン | 1,000,000 | メートルトン |
| oz | オンス | 28.349523125 | 国際オンス |
| lb | ポンド | 453.59237 | 国際ポンド |
| 匁 | もんめ | 3.75 | 日本の尺貫法 |
| 貫 | かん | 3750 | 日本の尺貫法 |

## 実装スケルトン

```vue
<template>
  <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">重さ単位変換</h1>
    <div class="mb-4 flex gap-2">
      <input
        type="number"
        v-model.number="inputValue"
        class="border rounded p-2 flex-1"
      />
      <select v-model="inputUnit" class="border rounded p-2">
        <option v-for="u in units" :key="u.name" :value="u.name">
          {{ u.name }} ({{ u.reading }})
        </option>
      </select>
    </div>
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-gray-100">
          <th class="border p-2 text-left">単位</th>
          <th class="border p-2 text-left">読み</th>
          <th class="border p-2 text-right">値</th>
          <th class="border p-2 text-left">備考</th>
        </tr>
      </thead>
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
  name: "WeightConverter",
  data() {
    return {
      inputValue: 1,
      inputUnit: "g",
      units: [
        { name: "mg", reading: "ミリグラム", remark: "" },
        { name: "g",  reading: "グラム",     remark: "基準単位" },
        { name: "kg", reading: "キログラム", remark: "" },
        { name: "t",  reading: "トン",       remark: "メートルトン" },
        { name: "oz", reading: "オンス",     remark: "国際オンス" },
        { name: "lb", reading: "ポンド",     remark: "国際ポンド" },
        { name: "匁", reading: "もんめ",     remark: "日本の尺貫法" },
        { name: "貫", reading: "かん",       remark: "日本の尺貫法" }
      ],
      conversionRates: {
        mg: 0.001,
        g: 1,
        kg: 1000,
        t: 1_000_000,
        oz: 28.349523125,
        lb: 453.59237,
        匁: 3.75,
        貫: 3750
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

- `1 kg` 入力 → `1000 g` / `2.20462 lb` / `35.274 oz` / `1000000 mg`
- `1 貫` 入力 → `3750 g` / `1000 匁` / `3.75 kg`
- `1 lb` 入力 → `453.59237 g` / `16 oz`
- `1 t` 入力 → `1000000 g` / `1000 kg`
