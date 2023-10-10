<template>
  <div class="progress-container flex items-center w-3/4 h-50 mx-auto ">
    <div class="progress-value w-24 text-right text-xl ">{{ currentVal }}{{ unit }}</div>
    <div class="progress flex-grow mx-2.5 my-2 bg-gray-200 rounded-full relative dark:bg-gray-700 " :class="barHeight">
      <div class="progress-bar h-15 bg-blue-600 text-xs font-medium text-red-100 text-center flex items-center justify-center " :style="{ width: progressPercentage + '%', height: '100%' }">{{ progressPercentage }}%</div>
    </div>
    <div class="progress-value w-24 text-right text-xl ">{{ nextVal }}{{ unit }}</div>
  </div>
</template>

<script>
export default {
  name: 'TimeProgress',
  props: {
    unit: {
      type: String,
      required: true
    },
    currentTime: {
      type: Number,
      required: true
    },
    totalTime: {
      type: Number,
      required: true
    },
    currentVal: {
      type: Number,
      required: true
    },
    nextVal: {
      type: Number,
      required: true
    },
    barHeight: {
      type: String,
      default: "h-5"  // デフォルトの高さをh-5とします。必要に応じて変更できます。
    },
  },
  computed: {
    progressPercentage() {
      return Math.floor((this.currentTime / this.totalTime) * 100);
    },
  }
}
</script>

<style scoped>
</style>
