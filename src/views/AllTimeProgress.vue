<template>
  <div>
    <div class="current-time">{{ formattedNow }}</div>

    <div class="controls">
      <div class="style-picker" role="radiogroup" aria-label="バーのスタイル">
        <button
          v-for="opt in styleOptions"
          :key="opt.value"
          type="button"
          role="radio"
          class="style-option"
          :class="{ active: variant === opt.value }"
          :aria-checked="variant === opt.value"
          @click="variant = opt.value"
        >{{ opt.label }}</button>
      </div>
      <label class="inline-flex items-center gap-2">
        小数点以下
        <select v-model.number="decimals" class="border rounded-md p-1">
          <option v-for="n in [0, 1, 2, 3]" :key="n" :value="n">{{ n }}桁</option>
        </select>
      </label>
    </div>

    <div :class="variant === 'ring' ? 'ring-grid' : ''">
      <TimeProgress
        v-for="bar in bars"
        :key="bar.unit"
        :unit="bar.unit"
        :currentTime="bar.currentTime"
        :totalTime="bar.totalTime"
        :currentVal="bar.currentVal"
        :nextVal="bar.nextVal"
        :barHeight="bar.barHeight"
        :segments="bar.segments"
        :variant="variant"
        :decimals="decimals"
      />
    </div>
  </div>
</template>

<script>
import TimeProgress from '@/components/TimeProgress.vue';

const STORAGE_KEY = 'toolbox.timeProgress.settings';
const STYLE_OPTIONS = [
  { value: 'standard', label: '標準' },
  { value: 'gradient', label: 'グラデーション' },
  { value: 'stripe', label: 'ストライプ' },
  { value: 'segment', label: 'セグメント' },
  { value: 'minimal', label: 'ミニマル' },
  { value: 'text', label: 'テキスト' },
  { value: 'ring', label: 'リング' },
];

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export default {
  name: 'AllTimeProgress',
  components: {
    TimeProgress
  },
  data() {
    const saved = loadSettings();
    return {
      styleOptions: STYLE_OPTIONS,
      variant: STYLE_OPTIONS.some(opt => opt.value === saved.variant) ? saved.variant : 'standard',
      decimals: [0, 1, 2, 3].includes(saved.decimals) ? saved.decimals : 0,
      now: new Date(),
      timerId: null,
      rafId: null,
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
    cancelAnimationFrame(this.rafId);
  },
  watch: {
    variant: 'saveSettings',
    decimals: 'saveSettings',
  },
  computed: {
    bars() {
      return [
        { unit: '年', currentTime: this.currentTimeOfYear, totalTime: this.totalTimeOfYear, currentVal: this.currentYear, nextVal: this.nextYear, barHeight: 'h-16', segments: 12 },
        { unit: '月', currentTime: this.currentTimeOfMonth, totalTime: this.totalTimeOfMonth, currentVal: this.currentMonth, nextVal: this.nextMonth, barHeight: 'h-14', segments: this.daysInMonth },
        { unit: '日', currentTime: this.currentTimeOfDay, totalTime: this.totalTimeOfDay, currentVal: this.currentDay, nextVal: this.nextDay, barHeight: 'h-12', segments: 24 },
        { unit: '時', currentTime: this.currentTimeOfHour, totalTime: this.totalTimeOfHour, currentVal: this.currentHour, nextVal: this.nextHour, barHeight: 'h-9', segments: 60 },
        { unit: '分', currentTime: this.currentTimeOfMinute, totalTime: this.totalTimeOfMinute, currentVal: this.currentMinute, nextVal: this.nextMinute, barHeight: 'h-6', segments: 60 },
        { unit: '秒', currentTime: this.currentTimeOfSecond, totalTime: this.totalTimeOfSecond, currentVal: this.currentSecond, nextVal: this.nextSecond, barHeight: 'h-3', segments: 10 },
      ];
    },
    daysInMonth() {
      return new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0).getDate();
    },
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
      return this.now.getDate() === this.daysInMonth ? 1 : this.now.getDate() + 1;
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
    saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ variant: this.variant, decimals: this.decimals }));
      } catch (e) {
        // 保存できなくても表示には影響しない
      }
    },
    updateSecondProgress() {
      const now = new Date();
      this.currentTimeOfSecond = now.getMilliseconds();
      this.rafId = requestAnimationFrame(this.updateSecondProgress);
    }
  }
};
</script>

<style scoped>
.current-time {
  font-size: 40px;
  font-weight: bold;
  margin-bottom: 1em;
  text-align: center;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem 1.5rem;
  margin-bottom: 1.5rem;
}

.style-picker {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.style-option {
  padding: 0.25rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  font-size: 0.875rem;
}

.style-option:hover {
  border-color: #2563eb;
}

.style-option.active {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.ring-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem 1rem;
  max-width: 720px;
  margin: 0 auto;
}

@media (min-width: 640px) {
  .ring-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
