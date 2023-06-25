<template>
  <div>
    <div style="display: flex; justify-content: center;">
      <div style="width: 33%;">
        <label>生年月日: </label>
        <input type="date" v-model="birthdate" @change="calculate()" />
        <div v-if="result">
          <InfoCard title="星座" :text="result.zodiac" :showCopyButton="false" />
          <InfoCard title="干支" :text="result.zodiacSign" :showCopyButton="false" />
          <InfoCard title="曜日" :text="result.dayOfWeek" :showCopyButton="false" />


          <InfoCard title="小学校"
            :text="`${result.primarySchoolAdmissionYear}年4月〜${result.primarySchoolGraduationYear}年3月 \n(${toJapaneseEra(result.primarySchoolAdmissionYear)}年4月〜${toJapaneseEra(result.primarySchoolGraduationYear)}年3月)`"
            :showCopyButton="false" />

          <InfoCard title="中学校"
            :text="`${result.middleSchoolAdmissionYear}年4月〜${result.middleSchoolGraduationYear}年3月 \n(${toJapaneseEra(result.middleSchoolAdmissionYear)}年4月〜${toJapaneseEra(result.middleSchoolGraduationYear)}年3月)`"
            :showCopyButton="false" />

          <InfoCard title="高校"
            :text="`${result.highSchoolAdmissionYear}年4月〜${result.highSchoolGraduationYear}年3月 \n(${toJapaneseEra(result.highSchoolAdmissionYear)}年4月〜${toJapaneseEra(result.highSchoolGraduationYear)}年3月)`"
            :showCopyButton="false" />

          <label>大学・専門学校の制度: </label>
          <select v-model="universityDuration" @change="calculate()">
            <option value="2">2年制</option>
            <option value="3">3年制</option>
            <option value="4" selected>4年制</option>
            <option value="6">6年制（大学院含む）</option>
          </select>
          <InfoCard title="大学・専門学校"
            :text="`${result.universityAdmissionYear}年4月〜${result.universityGraduationYear}年3月 \n(${toJapaneseEra(result.universityAdmissionYear)}年4月〜${toJapaneseEra(result.universityGraduationYear)}年3月)`"
            :showCopyButton="false" />

          <div v-for="(milestone, index) in result.milestones" :key="index">
            <InfoCard :title="milestone.name"
              :text="milestone.year.toString() + '年 (' + toJapaneseEra(milestone.year) + '年)'" :showCopyButton="false" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>



<script>
import InfoCard from '@/components/InfoCard.vue';

export default {
  components: {
    InfoCard
  },
  data() {
    return {
      birthdate: '1989-01-01',
      result: null,
      universityDuration: 4,
      zodiacSigns: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'],
      daysOfWeek: ['日', '月', '火', '水', '木', '金']
    }
  },
  mounted() {
    this.calculate();
  },
  methods: {
    calculate() {
      const birthdate = new Date(this.birthdate);
      const birthYear = birthdate.getFullYear();
      const currentYear = new Date().getFullYear();
      const universityAdmissionYear = birthYear + 19;
      const universityGraduationYear = universityAdmissionYear + parseInt(this.universityDuration);

      const milestones = [
        { name: "成人年", year: birthYear + 20 },
        { name: "古希年", year: birthYear + 70 },
        { name: "還暦年", year: birthYear + 60 },
        { name: "喜寿年", year: birthYear + 77 },
        { name: "米寿年", year: birthYear + 88 },
        { name: "卒寿年", year: birthYear + 90 },
        { name: "白寿年", year: birthYear + 99 },
        { name: "傘寿年", year: birthYear + 100 }
      ];
      milestones.sort((a, b) => a.year - b.year);

      const result = {
        zodiac: '星座',  // 星座を正確に計算するロジックは省略
        zodiacSign: this.getZodiacSign(birthYear),
        dayOfWeek: this.daysOfWeek[birthdate.getDay()],
        primarySchoolAdmissionYear: birthYear + 7,
        primarySchoolGraduationYear: birthYear + 7 + 6,
        middleSchoolAdmissionYear: birthYear + 7 + 6,
        middleSchoolGraduationYear: birthYear + 7 + 6 + 3,
        highSchoolAdmissionYear: birthYear + 7 + 6 + 3,
        highSchoolGraduationYear: birthYear + 7 + 6 + 3 + 3,
        universityAdmissionYear: universityAdmissionYear,
        universityGraduationYear: universityGraduationYear,
        workExperience: Math.max(0, currentYear - universityGraduationYear),
        milestones: milestones,
      };
      this.result = result;
    },
    getZodiacSign(year) {
      return this.zodiacSigns[year % 12];
    },
    toJapaneseEra: function (year) {
      if (year < 1926) {
        return `大正${year - 1911}`;
      } else if (year < 1989) {
        return `昭和${year - 1925}`;
      } else if (year < 2019) {
        return `平成${year - 1988}`;
      } else {
        return `令和${year - 2018}`;
      }
    },
  }
}
</script>

<style scoped></style>