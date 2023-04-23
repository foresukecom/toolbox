<template>
  <div>
    <h1>Countdown to Holidays</h1>
    <div v-for="(holiday, index) in upcomingHolidays" :key="index" class="holiday-container">
      <div class="holiday-name">{{ holiday.name }}</div>
      <div class="holiday-date">{{ holiday.date }}</div>
      <div class="countdown">{{ getCountdownText(holiday.date) }}</div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      holidays: [],
      timer: null,
    };
  },
  computed: {
    upcomingHolidays() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const filteredHolidays = this.holidays.filter(holiday => {
        const holidayDate = new Date(holiday.date);
        return holidayDate >= today;
      });

      const uniqueHolidays = [...new Map(filteredHolidays.map(h => [h.date, h])).values()];
      uniqueHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));
      return uniqueHolidays.slice(0, 20);
    }
  },
  methods: {
    getCountdownText(date) {
      const now = new Date();
      const holidayDate = new Date(date);
      const diff = holidayDate - now;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${days} days ${hours} hours ${minutes} minutes ${seconds} seconds left`;
    },
    updateCountdown() {
      this.timer = setInterval(() => {
        this.$forceUpdate();
      }, 1000);
    },
  },
  async mounted() {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    try {
      const responseCurrentYear = await axios.get(
        `https://holidays-jp.github.io/api/v1/date.json?year=${currentYear}&count=20`
      );
      const responseNextYear = await axios.get(
        `https://holidays-jp.github.io/api/v1/date.json?year=${nextYear}&count=20`
      );

      const holidaysCurrentYear = Object.entries(responseCurrentYear.data).map(([date, name]) => ({
        date,
        name,
      }));

      const holidaysNextYear = Object.entries(responseNextYear.data).map(([date, name]) => ({
        date,
        name,
      }));

      this.holidays = holidaysCurrentYear.concat(holidaysNextYear);
      this.updateCountdown();
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  },
  beforeDestroy() {
    clearInterval(this.timer);
  },
};
</script>

<style scoped>
.holiday-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-bottom: 1rem;
}

.holiday-name {
  font-weight: bold;
}

.countdown {
  font-weight: bold;
  color: #f44336;
}
</style>
