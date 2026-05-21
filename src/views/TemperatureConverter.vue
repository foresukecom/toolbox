<template>
  <div class="p-8">
    <div class="max-w-md mx-auto">
      <div class="flex mb-4">
        <input v-model.number="inputValue" type="number" placeholder="値を入力"
          class="p-2 border rounded-tl rounded-bl flex-grow" />
        <select v-model="inputUnit" class="p-2 border-t border-b border-r rounded-tr rounded-br">
          <option v-for="unit in units" :key="unit.name" :value="unit.name">
            {{ unit.name }}
          </option>
        </select>
      </div>
      <div class="overflow-x-auto relative shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" class="py-3 px-6">値</th>
              <th scope="col" class="py-3 px-6">単位</th>
              <th scope="col" class="py-3 px-6">読み方</th>
              <th scope="col" class="py-3 px-6">備考</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="unit in units" :key="unit.name" class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              <td class="py-4 px-6">
                {{ convertValue(unit.name) }}
              </td>
              <td class="py-4 px-6">
                {{ unit.name }}
              </td>
              <td class="py-4 px-6">
                {{ unit.reading }}
              </td>
              <td class="py-4 px-6">
                {{ unit.remark }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      inputValue: 0,
      inputUnit: '°C',
      units: [
        { name: '°C', reading: 'セルシウス度', remark: '摂氏' },
        { name: '°F', reading: 'ファーレンハイト度', remark: '華氏（°F = °C × 9/5 + 32）' },
        { name: 'K', reading: 'ケルビン', remark: '絶対温度（K = °C + 273.15）' },
        { name: '°Ré', reading: 'レオミュール度', remark: '旧欧州式（°Ré = °C × 4/5）' },
        { name: '°R', reading: 'ランキン度', remark: '絶対華氏（°R = (°C + 273.15) × 9/5）' }
      ]
    };
  },
  methods: {
    toKelvin(value, unit) {
      switch (unit) {
        case '°C': return value + 273.15;
        case '°F': return (value - 32) * 5 / 9 + 273.15;
        case 'K': return value;
        case '°Ré': return value * 5 / 4 + 273.15;
        case '°R': return value * 5 / 9;
        default: return NaN;
      }
    },
    fromKelvin(k, unit) {
      switch (unit) {
        case '°C': return k - 273.15;
        case '°F': return (k - 273.15) * 9 / 5 + 32;
        case 'K': return k;
        case '°Ré': return (k - 273.15) * 4 / 5;
        case '°R': return k * 9 / 5;
        default: return NaN;
      }
    },
    convertValue(targetUnit) {
      if (this.inputValue === '' || this.inputValue === null || this.inputValue === undefined) return '';
      const k = this.toKelvin(this.inputValue, this.inputUnit);
      const converted = this.fromKelvin(k, targetUnit);
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
