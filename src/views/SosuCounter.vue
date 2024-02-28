<template>
  <div>
    <ul>
      <li v-for="(item, index) in displayedPrimes" :key="index">
        {{ item.number }} ({{ item.time }})
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentNumber: 2,
      displayedPrimes: [],
    };
  },
  mounted() {
    this.findNextPrime();
  },
  beforeUnmount() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  },
  methods: {
    findNextPrime() {
      let found = false;
      while (!found) {
        if (this.isPrime(this.currentNumber)) {
          const now = new Date();
          this.displayedPrimes.push({
            number: this.currentNumber,
            time: now.toLocaleTimeString(),
          });
          found = true;
        }
        this.currentNumber++;
      }
      this.adjustNextCall();
    },
    adjustNextCall() {
      const now = new Date();
      const nextCallDelay = 1000 - (now.getMilliseconds());
      this.timeoutId = setTimeout(() => {
        this.findNextPrime();
      }, nextCallDelay);
    },
    isPrime(num) {
      for (let i = 2, s = Math.sqrt(num); i <= s; i++) {
        if (num % i === 0) return false;
      }
      return num !== 1;
    },
  },
};
</script>
