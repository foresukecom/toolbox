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
      inputUnit: 'm²',
      units: [
        { name: 'mm²', reading: '平方ミリメートル', remark: '1 m² = 1,000,000 mm²' },
        { name: 'cm²', reading: '平方センチメートル', remark: '1 m² = 10,000 cm²' },
        { name: 'm²', reading: '平方メートル', remark: '基本単位' },
        { name: 'a', reading: 'アール', remark: '1 a = 100 m²' },
        { name: 'ha', reading: 'ヘクタール', remark: '1 ha = 100 a = 10,000 m²' },
        { name: 'km²', reading: '平方キロメートル', remark: '1 km² = 1,000,000 m²' },
        { name: 'in²', reading: '平方インチ', remark: '1 in² = 6.4516 cm²' },
        { name: 'ft²', reading: '平方フィート', remark: '1 ft² ≒ 0.0929 m²' },
        { name: 'yd²', reading: '平方ヤード', remark: '1 yd² ≒ 0.8361 m²' },
        { name: 'acre', reading: 'エーカー', remark: '1 acre ≒ 4046.86 m²' },
        { name: 'mi²', reading: '平方マイル', remark: '1 mi² ≒ 2.59 km²' },
        { name: '坪', reading: 'つぼ', remark: '1 坪 = 400/121 m² ≒ 3.306 m²' },
        { name: '畳', reading: 'じょう', remark: '中京間 = 1/2 坪 ≒ 1.653 m²' }
      ]
    };
  },
  methods: {
    convertValue(targetUnit) {
      const conversionRates = {
        'mm²': 1e6,
        'cm²': 1e4,
        'm²': 1,
        a: 0.01,
        ha: 0.0001,
        'km²': 1e-6,
        'in²': 1 / 0.00064516,
        'ft²': 1 / 0.09290304,
        'yd²': 1 / 0.83612736,
        acre: 1 / 4046.8564224,
        'mi²': 1 / 2589988.110336,
        坪: 121 / 400,
        畳: 121 / 200
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
