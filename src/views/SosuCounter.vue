<template>
  <div class="grid grid-cols-3 gap-4">
    <div v-for="(prime, index) in primes" :key="index" class="card bg-white shadow-lg rounded-lg p-4">
      <div class="font-bold text-xl">{{ prime.number }}</div>
      <div class="text-gray-500">Found at: {{ prime.time }}</div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      primes: [], // 素数と発見時刻を保持する配列
      currentNumber: 2
    };
  },
  created() {
    this.findPrimes(); // コンポーネントの作成時に素数探索を開始
  },
  methods: {
    findPrimes() {
      this.interval = setInterval(() => {
        if (this.isPrime(this.currentNumber)) {
          const now = new Date();
          this.primes.push({ 
            number: this.currentNumber,
            time: now.toLocaleTimeString() // 現在の時刻を文字列として追加
          });
        }
        this.currentNumber++;
      }, 1000);
    },
    isPrime(num) {
      for (let i = 2, s = Math.sqrt(num); i <= s; i++) {
        if (num % i === 0) return false;
      }
      return num > 1;
    }
  },
  beforeUnmount() {
    clearInterval(this.interval);
  }
};
</script>

