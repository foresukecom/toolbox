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
      inputUnit: 'm',
      units: [
        // メートル法（小さい順）
        { name: 'nm', reading: 'ナノメートル', remark: '1 m = 1×10^9 nm' },
        { name: 'µm', reading: 'マイクロメートル', remark: '1 m = 1×10^6 µm' },
        { name: 'mm', reading: 'ミリメートル', remark: '1 m = 1000 mm' },
        { name: 'cm', reading: 'センチメートル', remark: '1 m = 100 cm' },
        { name: 'm', reading: 'メートル', remark: '基本単位' },
        { name: 'km', reading: 'キロメートル', remark: '1 km = 1000 m' },

        // 英米単位系（小さい順）
        { name: 'in', reading: 'インチ', remark: '1 m = 39.3701 in' },
        { name: 'ft', reading: 'フィート', remark: '1 m = 3.28084 ft' },
        { name: 'yd', reading: 'ヤード', remark: '1 m = 1.09361 yd' },
        { name: 'chain', reading: 'チェーン', remark: '1 chain = 66 ft' },
        { name: 'fathom', reading: 'ファゾム', remark: '1 fathom = 6 ft' },
        { name: 'rod', reading: 'ロッド', remark: '1 rod = 16.5 ft' },
        { name: 'mi', reading: 'マイル', remark: '1 km = 0.621371 mi' },
        { name: 'league', reading: 'リーグ', remark: '1 league = 3 mi' },

        // その他
        { name: '尺', reading: 'しゃく', remark: '1 m ≒ 30.3 cm' },
        { name: '間', reading: 'けん', remark: '1 m ≒ 1.818 m' },
        { name: '丈', reading: 'じょう', remark: '1 m ≒ 3.03 m' },
        { name: '里', reading: 'り', remark: '1 m ≒ 3.927 km' },
      ]
    };
  },
  methods: {
  convertValue(targetUnit) {
    const conversionRates = {
      nm: 1e+9,
      µm: 1e+6,
      mm: 1000,
      cm: 100,
      m: 1,
      km: 0.001,
      in: 39.3701,
      ft: 3.28084,
      yd: 1.09361,
      chain: 0.0497097,
      fathom: 0.546807,
      rod: 0.198839,
      mi: 0.000621371,
      league: 0.000207124,
      尺: 3.3,
      間: 0.545455,
      丈: 0.3302,
      里: 0.000254,
      link: 4.97096,
      // 他の単位のレートも追加可能
    };
    if (!this.inputValue) return ''; // 入力がない場合は空文字を返す
    const baseValue = this.inputValue / conversionRates[this.inputUnit]; // 入力単位をメートルに変換
    const convertedValue = baseValue * conversionRates[targetUnit];
    return isNaN(convertedValue) ? '' : convertedValue.toFixed(1); // 数値でなければ空文字、そうでなければ数値をフォーマットして返す
  }
}

};
</script>
