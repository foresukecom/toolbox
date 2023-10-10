<template>
  <div class="progress-container">
    <div class="progress-value">{{ currentVal }}{{ unit }}</div>
    <div class="progress mb-4 bg-gray-200 rounded-full h-2/5 position-relative dark:bg-gray-700">
      <div class="progress-bar bg-primary position-absolute" :style="{ width: progressPercentage + '%' }"></div>
    </div>
    <div class="progress-value">{{ nextVal }}{{ unit }}</div>
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
  },
  computed: {
    progressPercentage() {
      return (this.currentTime / this.totalTime) * 100;
    },
  }
}
</script>

<style scoped>
.progress-container {
  display: flex;
  align-items: center;
  width: 75%;
  height: 50px;
  margin: 0 auto;
}

.progress-value {
  width: 100px;
  text-align: right; 
  font-size: 25px; 
}

.progress {
  flex-grow: 1;
  margin: 0 10px;
  background-color: #f5f5f5;
}

.progress-bar {
  height: 60px;
  background-color: #007bff;
}
</style>
