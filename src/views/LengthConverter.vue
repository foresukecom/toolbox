<template>
  <div class="p-8">
    <div class="max-w-md mx-auto">
      <div class="flex mb-4">
        <input v-model="inputValue" type="number" placeholder="値を入力" class="p-2 border rounded-tl rounded-bl flex-grow" />
        <select v-model="inputUnit" class="p-2 border-t border-b border-r rounded-tr rounded-br">
          <option value="cm">cm</option>
          <option value="mm">mm</option>
          <option value="m">m</option>
          <option value="km">km</option>
          <option value="ft">ft</option>
          <!-- 他の単位も追加可能 -->
        </select>
      </div>
      <div class="space-y-2">
        <div v-for="(value, unit) in convertedValues" :key="unit" class="flex justify-between">
          <span>{{ value }}</span>
          <span>{{ unit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      inputValue: 0,
      inputUnit: 'cm',
    };
  },
  computed: {
    convertedValues() {
      const conversionRates = {
        cm: 1,
        mm: 10,
        m: 0.01,
        km: 0.00001,
        ft: 0.0328084,
        // 他の単位の変換レートも追加
      };
      let baseValue = this.inputValue * conversionRates[this.inputUnit]; // 基本単位(cm)に変換
      let result = {};
      for (const [unit, rate] of Object.entries(conversionRates)) {
        result[unit] = (baseValue * rate).toFixed(2);
      }
      return result;
    }
  }
};
</script>

<style scoped>
/* ここにTailwind CSSスタイルを追加 */
</style>
