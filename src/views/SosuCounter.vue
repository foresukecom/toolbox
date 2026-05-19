<template>
  <div class="flexible-grid">
    <div v-for="(prime, index) in displayedPrimes" :key="index"
         class="flex justify-center items-center rounded-lg shadow-lg"
         :class="prime.color" style="height: 128px;">
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
      colors: ['bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100'],
      timerId: null,
    };
  },
  mounted() {
    this.findNextPrime();
  },
  beforeUnmount() {
    clearTimeout(this.timerId);
  },
  methods: {
    findNextPrime() {
      const addPrime = () => {
        if (this.isPrime(this.currentNumber)) {
          // 色の配列からランダムに色を選択
          const color = this.colors[Math.floor(Math.random() * this.colors.length)];
          // 配列の先頭に新しい素数とその色を追加
          this.displayedPrimes.unshift({ number: this.currentNumber, color });
          return true;
        }
        return false;
      };
      let found = false;
      while (!found) {
        found = addPrime();
        this.currentNumber++;
      }
      this.timerId = setTimeout(() => this.findNextPrime(), 1000);
    },
    isPrime(num) {
      for (let i = 2, s = Math.sqrt(num); i <= s; i++) {
        if (num % i === 0) return false;
      }
      return num > 1;
    },
  },
};
</script>

<style>
.flexible-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 1rem;
}
</style>