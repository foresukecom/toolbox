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
      inputUnit: 'g',
      units: [
        { name: 'mg', reading: 'ミリグラム', remark: '1 g = 1000 mg' },
        { name: 'g', reading: 'グラム', remark: '基本単位' },
        { name: 'kg', reading: 'キログラム', remark: '1 kg = 1000 g' },
        { name: 't', reading: 'トン', remark: '1 t = 1000 kg（メートルトン）' },
        { name: 'oz', reading: 'オンス', remark: '1 oz ≒ 28.3495 g（国際オンス）' },
        { name: 'lb', reading: 'ポンド', remark: '1 lb ≒ 453.592 g（国際ポンド）' },
        { name: '匁', reading: 'もんめ', remark: '1 匁 = 3.75 g（尺貫法）' },
        { name: '貫', reading: 'かん', remark: '1 貫 = 1000 匁 = 3.75 kg' }
      ]
    };
  },
  methods: {
    convertValue(targetUnit) {
      const conversionRates = {
        mg: 1000,
        g: 1,
        kg: 0.001,
        t: 0.000001,
        oz: 1 / 28.349523125,
        lb: 1 / 453.59237,
        匁: 1 / 3.75,
        貫: 1 / 3750
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
      if (abs >= 1e9 || abs < 1e-4) return n.toExponential(4);
      return Number(n.toPrecision(7)).toString();
    }
  }
};
</script>
