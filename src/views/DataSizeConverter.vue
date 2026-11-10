<template>
  <div class="unit-converter cat-unit">
    <div class="uc-input">
      <input v-model.number="inputValue" type="number" placeholder="値を入力" />
      <select v-model="inputUnit">
        <option v-for="unit in units" :key="unit.name" :value="unit.name">
          {{ unit.name }}
        </option>
      </select>
    </div>
    <table class="uc-table">
      <thead>
        <tr>
          <th>値</th>
          <th>単位</th>
          <th>読み方</th>
          <th>備考</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="unit in units" :key="unit.name">
          <td class="uc-value">{{ convertValue(unit.name) }}</td>
          <td class="uc-unit">{{ unit.name }}</td>
          <td class="uc-reading">{{ unit.reading }}</td>
          <td class="uc-remark">{{ unit.remark }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      inputValue: 1,
      inputUnit: 'MB',
      units: [
        { name: 'bit', reading: 'ビット', remark: '1 byte = 8 bit' },
        { name: 'B', reading: 'バイト', remark: '基本単位' },
        { name: 'KB', reading: 'キロバイト', remark: '10進系 = 10³ B' },
        { name: 'MB', reading: 'メガバイト', remark: '10進系 = 10⁶ B' },
        { name: 'GB', reading: 'ギガバイト', remark: '10進系 = 10⁹ B' },
        { name: 'TB', reading: 'テラバイト', remark: '10進系 = 10¹² B' },
        { name: 'PB', reading: 'ペタバイト', remark: '10進系 = 10¹⁵ B' },
        { name: 'KiB', reading: 'キビバイト', remark: '2進系 = 2¹⁰ B = 1024 B' },
        { name: 'MiB', reading: 'メビバイト', remark: '2進系 = 2²⁰ B' },
        { name: 'GiB', reading: 'ギビバイト', remark: '2進系 = 2³⁰ B' },
        { name: 'TiB', reading: 'テビバイト', remark: '2進系 = 2⁴⁰ B' },
        { name: 'PiB', reading: 'ペビバイト', remark: '2進系 = 2⁵⁰ B' }
      ]
    };
  },
  methods: {
    convertValue(targetUnit) {
      const conversionRates = {
        bit: 8,
        B: 1,
        KB: 1e-3,
        MB: 1e-6,
        GB: 1e-9,
        TB: 1e-12,
        PB: 1e-15,
        KiB: 1 / 1024,
        MiB: 1 / Math.pow(1024, 2),
        GiB: 1 / Math.pow(1024, 3),
        TiB: 1 / Math.pow(1024, 4),
        PiB: 1 / Math.pow(1024, 5)
      };
      if (this.inputValue === '' || this.inputValue === null || this.inputValue === undefined) return '';
      const baseValue = this.inputValue / conversionRates[this.inputUnit];
      const converted = baseValue * conversionRates[targetUnit];
      return isNaN(converted) ? '' : this.formatNumber(converted);
    },
    formatNumber(n) {
      if (!isFinite(n)) return String(n);
      if (n === 0) return '0';
      const abs = Math.abs(n);
      if (abs >= 1e15 || abs < 1e-4) return n.toExponential(4);
      return Number(n.toPrecision(7)).toString();
    }
  }
};
</script>
