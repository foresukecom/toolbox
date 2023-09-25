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
        <p class="mb-4 text-base font-semibold text-gray-500 dark:text-gray-400"> {{ milestone.name }}</p>
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
      const schoolDates = this.calculateSchoolDates(birthdate);

      const milestones = [
        { name: "小学校入学",datetime: formatDate(schoolDates.elementary.enter, false, false, true, true, false, false, false) },
        { name: "小学校卒業", datetime: formatDate(schoolDates.elementary.graduate, false, false, true, true, false, false, false) },
        { name: "中学校入学", datetime: formatDate(schoolDates.middle.enter, false, false, true, true, false, false, false) },
        { name: "中学校卒業", datetime: formatDate(schoolDates.middle.graduate, false, false, true, true, false, false, false) },
        { name: "高校入学", datetime: formatDate(schoolDates.high.enter, false, false, true, true, false, false, false) },
        { name: "高校卒業", datetime: formatDate(schoolDates.high.graduate, false, false, true, true, false, false, false) },
        { name: "大学入学", datetime: formatDate(schoolDates.university.enter, false, false, true, true, false, false, false) },
        { name: "大学卒業(2年制)", datetime: formatDate(schoolDates.junior_college.graduate, false, false, true, true, false, false, false) },
        { name: "大学卒業(4年制)", datetime: formatDate(schoolDates.university.graduate, false, false, true, true, false, false, false) },
        { name: "還暦", datetime: formatDate(this.addYearsToDate(birthdate, 60), false, false, true, true, true, true, false) },
        { name: "古希", datetime: formatDate(this.addYearsToDate(birthdate, 70), false, false, true, true, true, true, false) },
        { name: "喜寿", datetime: formatDate(this.addYearsToDate(birthdate, 77), false, false, true, true, true, true, false) },
        { name: "米寿", datetime: formatDate(this.addYearsToDate(birthdate, 88), false, false, true, true, true, true, false) },
        { name: "卒寿", datetime: formatDate(this.addYearsToDate(birthdate, 90), false, false, true, true, true, true, false) },
        { name: "白寿", datetime: formatDate(this.addYearsToDate(birthdate, 99), false, false, true, true, true, true, false) },
        { name: "傘寿", datetime: formatDate(this.addYearsToDate(birthdate, 100),false, false, true, true, true, true, false) },
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
    addYearsToDate(baseDate, yearsToAdd) {
      // ベース日付に基づいて新しいDateオブジェクトを作成
      const newDate = new Date(baseDate);

      // 指定された年数を新しい日付に追加
      newDate.setFullYear(newDate.getFullYear() + yearsToAdd);

      // 新しい日付を返す
      return newDate;
    },
    calculateSchoolDates(birthDate) {
      const birth = new Date(birthDate);
      const schoolDates = {};

      // 4月1日以前と4月2日以降で学年が異なる
      const offset = (birth.getMonth() === 3 && birth.getDate() >= 2) ? 1 : 0;

      // 入学日と卒業日の設定
      const setSchoolDates = (ageEnter, ageGraduate, school) => {
        schoolDates[school] = {
          enter: new Date(birth.getFullYear() + ageEnter + offset, 3, 1),
          graduate: new Date(birth.getFullYear() + ageGraduate + offset, 2, 31)
        };
      };
    
      setSchoolDates(6, 12, 'elementary'); // 小学校
      setSchoolDates(13, 15, 'middle');    // 中学校
      setSchoolDates(16, 18, 'high');      // 高校
      setSchoolDates(19, 23, 'university'); // 4年制大学
      setSchoolDates(19, 21, 'junior_college'); // 2年制大学
    
      return schoolDates;
    }
  }
}
</script>

<style scoped></style>