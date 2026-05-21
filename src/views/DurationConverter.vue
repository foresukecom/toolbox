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
      inputUnit: '時間',
      units: [
        { name: 'ms', reading: 'ミリ秒', remark: '1 秒 = 1000 ms' },
        { name: '秒', reading: 'びょう', remark: '基本単位' },
        { name: '分', reading: 'ふん', remark: '1 分 = 60 秒' },
        { name: '時間', reading: 'じかん', remark: '1 時間 = 60 分 = 3600 秒' },
        { name: '日', reading: 'にち', remark: '1 日 = 24 時間' },
        { name: '週', reading: 'しゅう', remark: '1 週 = 7 日' },
        { name: '月', reading: 'つき', remark: '平均 ≒ 30.4375 日（365.25/12）' },
        { name: '年', reading: 'ねん', remark: 'ユリウス年 = 365.25 日' }
      ]
    };
  },
  methods: {
    convertValue(targetUnit) {
      const conversionRates = {
        ms: 1000,
        秒: 1,
        分: 1 / 60,
        時間: 1 / 3600,
        日: 1 / 86400,
        週: 1 / 604800,
        月: 1 / 2629800,
        年: 1 / 31557600
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
