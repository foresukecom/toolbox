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
      <li>マッハは国際標準大気の海面・15℃ における音速 {{ soundSpeed }} m/s を 1 として換算しています（実際の音速は気温・高度で変わります）。</li>
      <li>光速比は真空中の光速 c = {{ lightSpeed }} m/s（定義値）に対する比です。</li>
      <li>mph は国際マイル（1 mi = 1609.344 m）、ノットは国際海里（1 nmi = 1852 m）毎時です。</li>
    </ul>
  </div>
</template>

<script>
import { speedUnits, convert, formatNumber, SPEED_OF_SOUND_SEA_LEVEL, SPEED_OF_LIGHT } from '../utilities/unitConversions';

export default {
  data() {
    return {
      inputValue: 100,
      inputUnit: 'km/h',
      units: speedUnits,
      soundSpeed: SPEED_OF_SOUND_SEA_LEVEL,
      lightSpeed: SPEED_OF_LIGHT
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
