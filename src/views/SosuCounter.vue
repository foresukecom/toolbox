<template>
  <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
    <div v-for="(prime, index) in displayedPrimes" :key="index"
      class="flex justify-center items-center h-auto max-w-full rounded-lg bg-blue-100 p-4 shadow-lg">
      <span class="text-lg font-bold">{{ prime.number }}</span>
    </div>
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
      const addPrime = () => {
        if (this.isPrime(this.currentNumber)) {
          // 配列の先頭に新しい素数を追加
          this.displayedPrimes.unshift({ number: this.currentNumber });
          return true;
        }
        return false;
      };
      let found = false;
      while (!found) {
        found = addPrime();
        this.currentNumber++;
      }
      setTimeout(() => this.findNextPrime(), 1000);
    },
    isPrime(num) {
      for (let i = 2, s = Math.sqrt(num); i <= s; i++) {
        if (num % i === 0) return false;
      }
      return num > 1;
    },
  },

  adjustNextCall() {
    const now = new Date();
    const nextCallDelay = 1000 - (now.getMilliseconds());
    this.timeoutId = setTimeout(() => {
      this.findNextPrime();
    }, nextCallDelay);
  },
};
</script>
