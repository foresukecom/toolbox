# Step 4: TemperatureConverter（温度単位変換）

## 目的

温度の単位を相互に変換するツールを追加する。**他の5ツールと違い、加法定数を含むため単純な係数では換算できない**ので、計算ロジックのみ関数化する（UIは他ツールと完全同一）。

## 新規ファイル

- [src/views/TemperatureConverter.vue](../../src/views/TemperatureConverter.vue)

## 単位一覧

正規化基準: **K（ケルビン）** — 入力値を一旦ケルビンに変換してから目標単位へ変換

| 単位 | 読み | 換算式（→K） | 備考 |
|---|---|---|---|
| °C | セルシウス度 | `K = °C + 273.15` | 摂氏 |
| °F | ファーレンハイト度 | `K = (°F - 32) × 5/9 + 273.15` | 華氏 |
| K | ケルビン | `K = K` | 基準単位（絶対温度） |
| °Ré | レオミュール度 | `K = °Ré × 5/4 + 273.15` | 旧フランス・ドイツ語圏で使用 |
| °R | ランキン度 | `K = °R × 5/9` | 絶対華氏（米国工学系） |

## 換算ロジック（関数化）

```js
toKelvin(value, unit) {
  switch (unit) {
    case "°C":  return value + 273.15;
    case "°F":  return (value - 32) * 5/9 + 273.15;
    case "K":   return value;
    case "°Ré": return value * 5/4 + 273.15;
    case "°R":  return value * 5/9;
  }
},
fromKelvin(k, unit) {
  switch (unit) {
    case "°C":  return k - 273.15;
    case "°F":  return (k - 273.15) * 9/5 + 32;
    case "K":   return k;
    case "°Ré": return (k - 273.15) * 4/5;
    case "°R":  return k * 9/5;
  }
},
convertValue(targetUnit) {
  return this.fromKelvin(
    this.toKelvin(this.inputValue, this.inputUnit),
    targetUnit
  );
}
```

## 実装スケルトン

```vue
<template>
  <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">温度単位変換</h1>
    <div class="mb-4 flex gap-2">
      <input type="number" v-model.number="inputValue" class="border rounded p-2 flex-1" />
      <select v-model="inputUnit" class="border rounded p-2">
        <option v-for="u in units" :key="u.name" :value="u.name">
          {{ u.name }} ({{ u.reading }})
        </option>
      </select>
    </div>
    <table class="w-full border-collapse">
      <!-- thead は他コンバーターと同じ -->
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
  name: "TemperatureConverter",
  data() {
    return {
      inputValue: 0,
      inputUnit: "°C",
      units: [
        { name: "°C",  reading: "セルシウス度",     remark: "摂氏" },
        { name: "°F",  reading: "ファーレンハイト度", remark: "華氏" },
        { name: "K",   reading: "ケルビン",         remark: "絶対温度（基準）" },
        { name: "°Ré", reading: "レオミュール度",   remark: "旧欧州式" },
        { name: "°R",  reading: "ランキン度",       remark: "絶対華氏" }
      ]
    };
  },
  methods: {
    toKelvin(value, unit) {
      switch (unit) {
        case "°C":  return value + 273.15;
        case "°F":  return (value - 32) * 5/9 + 273.15;
        case "K":   return value;
        case "°Ré": return value * 5/4 + 273.15;
        case "°R":  return value * 5/9;
      }
    },
    fromKelvin(k, unit) {
      switch (unit) {
        case "°C":  return k - 273.15;
        case "°F":  return (k - 273.15) * 9/5 + 32;
        case "K":   return k;
        case "°Ré": return (k - 273.15) * 4/5;
        case "°R":  return k * 9/5;
      }
    },
    convertValue(targetUnit) {
      return this.fromKelvin(
        this.toKelvin(this.inputValue, this.inputUnit),
        targetUnit
      );
    },
    formatNumber(n) {
      if (!isFinite(n)) return String(n);
      const abs = Math.abs(n);
      if (n === 0) return "0";
      if (abs >= 1e9 || abs < 1e-4) return n.toExponential(4);
      return Number(n.toPrecision(7)).toString();
    }
  }
};
</script>
```

## 動作確認

- `0 °C` 入力 → `32 °F` / `273.15 K` / `0 °Ré` / `491.67 °R`
- `100 °C` 入力 → `212 °F` / `373.15 K` / `80 °Ré`
- `-40 °C` 入力 → `-40 °F`（摂氏と華氏が一致する有名な点）
- `0 K` 入力 → `-273.15 °C` / `-459.67 °F`（絶対零度）
- `25 °C` 入力 → `77 °F` / `298.15 K`（室温）

## 注意点

- 入力が極端な負値（例: `-1000 °C`）でも数式上は計算されてしまうが、物理的には絶対零度未満で意味がない。今回はバリデーション無し（電卓ツールとして数式換算のみ提供）
- 小数演算による微妙な誤差（例: `100 °C → 212.00000000000003 °F`）は `formatNumber` の `toPrecision(7)` で `212` に丸められる
