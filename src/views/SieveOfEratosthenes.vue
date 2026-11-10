<template>
  <div class="dev-tool cat-number">
    <div class="controls">
      <div class="pill-group" role="radiogroup" aria-label="範囲">
        <button
          v-for="opt in limitOptions"
          :key="opt"
          type="button"
          role="radio"
          class="pill"
          :class="{ active: limit === opt }"
          :aria-checked="limit === opt"
          @click="limit = opt"
        >2〜{{ opt }}</button>
      </div>
      <div class="pill-group" role="radiogroup" aria-label="速度">
        <button
          v-for="opt in speedOptions"
          :key="opt.value"
          type="button"
          role="radio"
          class="pill"
          :class="{ active: speed === opt.value }"
          :aria-checked="speed === opt.value"
          @click="speed = opt.value"
        >{{ opt.label }}</button>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button type="button" class="action-button" @click="togglePause">{{ paused ? '再開' : '一時停止' }}</button>
        <button type="button" class="action-button" @click="reset">リセット</button>
        <label class="inline-flex items-center gap-1 text-sm">
          <input v-model="loop" type="checkbox" />
          完了後に繰り返す
        </label>
      </div>
    </div>

    <div class="status">
      <p class="status-text" aria-live="polite">{{ statusText }}</p>
      <p class="status-stats">
        <span class="stat">見つかった素数 <span class="stat-value">{{ sieve.primeCount }}</span> 個</span>
        <span class="stat-sep">/</span>
        <span class="stat">消した数 <span class="stat-value">{{ sieve.crossedCount }}</span> 個</span>
        <span class="stat-sep">/</span>
        <span class="stat">未確定 <span class="stat-value">{{ undecidedCount }}</span> 個</span>
      </p>
    </div>

    <div ref="gridWrap" class="grid-wrap">
      <div class="sieve-grid" :style="gridStyle">
        <div
          v-for="i in sieve.n"
          :key="i"
          class="cell"
          :class="cellClass(i)"
          :title="cellTitle(i)"
        ><span v-if="showNumbers">{{ i }}</span></div>
      </div>
    </div>

    <div class="legend">
      <div class="legend-item">
        <span class="swatch is-prime"></span>素数
      </div>
      <div v-for="(p, idx) in sievingPrimes" :key="p" class="legend-item" :class="{ upcoming: p > activePrime }">
        <span class="swatch" :class="'own-' + idx"></span>{{ p }} の倍数（{{ ownerCounts[p] || 0 }}）
      </div>
    </div>

    <p class="hint mt-4">
      エラトステネスの篩: 小さい素数 p から順に、p² 以上の p の倍数を消していきます。
      p² が上限を超えたら、残っている数はすべて素数です。消されたマスは「最初に消した素数」で色分けしています（=最小の素因数）。
    </p>
  </div>
</template>

<script>
const STORAGE_KEY = 'toolbox.sieveOfEratosthenes.settings';
const LIMIT_OPTIONS = [100, 400, 1000];
// delay: 1 tick の間隔(ms) / steps: 1 tick で消すマス数 / sweep: 最後の確定で 1 step に確定するマス数 / hold: 素数を選んだ直後に止まる step 数
const SPEED_OPTIONS = [
  { value: 'slow', label: 'ゆっくり', delay: 300, steps: 1, sweep: 2, hold: 4 },
  { value: 'normal', label: '普通', delay: 90, steps: 1, sweep: 4, hold: 8 },
  { value: 'fast', label: '速い', delay: 30, steps: 3, sweep: 8, hold: 8 },
];
// 完了後、次のループを始めるまでの待ち時間(ms)
const LOOP_WAIT = 4000;
// マスの中に数字を表示する最小サイズ(px)
const MIN_CELL_FOR_NUMBER = 20;

// 篩の状態を作る。marks[i]: 0 = 未確定, -1 = 素数, p > 0 = 素数 p で消された
function createSieve(n) {
  const marks = new Array(n + 1).fill(0);
  marks[2] = -1;
  return {
    n,
    marks,
    phase: 'select', // select → cross → next → (select ...) → sweep → done
    p: 2,
    m: 0, // 次に消す p の倍数
    cursor: 0, // 直前に処理したマス
    visited: [], // 現在の p で処理した倍数
    hold: 0,
    sweepPos: 0,
    primeCount: 1,
    crossedCount: 0,
  };
}

// 篩を 1 step 進める
function stepSieve(s, opts) {
  switch (s.phase) {
    case 'select':
      // 選んだ素数を少し見せてから消し始める
      if (s.hold > 0) {
        s.hold--;
        return;
      }
      s.phase = 'cross';
      s.m = s.p * s.p;
      s.visited = [];
      return;
    case 'cross': {
      const m = s.m;
      if (s.marks[m] === 0) {
        s.marks[m] = s.p;
        s.crossedCount++;
      }
      s.cursor = m;
      s.visited.push(m);
      s.m += s.p;
      if (s.m > s.n) {
        s.phase = 'next';
        s.hold = 2;
      }
      return;
    }
    case 'next': {
      if (s.hold > 0) {
        s.hold--;
        return;
      }
      // 次に残っている数を探す
      let q = s.p + 1;
      while (q <= s.n && s.marks[q] !== 0) q++;
      s.cursor = 0;
      if (q * q > s.n) {
        // √N を超えたので残りはすべて素数
        s.phase = 'sweep';
        s.sweepPos = q;
        s.p = q;
        return;
      }
      s.marks[q] = -1;
      s.primeCount++;
      s.p = q;
      s.phase = 'select';
      s.hold = opts.hold;
      s.visited = [];
      return;
    }
    case 'sweep': {
      let done = 0;
      while (s.sweepPos <= s.n && done < opts.sweep) {
        if (s.marks[s.sweepPos] === 0) {
          s.marks[s.sweepPos] = -1;
          s.primeCount++;
          done++;
        }
        s.sweepPos++;
      }
      if (s.sweepPos > s.n) s.phase = 'done';
      return;
    }
    default:
      return;
  }
}

// √n 以下の素数(篩に使う素数)
function primesUpToSqrt(n) {
  const list = [];
  for (let i = 2; i * i <= n; i++) {
    let isPrime = true;
    for (let j = 2; j * j <= i; j++) {
      if (i % j === 0) { isPrime = false; break; }
    }
    if (isPrime) list.push(i);
  }
  return list;
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export default {
  name: 'SieveOfEratosthenes',
  data() {
    const saved = loadSettings();
    const limit = LIMIT_OPTIONS.includes(saved.limit) ? saved.limit : 400;
    const sieveOpts = { hold: 0, sweep: 1 };
    return {
      limitOptions: LIMIT_OPTIONS,
      speedOptions: SPEED_OPTIONS,
      limit,
      speed: SPEED_OPTIONS.some(opt => opt.value === saved.speed) ? saved.speed : 'normal',
      loop: typeof saved.loop === 'boolean' ? saved.loop : true,
      paused: false,
      sieve: createSieve(limit),
      sieveOpts,
      timerId: null,
      loopTimerId: null,
      gridWidth: 0,
      resizeObserver: null,
    };
  },
  computed: {
    currentSpeed() {
      return SPEED_OPTIONS.find(opt => opt.value === this.speed) || SPEED_OPTIONS[1];
    },
    columns() {
      // 行の先頭がそろうよう、上限ごとに列数を固定する
      if (this.limit <= 100) return 10;
      if (this.limit <= 400) return 20;
      return 25;
    },
    gap() {
      return this.gridWidth / this.columns >= 28 ? 3 : 1;
    },
    cellSize() {
      if (!this.gridWidth) return 0;
      return (this.gridWidth - this.gap * (this.columns - 1)) / this.columns;
    },
    showNumbers() {
      return this.cellSize >= MIN_CELL_FOR_NUMBER;
    },
    gridStyle() {
      const fontSize = Math.max(9, Math.min(18, this.cellSize * 0.4));
      return {
        gridTemplateColumns: `repeat(${this.columns}, minmax(0, 1fr))`,
        gap: `${this.gap}px`,
        fontSize: `${fontSize}px`,
      };
    },
    sievingPrimes() {
      return primesUpToSqrt(this.sieve.n);
    },
    // 色分け用: 素数 → パレットの番号
    ownerIndex() {
      const map = {};
      this.sievingPrimes.forEach((p, idx) => { map[p] = idx; });
      return map;
    },
    ownerCounts() {
      const counts = {};
      const marks = this.sieve.marks;
      for (let i = 2; i < marks.length; i++) {
        if (marks[i] > 0) counts[marks[i]] = (counts[marks[i]] || 0) + 1;
      }
      return counts;
    },
    undecidedCount() {
      return Math.max(this.sieve.n - 1 - this.sieve.primeCount - this.sieve.crossedCount, 0);
    },
    // 凡例で「これから」の素数を薄くするための基準
    activePrime() {
      const s = this.sieve;
      if (s.phase === 'sweep' || s.phase === 'done') return Infinity;
      return s.p;
    },
    statusText() {
      const s = this.sieve;
      const p = s.p;
      switch (s.phase) {
        case 'select':
          return `素数 ${p} が見つかりました。${p}² = ${p * p} から ${p} の倍数を消していきます。`;
        case 'cross':
        case 'next':
          if (!s.visited.length) return `${p} の倍数を消しています`;
          return `${p} の倍数を消しています: ${this.formatVisited(s.visited)}`;
        case 'sweep':
          return `次の ${p} は ${p}² = ${p * p} > ${s.n} なので、残っている数はすべて素数です。`;
        case 'done':
          return `完了: ${s.n} 以下の素数は ${s.primeCount} 個です。${this.loop ? 'まもなく最初から繰り返します。' : ''}`;
        default:
          return '';
      }
    },
  },
  watch: {
    limit() {
      this.saveSettings();
      this.reset();
    },
    speed: 'saveSettings',
    loop(val) {
      this.saveSettings();
      if (val && this.sieve.phase === 'done') this.scheduleLoop();
      if (!val) clearTimeout(this.loopTimerId);
    },
  },
  mounted() {
    this.measure();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.measure());
      this.resizeObserver.observe(this.$refs.gridWrap);
    } else {
      window.addEventListener('resize', this.measure);
    }
    this.reset();
  },
  beforeUnmount() {
    clearTimeout(this.timerId);
    clearTimeout(this.loopTimerId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.measure);
  },
  methods: {
    measure() {
      const el = this.$refs.gridWrap;
      if (el) this.gridWidth = el.clientWidth;
    },
    start() {
      clearTimeout(this.timerId);
      if (this.paused || this.sieve.phase === 'done') return;
      this.timerId = setTimeout(this.tick, this.currentSpeed.delay);
    },
    tick() {
      const speed = this.currentSpeed;
      this.sieveOpts.hold = speed.hold;
      this.sieveOpts.sweep = speed.sweep;
      // 素数を選んだ直後の待機は 1 tick に 1 step だけ進める
      const steps = this.sieve.phase === 'cross' ? speed.steps : 1;
      for (let k = 0; k < steps && this.sieve.phase !== 'done'; k++) {
        stepSieve(this.sieve, this.sieveOpts);
      }
      if (this.sieve.phase === 'done') {
        this.timerId = null;
        if (this.loop) this.scheduleLoop();
        return;
      }
      this.timerId = setTimeout(this.tick, speed.delay);
    },
    scheduleLoop() {
      clearTimeout(this.loopTimerId);
      this.loopTimerId = setTimeout(() => {
        if (this.paused) return;
        this.reset();
      }, LOOP_WAIT);
    },
    togglePause() {
      this.paused = !this.paused;
      if (this.paused) {
        clearTimeout(this.timerId);
        clearTimeout(this.loopTimerId);
      } else if (this.sieve.phase === 'done') {
        if (this.loop) this.scheduleLoop();
      } else {
        this.start();
      }
    },
    reset() {
      clearTimeout(this.timerId);
      clearTimeout(this.loopTimerId);
      this.sieve = createSieve(this.limit);
      this.sieve.hold = this.currentSpeed.hold;
      this.start();
    },
    cellClass(i) {
      const s = this.sieve;
      if (i === 1) return 'is-one';
      const mark = s.marks[i];
      const classes = [];
      if (mark === -1) classes.push('is-prime');
      else if (mark > 0) classes.push('is-crossed', 'own-' + this.ownerIndex[mark]);
      if (i === s.p && (s.phase === 'select' || s.phase === 'cross' || s.phase === 'next')) classes.push('is-current');
      if (i === s.cursor) classes.push('is-cursor');
      return classes;
    },
    cellTitle(i) {
      if (i === 1) return '1（素数ではない）';
      const mark = this.sieve.marks[i];
      if (mark === -1) return `${i}（素数）`;
      if (mark > 0) return `${i}（${mark} の倍数）`;
      return String(i);
    },
    // 長くなる場合は「49, 56, …, 91」のように省略する
    formatVisited(list) {
      if (list.length <= 6) return list.join(', ');
      return `${list.slice(0, 2).join(', ')}, …, ${list.slice(-3).join(', ')}`;
    },
    saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ limit: this.limit, speed: this.speed, loop: this.loop }));
      } catch (e) {
        // localStorage が使えない環境では保存しない
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
  gap: 0.75rem 1.5rem;
  margin-bottom: 1rem;
}

.pill-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.pill {
  padding: 0.25rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  font-size: 0.875rem;
}

.pill:hover {
  border-color: var(--tb-main);
}

.pill.active {
  background-color: var(--tb-main);
  border-color: var(--tb-main);
  color: #fff;
}

.action-button {
  padding: 0.25rem 0.9rem;
  border: 1px solid var(--tb-main);
  border-radius: 0.375rem;
  color: var(--tb-main);
  font-size: 0.875rem;
  min-width: 5.5rem;
}

.action-button:hover {
  background-color: var(--tb-main);
  color: #fff;
}

.status {
  text-align: center;
  margin-bottom: 1rem;
}

.status-text {
  font-weight: bold;
  min-height: 3em;
  overflow-wrap: anywhere;
}

.status-stats {
  font-size: 0.875rem;
  color: #4b5563;
}

.stat {
  white-space: nowrap;
}

.stat-value {
  font-weight: bold;
  font-size: 1.1rem;
  color: #3730a3;
  font-variant-numeric: tabular-nums;
}

.stat-sep {
  margin: 0 0.4rem;
  color: #d1d5db;
}

.grid-wrap {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.sieve-grid {
  display: grid;
}

.cell {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  background: #fff;
  border: 1px solid #e5e7eb;
  color: #374151;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  transition: background-color 0.25s, color 0.25s;
}

.cell.is-one {
  background: #f3f4f6;
  color: #9ca3af;
}

.cell.is-crossed {
  border-color: transparent;
  color: rgba(17, 24, 39, 0.45);
}

.cell.is-prime {
  background: #3730a3;
  border-color: #3730a3;
  color: #fff;
  font-weight: bold;
}

/* 現在の素数 */
.cell.is-current {
  background: #f59e0b;
  border-color: #b45309;
  color: #fff;
  box-shadow: 0 0 0 2px #b45309;
  position: relative;
  z-index: 1;
  animation: current-pulse 1s ease-in-out infinite;
}

/* 今消したマス */
.cell.is-cursor {
  box-shadow: 0 0 0 2px #111827;
  color: #111827;
  position: relative;
  z-index: 1;
  animation: cursor-pop 0.3s ease-out;
}

@keyframes current-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

@keyframes cursor-pop {
  0% { transform: scale(1.35); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .cell {
    transition: none;
  }
  .cell.is-current,
  .cell.is-cursor {
    animation: none;
  }
}

/* 消した素数ごとの色 (√1000 以下の素数 11 個分) */
.own-0 { background: #fca5a5; }  /* 2 */
.own-1 { background: #fdba74; }  /* 3 */
.own-2 { background: #fde047; }  /* 5 */
.own-3 { background: #86efac; }  /* 7 */
.own-4 { background: #67e8f9; }  /* 11 */
.own-5 { background: #c4b5fd; }  /* 13 */
.own-6 { background: #f9a8d4; }  /* 17 */
.own-7 { background: #bef264; }  /* 19 */
.own-8 { background: #5eead4; }  /* 23 */
.own-9 { background: #d8b4fe; }  /* 29 */
.own-10 { background: #fcd34d; } /* 31 */

.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem 1rem;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-variant-numeric: tabular-nums;
}

.legend-item.upcoming {
  opacity: 0.4;
}

.swatch {
  display: inline-block;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 3px;
}

.swatch.is-prime {
  background: #3730a3;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}
</style>
