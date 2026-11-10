<template>
  <div class="dev-tool unit-converter cat-unit">
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
    <ul class="uc-notes">
      <li>1 atm（標準気圧）= 101325 Pa、1 bar = 100000 Pa はいずれも定義値です。</li>
      <li>mmHg は慣用の水銀柱ミリメートル（133.322387415 Pa）、psi と kgf/cm² は標準重力加速度 9.80665 m/s² で換算しています。</li>
    </ul>
  </div>
</template>

<script>
import { pressureUnits, convert, formatNumber } from '../utilities/unitConversions';

export default {
  data() {
    return {
      inputValue: 1,
      inputUnit: 'atm',
      units: pressureUnits
    };
  },
  methods: {
    convertValue(targetUnit) {
      if (this.inputValue === '' || this.inputValue === null || this.inputValue === undefined) return '';
      const converted = convert(this.inputValue, this.inputUnit, targetUnit, this.units);
      return isNaN(converted) ? '' : formatNumber(converted);
    }
  }
};
</script>
