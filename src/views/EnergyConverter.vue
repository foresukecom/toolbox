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
      <li>cal は熱化学カロリー（1 cal = 4.184 J）です。食品の栄養表示の kcal もこの値です。</li>
      <li>eV は電気素量 1.602176634×10⁻¹⁹ C（定義値）、BTU は国際蒸気表の値（1055.05585262 J）で換算しています。</li>
    </ul>
  </div>
</template>

<script>
import { energyUnits, convert, formatNumber } from '../utilities/unitConversions';

export default {
  data() {
    return {
      inputValue: 1,
      inputUnit: 'kWh',
      units: energyUnits
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
