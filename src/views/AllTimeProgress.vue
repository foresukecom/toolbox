<template>
  <div>
    <div class="current-time">{{ formattedNow }}</div>

    <TimeProgress unit="Second" :currentTime="currentTimeOfSecond" :totalTime="totalTimeOfSecond" />
    <TimeProgress unit="Minute" :currentTime="currentTimeOfMinute" :totalTime="totalTimeOfMinute" />
    <TimeProgress unit="Hour" :currentTime="currentTimeOfHour" :totalTime="totalTimeOfHour" />
    <TimeProgress unit="Day" :currentTime="currentTimeOfDay" :totalTime="totalTimeOfDay" />
    <TimeProgress unit="Month" :currentTime="currentTimeOfMonth" :totalTime="totalTimeOfMonth" />
    <TimeProgress unit="Year" :currentTime="currentTimeOfYear" :totalTime="totalTimeOfYear" />
  </div>
</template>

<script>
import TimeProgress from '@/components/TimeProgress.vue';

export default {
  name: 'AllTimeProgress',
  components: {
    TimeProgress
  },
  data() {
    return {
      now: new Date(),
      timerId: null,
      currentTimeOfSecond: 0
    };
  },
  created() {
    this.timerId = setInterval(() => {
      this.now = new Date();
    }, 1000);
  },
  beforeUnmount() {
    clearInterval(this.timerId);
    cancelAnimationFrame(this.updateSecondProgress);
  },
  computed: {
    currentTimeOfYear() {
      const startOfYear = new Date(this.now.getFullYear(), 0, 1);
      return this.now - startOfYear;
    },
    totalTimeOfYear() {
      const endOfYear = new Date(this.now.getFullYear() + 1, 0, 1);
      const startOfYear = new Date(this.now.getFullYear(), 0, 1);
      return endOfYear - startOfYear;
    },
    currentTimeOfMonth() {
      const startOfMonth = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
      return this.now - startOfMonth;
    },
    totalTimeOfMonth() {
      const endOfMonth = new Date(this.now.getFullYear(), this.now.getMonth() + 1, 1);
      const startOfMonth = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
      return endOfMonth - startOfMonth;
    },
    currentTimeOfDay() {
      const startOfDay = new Date(this.now.getFullYear(), this.now.getMonth(), this.now.getDate());
      return this.now - startOfDay;
    },
    totalTimeOfDay() {
      return 24 * 60 * 60 * 1000; // 1日は24時間
    },
    currentTimeOfHour() {
      return this.now.getMinutes() * 60 * 1000 + this.now.getSeconds() * 1000 + this.now.getMilliseconds();
    },
    totalTimeOfHour() {
      return 60 * 60 * 1000; // 1時間は60分
    },
    currentTimeOfMinute() {
      return this.now.getSeconds() * 1000 + this.now.getMilliseconds();
    },
    totalTimeOfMinute() {
      return 60 * 1000; // 1分は60秒
    },
    totalTimeOfSecond() {
      return 1000; // 1秒は1000ミリ秒
    },
    formattedNow() {
      return this.now.toLocaleString();
    }
  },
  mounted() {
    this.updateSecondProgress();
  },
  methods: {
    updateSecondProgress() {
      const now = new Date();
      this.currentTimeOfSecond = now.getMilliseconds();
      requestAnimationFrame(this.updateSecondProgress);
    }
  }
};
</script>

<style scoped>
.current-time {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 1em;
  text-align: center;
}
</style>
