<template>
  <div>
    <div class="current-time">{{ formattedNow }}</div>
    <TimeProgress unit="年" :currentTime="currentTimeOfYear" :totalTime="totalTimeOfYear" :currentVal="currentYear"
      :nextVal="nextYear" />
      <TimeProgress unit="月" :currentTime="currentTimeOfMonth" :totalTime="totalTimeOfMonth" :currentVal="currentMonth"
      :nextVal="nextMonth" />
      <TimeProgress unit="日" :currentTime="currentTimeOfDay" :totalTime="totalTimeOfDay" :currentVal="currentDay"
      :nextVal="nextDay" />
      <TimeProgress unit="時" :currentTime="currentTimeOfHour" :totalTime="totalTimeOfHour" :currentVal="currentHour"
      :nextVal="nextHour" />
      <TimeProgress unit="分" :currentTime="currentTimeOfMinute" :totalTime="totalTimeOfMinute"
      :currentVal="currentMinute" :nextVal="nextMinute" />
    <TimeProgress unit="秒" :currentTime="currentTimeOfSecond" :totalTime="totalTimeOfSecond"
      :currentVal="currentSecond" :nextVal="nextSecond" />
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
    },

    currentYear() {
      return this.now.getFullYear();
    },
    nextYear() {
      return this.now.getFullYear() + 1;
    },
    currentMonth() {
      return this.now.getMonth() + 1;
    },
    nextMonth() {
      return this.now.getMonth() === 11 ? 1 : this.now.getMonth() + 2;
    },
    currentDay() {
      return this.now.getDate();
    },
    nextDay() {
      return this.now.getDate() === new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0).getDate() ? 1 : this.now.getDate() + 1;
    },
    currentHour() {
      return this.now.getHours();
    },
    nextHour() {
      return this.now.getHours() === 23 ? 0 : this.now.getHours() + 1;
    },
    currentMinute() {
      return this.now.getMinutes();
    },
    nextMinute() {
      return this.now.getMinutes() === 59 ? 0 : this.now.getMinutes() + 1;
    },
    currentSecond() {
      return this.now.getSeconds();
    },
    nextSecond() {
      return this.now.getSeconds() === 59 ? 0 : this.now.getSeconds() + 1;
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
}</style>
