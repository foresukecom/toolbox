<template>
  <div class="dev-tool unit-converter cat-unit">
    <div class="uc-input">
      <input
        v-model="inputText"
        type="text"
        inputmode="decimal"
        :placeholder="inputUnit === 'DMS' ? '例: 35°41′22.5″ / 35 41 22.5' : '値を入力'"
      />
      <select v-model="inputUnit">
        <option v-for="unit in units" :key="unit.name" :value="unit.name">
          {{ unit.name }}
        </option>
        <option value="DMS">度分秒</option>
      </select>
    </div>
    <p v-if="inputError" class="uc-error">{{ inputError }}</p>
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
        <tr>
          <td class="uc-value">{{ dmsValue }}</td>
          <td class="uc-unit">DMS</td>
          <td class="uc-reading">度分秒表記</td>
          <td class="uc-remark">秒は小数第 2 位で丸め</td>
        </tr>
      </tbody>
    </table>
    <ul class="uc-notes">
      <li>「度分秒」を選ぶと 35°41′22.5″、35°41'22.5"、35 41 22.5、35d41m22.5s のような形式で入力できます（分・秒は 60 未満）。</li>
      <li>1 回転 = 360° = 2π rad = 400 grad です。</li>
    </ul>
  </div>
</template>

<script>
import { angleUnits, convert, formatNumber, formatDms, parseDms } from '../utilities/unitConversions';

export default {
  data() {
    return {
      inputText: '180',
      inputUnit: '°',
      units: angleUnits
    };
  },
  computed: {
    // 入力を度（10 進）に直した値。空欄は null、解釈できなければ NaN
    degrees() {
      const text = this.inputText.trim();
      if (!text) return null;
      if (this.inputUnit === 'DMS') return parseDms(text);
      // 数値入力欄は type="text" なので、数値として完全に解釈できるものだけ受け付ける
      const value = Number(text);
      return isFinite(value) ? convert(value, this.inputUnit, '°', this.units) : NaN;
    },
    inputError() {
      if (this.degrees === null || !isNaN(this.degrees)) return '';
      return this.inputUnit === 'DMS'
        ? '度分秒として解釈できません（例: 35°41′22.5″）'
        : '数値を入力してください';
    },
    dmsValue() {
      if (this.degrees === null || isNaN(this.degrees)) return '';
      return formatDms(this.degrees);
    }
  },
  methods: {
    convertValue(targetUnit) {
      if (this.degrees === null || isNaN(this.degrees)) return '';
      return formatNumber(convert(this.degrees, '°', targetUnit, this.units));
    }
  }
};
</script>
