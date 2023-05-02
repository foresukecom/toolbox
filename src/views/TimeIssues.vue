<template>
  <div>
    <div class="container">
      <div class="row row-cols-1">
        <div class="col mb-4" v-for="(timeIssue, index) in sortedTimeIssues" :key="index">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">{{ timeIssue.name }}</h5>
              <p class="card-text">{{ timeIssue.description }}</p>
              <p class="card-text">
                <small class="text-muted">{{ formatDate(timeIssue.deadline) }}</small>
              </p>
              <p class="card-text">
                残り: {{ countdown(timeIssue.deadline) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import { ref, onMounted, onUnmounted } from "vue";
import timeIssuesData from "@/assets/time_issues.json";

export default {
  name: "TimeIssues",
  setup() {
    // FIXME データを修正
    const timeIssues = ref(timeIssuesData);

    const updateDateTime = () => {
      timeIssues.value = timeIssues.value.map((issue) => {
        issue.timeLeft = issue.deadline - new Date();
        return issue;
      });
    };

    const timer = setInterval(updateDateTime, 1000);

    onMounted(() => {
      updateDateTime();
    });

    onUnmounted(() => {
      clearInterval(timer);
    });

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}時${date.getMinutes()}分${date.getSeconds()}秒`;
    };

    const countdown = (deadline) => {
      const timeLeft = new Date(deadline) - new Date();
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      return `${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`;
    };

    return {
      timeIssues,
      formatDate,
      countdown,
    };
  },
  computed: {
    sortedTimeIssues() {
      return [...this.timeIssues].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    },
  },
};
</script>


<style scoped>
.time-issues {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.issue-card {
  width: 90%;
  max-width: 500px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 20px;
  margin: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
</style>
