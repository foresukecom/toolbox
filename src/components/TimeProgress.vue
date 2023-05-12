<template>
  <div>
    <div class="progress-container">
      <div class="progress-value">{{ currentVal }}{{ unit }}</div>
      <div class="progress">
        <div class="progress-bar" :style="{ width: progressPercentage + '%' }">
          {{ progressPercentage.toFixed(2) }}%
        </div>
      </div>
      <div class="progress-value">{{ nextVal }}{{ unit }}</div>
    </div>
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
  width: 80%;
  height: 50px;
  margin: 0 auto;
}

.progress-value {
  width: 100px;
  text-align: center;
  font-size: large;
}

.progress {
  flex-grow: 1;
  margin: 0 10px;
  background-color: #f5f5f5;
}

.progress-bar {
  height: 45px;
  background-color: #007bff;
}
</style>
