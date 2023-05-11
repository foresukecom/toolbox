<template>
  <div>
    <h2>{{ unit }}</h2>
    <div class="progress">
      <div class="progress-bar" :style="{width: progressPercentage + '%'}">
        {{ progressPercentage.toFixed(2) }}%
      </div>
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
    }
  },
  computed: {
    progressPercentage() {
      return (this.currentTime / this.totalTime) * 100;
    }
  }
}
</script>

<style scoped>
.progress {
  width: 100%;
  background-color: #f5f5f5;
}

.progress-bar {
  height: 20px;
  background-color: #007bff;
}
</style>
