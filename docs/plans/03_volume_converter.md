# Step 3: VolumeConverter（体積単位変換）

## 目的

体積（容積）の単位を相互に変換するツールを追加する。SI単位（mL〜m³）、ヤード・ポンド法米国式（gal, qt, pt, fl oz）、日本の伝統単位（升・合・斗）に対応。

## 新規ファイル

- [src/views/VolumeConverter.vue](../../src/views/VolumeConverter.vue)

## 単位一覧

基準単位: **L（リットル）**

| 単位 | 読み | 1単位＝何L | 備考 |
|---|---|---|---|
| mL | ミリリットル | 0.001 | |
| cL | センチリットル | 0.01 | |
| dL | デシリットル | 0.1 | |
| L | リットル | 1 | 基準単位 |
| kL | キロリットル | 1000 | |
| cm³ | 立方センチメートル | 0.001 | = mL |
| m³ | 立方メートル | 1000 | = kL |
| 米gal | 米国ガロン | 3.785411784 | |
| 米qt | 米国クォート | 0.946352946 | |
| 米pt | 米国パイント | 0.473176473 | |
| 米fl oz | 米国液量オンス | 0.0295735295625 | |
| 升 | しょう | 1.8039 | 日本の尺貫法 |
| 合 | ごう | 0.18039 | 1/10升 |
| 斗 | と | 18.039 | 10升 |

## 実装スケルトン

```vue
<template>
  <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">体積単位変換</h1>
    <!-- 入力フォーム + テーブル: WeightConverter と同構造 -->
  </div>
</template>

<script>
export default {
  name: "VolumeConverter",
  data() {
    return {
      inputValue: 1,
      inputUnit: "L",
      units: [
        { name: "mL",       reading: "ミリリットル",         remark: "" },
        { name: "cL",       reading: "センチリットル",       remark: "" },
        { name: "dL",       reading: "デシリットル",         remark: "" },
        { name: "L",        reading: "リットル",             remark: "基準単位" },
        { name: "kL",       reading: "キロリットル",         remark: "" },
        { name: "cm³",      reading: "立方センチメートル",   remark: "= mL" },
        { name: "m³",       reading: "立方メートル",         remark: "= kL" },
        { name: "米gal",    reading: "米国ガロン",           remark: "US liquid gallon" },
        { name: "米qt",     reading: "米国クォート",         remark: "US liquid quart" },
        { name: "米pt",     reading: "米国パイント",         remark: "US liquid pint" },
        { name: "米fl oz",  reading: "米国液量オンス",       remark: "US fluid ounce" },
        { name: "升",       reading: "しょう",               remark: "日本の尺貫法" },
        { name: "合",       reading: "ごう",                 remark: "1/10 升" },
        { name: "斗",       reading: "と",                   remark: "10 升" }
      ],
      conversionRates: {
        mL: 0.001,
        cL: 0.01,
        dL: 0.1,
        L: 1,
        kL: 1000,
        "cm³": 0.001,
        "m³": 1000,
        "米gal": 3.785411784,
        "米qt": 0.946352946,
        "米pt": 0.473176473,
        "米fl oz": 0.0295735295625,
        升: 1.8039,
        合: 0.18039,
        斗: 18.039
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

- `1 L` 入力 → `1000 mL` / `約0.2642 米gal` / `約0.5544 升`
- `1 米gal` 入力 → `約3.7854 L` / `4 米qt` / `128 米fl oz`
- `1 升` 入力 → `約1.8039 L` / `10 合` / `0.1 斗`
- `1 m³` 入力 → `1000 L` / `1000000 mL`
