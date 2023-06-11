<template>
  <div class="countdown-container mx-auto max-w-2xl">
    <h1 class="text-center text-2xl font-bold mb-6">祝日までのカウントダウン</h1>
    <div class="grid grid-cols-1 gap-4">
      <InfoCard v-for="(holiday, index) in upcomingHolidays" :showCopyButton=false :key="index" :title="`${holiday.name} (${holiday.date})`"
        :text="countdown(holiday.date)" />
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import InfoCard from '../components/InfoCard.vue';

export default {
  components: {
    InfoCard,
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
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target - now;

      if (diff < 0) {
        return '祝日が過ぎました';
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`;
    },
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
};
</script>

<style scoped>
.countdown-container {
  padding: 1rem;
}
</style>
