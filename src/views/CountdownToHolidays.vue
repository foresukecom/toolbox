<template>
  <div class="countdown-container mx-auto max-w-2xl">
    <h1 class="text-center text-2xl font-bold mb-6">祝日までのカウントダウン</h1>
    <div style="display: flex; justify-content: center;">
      <ol class="relative border-l border-gray-200 dark:border-gray-700">
        <li class="mb-10 ml-4" v-for="holiday in filteredHolidays" :key="holiday.date">
          <div
            class="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-900 dark:bg-gray-700">
          </div>
          <time class="mb-1 text-x font-normal leading-none text-gray-400 dark:text-gray-500">
            {{ holiday.date }} {{ holiday.name }}
            <span v-if="isToday(holiday.date)" class="text-red-500"></span>
          </time>
          <p class="mb-4 text-xl text-base font-semibold text-gray-500 dark:text-gray-700 pt-3">
            <span class="w-30 inline-block">{{ countdown(holiday.date) }}</span>
          </p>
        </li>
      </ol>
    </div>

  </div>
</template>

<script>
import axios from 'axios';

export default {
  components: {
  },
  data() {
    return {
      holidays: [],
      upcomingHolidays: [],
      countdownInterval: null,
    };
  },
  methods: {
    async fetchHolidays() {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const response = await axios.get(
        `https://holidays-jp.github.io/api/v1/${currentYear}/date.json`
      );
      const responseNextYear = await axios.get(
        `https://holidays-jp.github.io/api/v1/${nextYear}/date.json`
      );
      this.holidays = { ...response.data, ...responseNextYear.data };
      this.upcomingHolidays = this.getUpcomingHolidays();
    },
    getUpcomingHolidays() {
      const now = new Date();
      return Object.entries(this.holidays)
        .map(([date, name]) => ({ date, name }))
        .filter(({ date }) => new Date(date) >= now)
        .slice(0, 20);
    },
    countdown(targetDate) {
      // 現在時刻をUTCに変換
      const nowUTC = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
      // UTCからJST（日本標準時、UTC+9）に変換
      const nowJST = new Date(nowUTC + (3600000 * 9));
      const target = new Date(targetDate + "T00:00:00+09:00"); // JSTを明示的に指定

      const diff = target - nowJST;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`;
    },

    isTodayOrLater(date) {
      const currentDate = new Date();
      const holidayDate = new Date(date + "T00:00:00+09:00"); // タイムゾーンをJSTに設定);
      return holidayDate >= currentDate;
    },
    isToday(date) {
      const currentDate = new Date();
      const holidayDate = new Date(date + "T00:00:00+09:00"); // タイムゾーンをJSTに設定
      return (
        holidayDate.getFullYear() === currentDate.getFullYear() &&
        holidayDate.getMonth() === currentDate.getMonth() &&
        holidayDate.getDate() === currentDate.getDate()
      );
    }
  },
  async mounted() {
    await this.fetchHolidays();
    this.countdownInterval = setInterval(() => {
      this.$forceUpdate();
    }, 1000);
  },
  beforeUnmount() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  },
  computed: {
    filteredHolidays() {
      // まずはオブジェクトのキーと値を配列に変換する
      return Object.entries(this.holidays)
        .map(([date, name]) => ({ date, name })) // ここでオブジェクトの配列に変換される
        .filter(holiday => this.isTodayOrLater(holiday.date)); // 祝日が今日以降であるかフィルタリング
    }
  },

};
</script>
