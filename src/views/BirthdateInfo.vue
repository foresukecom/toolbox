<template>
  <div>
    <div style="display: flex; justify-content: center;">
      <div style="width: 33%;">
        <label>生年月日: </label>
        <input type="date" v-model="birthdate" @change="calculate()" />
        <div v-if="result">
          <h2 class="text-2xl my-5">生まれた日の情報</h2>
          <InfoCard title="星座" :text="result.zodiac" :showCopyButton="false" />
          <InfoCard title="干支" :text="result.zodiacSign" :showCopyButton="false" />
          <InfoCard title="曜日" :text="result.dayOfWeek" :showCopyButton="false" />

          <h2 class="text-2xl my-5">年表</h2>
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

        </div>
      </div>
    </div>
  </div>



  <div style="display: flex; justify-content: center;">
    <ol class="relative border-l border-gray-200 dark:border-gray-700">
      <li class="mb-10 ml-4" v-for="(milestone, index) in milestones" :key="index">
        <div
          class="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-900 dark:bg-gray-700">
        </div>
        <time class="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500"> {{ milestone.datetime }} </time>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ milestone.name }}</h3>
        <p class="mb-4 text-base font-normal text-gray-500 dark:text-gray-400"> {{ milestone.name }} </p>
      </li>
    </ol>

  </div>
</template>

<script>
import InfoCard from '@/components/InfoCard.vue';
import { formatDate } from "@/utilities/japaneseEra";

export default {
  components: {
    InfoCard
  },
  computed: {
    milestones() {
      return this.result?.milestones || [];
    },
  },
  data() {
    return {
      birthdate: '1989-01-01',
      result: null,
      universityDuration: 4,
      zodiacSigns: {
        '子': '🐭: 子',
        '丑': '🐮: 丑',
        '寅': '🐯: 寅',
        '卯': '🐰: 卯',
        '辰': '🐲: 辰',
        '巳': '🐍: 巳',
        '午': '🐴: 午',
        '未': '🐑: 未',
        '申': '🐵: 申',
        '酉': '🐔: 酉',
        '戌': '🐶: 戌',
        '亥': '🐗: 亥'
      },
      daysOfWeek: ['日', '月', '火', '水', '木', '金']
    }
  },
  mounted() {
    this.calculate();
  },
  methods: {
    calculate() {
      const birthdate = new Date(this.birthdate);
      const birthMonth = birthdate.getMonth() + 1; // Months are zero-indexed in JavaScript.
      const birthDay = birthdate.getDate();
      const birthYear = birthdate.getFullYear();
      const currentYear = new Date().getFullYear();
      const universityAdmissionYear = birthYear + 19;
      const universityGraduationYear = universityAdmissionYear + parseInt(this.universityDuration);

      const milestones = [
        { name: "成人年", year: birthYear + 20, age: 20, datetime: formatDate(this.addYearsToDate(birthdate, 20), true, false) },
        { name: "還暦", year: birthYear + 60, age: 60, datetime: formatDate(this.addYearsToDate(birthdate, 60), true, false) },
        { name: "古希", year: birthYear + 70, age: 70, datetime: formatDate(this.addYearsToDate(birthdate, 70), true, false) },
        { name: "喜寿", year: birthYear + 77, age: 77, datetime: formatDate(this.addYearsToDate(birthdate, 77), true, false) },
        { name: "米寿", year: birthYear + 88, age: 88, datetime: formatDate(this.addYearsToDate(birthdate, 88), true, false) },
        { name: "卒寿", year: birthYear + 90, age: 90, datetime: formatDate(this.addYearsToDate(birthdate, 90), true, false) },
        { name: "白寿", year: birthYear + 99, age: 99, datetime: formatDate(this.addYearsToDate(birthdate, 99), true, false) },
        { name: "傘寿", year: birthYear + 100, age: 100, datetime: formatDate(this.addYearsToDate(birthdate, 100), true, false) },
      ];
      milestones.sort((a, b) => a.year - b.year);

      const result = {
        zodiac: this.getZodiac(birthMonth, birthDay),
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
      const signs = Object.keys(this.zodiacSigns);
      return this.zodiacSigns[signs[year % 12]];
    },
    getZodiac(month, day) {
      if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) {
        return "♒️: 水瓶座";
      } else if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) {
        return "♓️: 魚座";
      } else if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) {
        return "♈️: 牡羊座";
      } else if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) {
        return "♉️: 牡牛座";
      } else if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) {
        return "♊️: 双子座";
      } else if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) {
        return "♋️: 蟹座";
      } else if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) {
        return "♌️: 獅子座";
      } else if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) {
        return "♍️: 乙女座";
      } else if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) {
        return "♎️: 天秤座";
      } else if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) {
        return "♏️: 蠍座";
      } else if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) {
        return "♐️: 射手座";
      } else {
        return "♑️: 山羊座";
      }
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
    addYearsToDate(baseDate, yearsToAdd) {
      // ベース日付に基づいて新しいDateオブジェクトを作成
      const newDate = new Date(baseDate);

      // 指定された年数を新しい日付に追加
      newDate.setFullYear(newDate.getFullYear() + yearsToAdd);

      // 新しい日付を返す
      return newDate;
    },
  }
}
</script>

<style scoped></style>