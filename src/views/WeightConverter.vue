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
