<template>
  <div class="dev-tool cat-number">
    <div class="controls">
      <button type="button" class="control-button" @click="togglePause">
        {{ paused ? '再開' : '一時停止' }}
      </button>
      <div class="speed-picker" role="radiogroup" aria-label="速度">
        <button
          v-for="opt in speedOptions"
          :key="opt.value"
          type="button"
          role="radio"
          class="speed-option"
          :class="{ active: speed === opt.value }"
          :aria-checked="speed === opt.value"
          @click="setSpeed(opt.value)"
        >{{ opt.label }}</button>
      </div>
      <button type="button" class="control-button" @click="reset">リセット</button>
    </div>

    <dl class="stats">
      <div class="stat">
        <dt>分解した数</dt>
        <dd>{{ count.toLocaleString() }}</dd>
      </div>
      <div class="stat">
        <dt>うち素数</dt>
        <dd>{{ primeCount.toLocaleString() }}<span class="stat-sub">（{{ primeRatio }}）</span></dd>
      </div>
      <div class="stat">
        <dt>素因数が最多（重複込み）</dt>
        <dd v-if="maxOmegaRecord">{{ maxOmegaRecord.n }}<span class="stat-sub">（{{ maxOmegaRecord.value }}個）</span></dd>
        <dd v-else>-</dd>
      </div>
      <div class="stat">
        <dt>素因数の種類が最多</dt>
        <dd v-if="maxDistinctRecord">{{ maxDistinctRecord.n }}<span class="stat-sub">（{{ maxDistinctRecord.value }}種類）</span></dd>
        <dd v-else>-</dd>
      </div>
    </dl>

    <!-- 凡例: 合成数は素因数の個数 Ω(n) が多いほど濃くなる -->
    <div class="legend">
      <span class="legend-item"><span class="legend-swatch tile-prime"></span>素数</span>
      <span class="legend-group">
        <span>合成数 Ω(n):</span>
        <span v-for="level in legendLevels" :key="level.value" class="legend-item">
          <span class="legend-swatch" :class="'omega-' + level.value"></span>{{ level.label }}
        </span>
      </span>
    </div>

    <div class="factor-grid">
      <div
        v-for="tile in tiles"
        :key="tile.n"
        class="tile"
        :class="tile.isPrime ? 'tile-prime' : 'omega-' + omegaLevel(tile.omega)"
        :title="tileTitle(tile)"
      >
        <span v-if="tile.isPrime" class="prime-badge">素数</span>
        <span class="tile-number">{{ tile.n }}</span>
        <span v-if="!tile.isPrime" class="tile-factors">
          <template v-for="(f, i) in tile.factors" :key="f.p">
            <span v-if="i > 0" class="times">×</span>
            <span class="factor">{{ f.p }}<sup v-if="f.e > 1">{{ f.e }}</sup></span>
          </template>
        </span>
      </div>
    </div>
    <p class="hint mt-4">表示は最新 {{ maxTiles }} 件までです。</p>
  </div>
</template>

<script>
const STORAGE_KEY = 'toolbox.primeFactorCounter.settings';
// 画面に残すタイルの上限（DOM が増え続けないように）
const MAX_TILES = 200;
const SPEED_OPTIONS = [
  { value: 'slow', label: 'ゆっくり', interval: 2000 },
  { value: 'normal', label: '普通', interval: 1000 },
  { value: 'fast', label: '速い', interval: 250 },
];
// 色の段階の上限（Ω(n) がこれ以上は同じ濃さ）
const MAX_OMEGA_LEVEL = 7;

// 試し割りで素因数分解し、[{ p: 素因数, e: 指数 }] を昇順で返す
function factorize(n) {
  const factors = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p += p === 2 ? 1 : 2) {
    if (rest % p !== 0) continue;
    let e = 0;
    while (rest % p === 0) {
      rest /= p;
      e++;
    }
    factors.push({ p, e });
  }
  if (rest > 1) factors.push({ p: rest, e: 1 });
  return factors;
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export default {
  name: 'PrimeFactorCounter',
  data() {
    const saved = loadSettings();
    const speed = SPEED_OPTIONS.some((o) => o.value === saved.speed) ? saved.speed : 'normal';
    return {
      speedOptions: SPEED_OPTIONS,
      speed,
      paused: false,
      maxTiles: MAX_TILES,
      currentNumber: 2,
      tiles: [],
      count: 0,
      primeCount: 0,
      maxOmegaRecord: null,
      maxDistinctRecord: null,
      timerId: null,
    };
  },
  computed: {
    interval() {
      return SPEED_OPTIONS.find((o) => o.value === this.speed).interval;
    },
    primeRatio() {
      if (this.count === 0) return '0%';
      return `${((this.primeCount / this.count) * 100).toFixed(1)}%`;
    },
    legendLevels() {
      const levels = [];
      for (let v = 2; v <= MAX_OMEGA_LEVEL; v++) {
        levels.push({ value: v, label: v === MAX_OMEGA_LEVEL ? `${v}+` : String(v) });
      }
      return levels;
    },
  },
  mounted() {
    this.step();
  },
  beforeUnmount() {
    clearTimeout(this.timerId);
  },
  methods: {
    // 1 つ分解して次のタイマーを予約する
    step() {
      this.addNumber(this.currentNumber);
      this.currentNumber++;
      this.schedule();
    },
    schedule() {
      clearTimeout(this.timerId);
      if (this.paused) return;
      this.timerId = setTimeout(() => this.step(), this.interval);
    },
    addNumber(n) {
      const factors = factorize(n);
      const omega = factors.reduce((sum, f) => sum + f.e, 0);
      const isPrime = omega === 1;

      this.count++;
      if (isPrime) this.primeCount++;
      // 同じ値なら先に出た（小さい）数を記録として残す
      if (!this.maxOmegaRecord || omega > this.maxOmegaRecord.value) {
        this.maxOmegaRecord = { n, value: omega };
      }
      if (!this.maxDistinctRecord || factors.length > this.maxDistinctRecord.value) {
        this.maxDistinctRecord = { n, value: factors.length };
      }

      // 新しいものを先頭に追加し、上限を超えた古いものは捨てる
      this.tiles.unshift({ n, factors, omega, isPrime });
      if (this.tiles.length > MAX_TILES) this.tiles.length = MAX_TILES;
    },
    omegaLevel(omega) {
      return Math.min(omega, MAX_OMEGA_LEVEL);
    },
    tileTitle(tile) {
      if (tile.isPrime) return `${tile.n} は素数`;
      return `Ω(${tile.n}) = ${tile.omega}、素因数 ${tile.factors.length} 種類`;
    },
    togglePause() {
      this.paused = !this.paused;
      this.schedule();
    },
    setSpeed(value) {
      this.speed = value;
      this.saveSettings();
      // 速度変更はすぐに反映する
      this.schedule();
    },
    reset() {
      this.currentNumber = 2;
      this.tiles = [];
      this.count = 0;
      this.primeCount = 0;
      this.maxOmegaRecord = null;
      this.maxDistinctRecord = null;
      if (this.paused) {
        clearTimeout(this.timerId);
      } else {
        this.step();
      }
    },
    saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed: this.speed }));
      } catch (e) {
        // 保存できなくても表示には影響しない
      }
    },
  },
};
</script>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}

.control-button {
  padding: 0.25rem 1rem;
  border: 1px solid var(--tb-main);
  border-radius: 0.375rem;
  color: var(--tb-main);
  font-size: 0.875rem;
  min-width: 6rem;
}

.control-button:hover {
  background-color: var(--tb-main);
  color: #fff;
}

.speed-picker {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.speed-option {
  padding: 0.25rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  font-size: 0.875rem;
}

.speed-option:hover {
  border-color: var(--tb-main);
}

.speed-option.active {
  background-color: var(--tb-main);
  border-color: var(--tb-main);
  color: #fff;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0 0 1rem;
}

@media (min-width: 640px) {
  .stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.stat {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.stat dt {
  color: #6b7280;
  font-size: 0.75rem;
}

.stat dd {
  margin: 0;
  font-size: 1.25rem;
  font-weight: bold;
}

.stat-sub {
  font-size: 0.75rem;
  font-weight: normal;
  color: #6b7280;
  margin-left: 0.25rem;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
  font-size: 0.75rem;
  color: #4b5563;
  margin-bottom: 1rem;
}

/* 合成数の凡例はまとめて折り返す */
.legend-group {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.legend-swatch {
  display: inline-block;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 0.2rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.factor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 0.75rem;
}

.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 96px;
  padding: 0.5rem 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: #1f2937;
  text-align: center;
  animation: tile-in 0.4s ease-out;
}

.tile-number {
  font-size: 1.25rem;
  font-weight: bold;
  line-height: 1.2;
}

.tile-factors {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  line-height: 1.4;
  word-break: break-word;
}

.times {
  margin: 0 0.2em;
  opacity: 0.6;
}

.factor sup {
  font-size: 0.65em;
}

/* 素数: 目立つ色 + バッジ */
.tile-prime {
  background-color: #fdecea;
  border: 2px solid var(--tb-main);
  color: var(--tb-main-hover);
}

.prime-badge {
  position: absolute;
  top: 0.3rem;
  right: 0.3rem;
  padding: 0 0.35rem;
  border-radius: 9999px;
  background-color: var(--tb-main);
  color: #fff;
  font-size: 0.65rem;
  line-height: 1.4;
}

/* 合成数: Ω(n) が多いほど濃い青灰色 */
.omega-2 { background-color: #f1f4f8; }
.omega-3 { background-color: #dfe7f0; }
.omega-4 { background-color: #c9d6e6; }
.omega-5 { background-color: #b0c3db; }
.omega-6 { background-color: #94acce; }
.omega-7 { background-color: #7895bf; }

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

@keyframes tile-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile {
    animation: none;
  }
}
</style>
