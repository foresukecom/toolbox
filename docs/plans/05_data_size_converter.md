# Step 5: DataSizeConverter（データ量単位変換）

## 目的

データ量（情報量）の単位を相互に変換するツールを追加する。**10進系（KB=1000B）と2進系（KiB=1024B）の両方を1画面で提供**することで、「MB と MiB の違い」のような実務での混同を解消する。

## 新規ファイル

- [src/views/DataSizeConverter.vue](../../src/views/DataSizeConverter.vue)

## 単位一覧

基準単位: **byte（バイト）**

### 10進系（SI 接頭辞）

| 単位 | 読み | 1単位＝何byte | 備考 |
|---|---|---|---|
| bit | ビット | 0.125 | 1B = 8bit |
| B | バイト | 1 | 基準単位 |
| KB | キロバイト | 1,000 | 10³ |
| MB | メガバイト | 1,000,000 | 10⁶ |
| GB | ギガバイト | 1,000,000,000 | 10⁹ |
| TB | テラバイト | 10¹² | |
| PB | ペタバイト | 10¹⁵ | |

### 2進系（IEC 接頭辞）

| 単位 | 読み | 1単位＝何byte | 備考 |
|---|---|---|---|
| KiB | キビバイト | 1,024 | 2¹⁰ |
| MiB | メビバイト | 1,048,576 | 2²⁰ |
| GiB | ギビバイト | 2³⁰ | |
| TiB | テビバイト | 2⁴⁰ | |
| PiB | ペビバイト | 2⁵⁰ | |

## 実装スケルトン

```vue
<template>
  <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">データ量単位変換</h1>
    <div class="mb-4 flex gap-2">
      <input type="number" v-model.number="inputValue" class="border rounded p-2 flex-1" />
      <select v-model="inputUnit" class="border rounded p-2">
        <optgroup label="10進系 (SI)">
          <option v-for="u in units.filter(x => x.system === 'si')" :key="u.name" :value="u.name">
            {{ u.name }} ({{ u.reading }})
          </option>
        </optgroup>
        <optgroup label="2進系 (IEC)">
          <option v-for="u in units.filter(x => x.system === 'iec')" :key="u.name" :value="u.name">
            {{ u.name }} ({{ u.reading }})
          </option>
        </optgroup>
        <optgroup label="その他">
          <option v-for="u in units.filter(x => x.system === 'other')" :key="u.name" :value="u.name">
            {{ u.name }} ({{ u.reading }})
          </option>
        </optgroup>
      </select>
    </div>
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-gray-100">
          <th class="border p-2 text-left">単位</th>
          <th class="border p-2 text-left">読み</th>
          <th class="border p-2 text-left">系統</th>
          <th class="border p-2 text-right">値</th>
          <th class="border p-2 text-left">備考</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in units" :key="u.name">
          <td class="border p-2">{{ u.name }}</td>
          <td class="border p-2">{{ u.reading }}</td>
          <td class="border p-2 text-sm">{{ systemLabel(u.system) }}</td>
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
  name: "DataSizeConverter",
  data() {
    return {
      inputValue: 1,
      inputUnit: "MB",
      units: [
        { name: "bit", reading: "ビット",     system: "other", remark: "1B = 8bit" },
        { name: "B",   reading: "バイト",     system: "si",    remark: "基準単位" },
        { name: "KB",  reading: "キロバイト", system: "si",    remark: "10³ B" },
        { name: "MB",  reading: "メガバイト", system: "si",    remark: "10⁶ B" },
        { name: "GB",  reading: "ギガバイト", system: "si",    remark: "10⁹ B" },
        { name: "TB",  reading: "テラバイト", system: "si",    remark: "10¹² B" },
        { name: "PB",  reading: "ペタバイト", system: "si",    remark: "10¹⁵ B" },
        { name: "KiB", reading: "キビバイト", system: "iec",   remark: "2¹⁰ B" },
        { name: "MiB", reading: "メビバイト", system: "iec",   remark: "2²⁰ B" },
        { name: "GiB", reading: "ギビバイト", system: "iec",   remark: "2³⁰ B" },
        { name: "TiB", reading: "テビバイト", system: "iec",   remark: "2⁴⁰ B" },
        { name: "PiB", reading: "ペビバイト", system: "iec",   remark: "2⁵⁰ B" }
      ],
      conversionRates: {
        bit: 0.125,
        B: 1,
        KB: 1e3,
        MB: 1e6,
        GB: 1e9,
        TB: 1e12,
        PB: 1e15,
        KiB: 1024,
        MiB: 1024 ** 2,
        GiB: 1024 ** 3,
        TiB: 1024 ** 4,
        PiB: 1024 ** 5
      }
    };
  },
  methods: {
    systemLabel(s) {
      return { si: "10進", iec: "2進", other: "—" }[s];
    },
    convertValue(targetUnit) {
      const inBase = this.inputValue * this.conversionRates[this.inputUnit];
      return inBase / this.conversionRates[targetUnit];
    },
    formatNumber(n) {
      if (!isFinite(n) || n === 0) return String(n);
      const abs = Math.abs(n);
      if (abs >= 1e15 || abs < 1e-4) return n.toExponential(4);
      return Number(n.toPrecision(7)).toString();
    }
  }
};
</script>
```

## 動作確認

- `1 MB` 入力 → `1000000 B` / `1000 KB` / `0.001 GB` / `約0.9537 MiB`（≠1 MiB！）
- `1 MiB` 入力 → `1048576 B` / `1024 KiB` / `約1.0486 MB`
- `1 GB` 入力 → `1000 MB` / `約0.9313 GiB`
- `8 bit` 入力 → `1 B`
- `1 TB` 入力 → `1000 GB` / `約0.9095 TiB`

## 設計上のポイント

- `<select>` を `<optgroup>` で3グループ（SI / IEC / その他）に分けることで、ユーザーが混同しない
- テーブルには「系統」列を加え、各行が10進か2進か一目で分かるようにする
- `formatNumber` の指数表記閾値を `1e15` に引き上げ（PB単位を扱うため）
