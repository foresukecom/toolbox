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
      inputUnit: 'L',
      units: [
        { name: 'mL', reading: 'ミリリットル', remark: '1 L = 1000 mL' },
        { name: 'cL', reading: 'センチリットル', remark: '1 L = 100 cL' },
        { name: 'dL', reading: 'デシリットル', remark: '1 L = 10 dL' },
        { name: 'L', reading: 'リットル', remark: '基本単位' },
        { name: 'kL', reading: 'キロリットル', remark: '1 kL = 1000 L' },
        { name: 'cm³', reading: '立方センチメートル', remark: '1 cm³ = 1 mL' },
        { name: 'm³', reading: '立方メートル', remark: '1 m³ = 1000 L = 1 kL' },
        { name: '米gal', reading: '米国ガロン', remark: '1 米gal ≒ 3.7854 L' },
        { name: '米qt', reading: '米国クォート', remark: '1 米qt = 1/4 米gal' },
        { name: '米pt', reading: '米国パイント', remark: '1 米pt = 1/8 米gal' },
        { name: '米fl oz', reading: '米国液量オンス', remark: '1 米fl oz ≒ 29.5735 mL' },
        { name: '升', reading: 'しょう', remark: '1 升 ≒ 1.8039 L（尺貫法）' },
        { name: '合', reading: 'ごう', remark: '1 合 = 1/10 升 ≒ 180.39 mL' },
        { name: '斗', reading: 'と', remark: '1 斗 = 10 升 ≒ 18.039 L' }
      ]
    };
  },
  methods: {
    convertValue(targetUnit) {
      const conversionRates = {
        mL: 1000,
        cL: 100,
        dL: 10,
        L: 1,
        kL: 0.001,
        'cm³': 1000,
        'm³': 0.001,
        '米gal': 1 / 3.785411784,
        '米qt': 1 / 0.946352946,
        '米pt': 1 / 0.473176473,
        '米fl oz': 1 / 0.0295735295625,
        升: 1 / 1.8039,
        合: 1 / 0.18039,
        斗: 1 / 18.039
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
