<template>
  <div class="dev-tool cat-number ulam">
    <p class="lead">
      1 を中心に整数を反時計回りの渦巻き状に並べ、素数のマスだけを塗っていきます。数が増えるにつれて、素数が斜めの線の上に並びやすいことが浮かび上がってきます。
    </p>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">現在の数</div>
        <div class="stat-value font-mono">{{ current.toLocaleString() }}</div>
      </div>
      <div class="stat">
        <div class="stat-label">ここまでの素数</div>
        <div class="stat-value font-mono">{{ primeCount.toLocaleString() }}</div>
      </div>
      <div class="stat">
        <div class="stat-label">進捗</div>
        <div class="stat-value font-mono">{{ progressLabel }}</div>
      </div>
    </div>

    <div class="controls">
      <button type="button" class="action-button" @click="togglePause">
        {{ finished ? 'もう一度' : (paused ? '再開' : '一時停止') }}
      </button>
      <button type="button" class="action-button secondary" @click="reset">リセット</button>
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
      <label class="inline-flex items-center gap-2">
        一辺
        <select v-model.number="size" class="border rounded-md p-1" aria-label="グリッドサイズ">
          <option v-for="s in sizeOptions" :key="s" :value="s">{{ s }}マス</option>
        </select>
      </label>
    </div>

    <div ref="wrap" class="canvas-wrap">
      <canvas ref="canvas" class="spiral-canvas" role="img" :aria-label="ariaLabel"></canvas>
    </div>

    <p class="hint mt-2">
      濃いマスが素数、薄いマスは素数でない数です。赤い印は直近に置いた数の位置を示します。
    </p>
  </div>
</template>

<script>
const STORAGE_KEY = 'toolbox.ulamSpiral.settings';
const SIZE_OPTIONS = [51, 101, 201, 301];
// 1 秒あたりに進める数
const SPEED_OPTIONS = [
  { value: 'slow', label: 'ゆっくり', perSec: 20 },
  { value: 'normal', label: '普通', perSec: 300 },
  { value: 'fast', label: '速い', perSec: 3000 },
  { value: 'turbo', label: '超高速', perSec: 30000 },
];

// マスの色 (RGBA)
const COLOR_EMPTY = [255, 255, 255, 255];
const COLOR_VISITED = [233, 237, 243, 255];
const COLOR_PRIME = [31, 41, 55, 255];
const COLOR_ONE = [192, 57, 43, 255];
const COLOR_HIGHLIGHT = '#c0392b';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

// エラトステネスの篩: isComposite[n] が 0 なら n は素数 (n >= 2)
function sieve(max) {
  const isComposite = new Uint8Array(max + 1);
  isComposite[0] = 1;
  if (max >= 1) isComposite[1] = 1;
  for (let i = 2; i * i <= max; i++) {
    if (isComposite[i]) continue;
    for (let j = i * i; j <= max; j += i) isComposite[j] = 1;
  }
  return isComposite;
}

// 一辺 size (奇数) の正方形に 1..size² を反時計回りの螺旋で並べたときの座標
// 戻り値: xs[n], ys[n] (n = 1..size²)。画面座標なので y は下向きが正。
// 1 を中心に 右 → 上 → 左 → 下 の順で、歩数を 1,1,2,2,3,3,... と増やしていく。
function spiralCoords(size) {
  const total = size * size;
  const xs = new Int16Array(total + 1);
  const ys = new Int16Array(total + 1);
  const dirs = [[1, 0], [0, -1], [-1, 0], [0, 1]];
  let x = (size - 1) / 2;
  let y = (size - 1) / 2;
  let n = 1;
  let dir = 0;
  let stepLen = 1;
  xs[1] = x;
  ys[1] = y;
  while (n < total) {
    for (let turn = 0; turn < 2 && n < total; turn++) {
      const [dx, dy] = dirs[dir];
      for (let s = 0; s < stepLen && n < total; s++) {
        x += dx;
        y += dy;
        n++;
        xs[n] = x;
        ys[n] = y;
      }
      dir = (dir + 1) % 4;
    }
    stepLen++;
  }
  return { xs, ys };
}

export default {
  name: 'UlamSpiral',
  data() {
    const saved = loadSettings();
    return {
      sizeOptions: SIZE_OPTIONS,
      speedOptions: SPEED_OPTIONS,
      size: SIZE_OPTIONS.includes(saved.size) ? saved.size : 201,
      speed: SPEED_OPTIONS.some((opt) => opt.value === saved.speed) ? saved.speed : 'normal',
      // 最後に置いた数 (0 はまだ何も置いていない状態)
      current: 0,
      primeCount: 0,
      paused: false,
    };
  },
  computed: {
    total() {
      return this.size * this.size;
    },
    finished() {
      return this.current >= this.total;
    },
    progressLabel() {
      return `${Math.floor((this.current / this.total) * 100)}%`;
    },
    perSec() {
      return SPEED_OPTIONS.find((opt) => opt.value === this.speed).perSec;
    },
    ariaLabel() {
      return `ウラムの螺旋: ${this.current} まで配置、素数 ${this.primeCount} 個`;
    },
  },
  watch: {
    size() {
      this.saveSettings();
      this.reset();
    },
    speed: 'saveSettings',
  },
  created() {
    // 大きな配列やキャンバスはリアクティブにしない
    this.coords = null;
    this.composite = null;
    this.pixels = null;
    this.offscreen = null;
    this.offCtx = null;
    this.rafId = null;
    this.lastTime = 0;
    this.carry = 0;
    this.resizeObserver = null;
  },
  mounted() {
    this.reset();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.$refs.wrap);
    } else {
      window.addEventListener('resize', this.resizeCanvas);
    }
    this.resizeCanvas();
    this.rafId = requestAnimationFrame(this.tick);
  },
  beforeUnmount() {
    cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', this.resizeCanvas);
    }
  },
  methods: {
    saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ size: this.size, speed: this.speed }));
      } catch (e) {
        // 保存できなくても表示には影響しない
      }
    },
    // 盤面を作り直して 1 から始める
    reset() {
      const size = this.size;
      this.coords = spiralCoords(size);
      this.composite = sieve(size * size);
      // マス 1 つ = 1 ピクセルの画像を作り、表示時に拡大する
      this.offscreen = document.createElement('canvas');
      this.offscreen.width = size;
      this.offscreen.height = size;
      this.offCtx = this.offscreen.getContext('2d');
      this.pixels = this.offCtx.createImageData(size, size);
      const data = this.pixels.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = COLOR_EMPTY[0];
        data[i + 1] = COLOR_EMPTY[1];
        data[i + 2] = COLOR_EMPTY[2];
        data[i + 3] = COLOR_EMPTY[3];
      }
      this.current = 0;
      this.primeCount = 0;
      this.carry = 0;
      this.paused = false;
      this.advance(1);
      this.draw();
    },
    togglePause() {
      if (this.finished) {
        this.reset();
        return;
      }
      this.paused = !this.paused;
    },
    tick(now) {
      // タブ復帰時などに一気に進みすぎないよう経過時間を制限する
      const dt = this.lastTime ? Math.min(now - this.lastTime, 100) : 16;
      this.lastTime = now;
      if (!this.paused && !this.finished) {
        this.carry += (this.perSec * dt) / 1000;
        const steps = Math.floor(this.carry);
        if (steps > 0) {
          this.carry -= steps;
          this.advance(steps);
          this.draw();
        }
      }
      this.rafId = requestAnimationFrame(this.tick);
    },
    // 数を steps 個進め、画像に書き込む
    advance(steps) {
      const { xs, ys } = this.coords;
      const data = this.pixels.data;
      const size = this.size;
      const end = Math.min(this.current + steps, this.total);
      let primes = this.primeCount;
      for (let n = this.current + 1; n <= end; n++) {
        let color = COLOR_VISITED;
        if (n === 1) {
          color = COLOR_ONE;
        } else if (!this.composite[n]) {
          color = COLOR_PRIME;
          primes++;
        }
        const i = (ys[n] * size + xs[n]) * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = color[3];
      }
      this.current = end;
      this.primeCount = primes;
      this.offCtx.putImageData(this.pixels, 0, 0);
    },
    // キャンバスの大きさをコンテナ幅と devicePixelRatio に合わせる
    resizeCanvas() {
      const canvas = this.$refs.canvas;
      const wrap = this.$refs.wrap;
      if (!canvas || !wrap) return;
      const cssSize = Math.max(1, Math.floor(wrap.clientWidth));
      const dpr = window.devicePixelRatio || 1;
      const px = Math.round(cssSize * dpr);
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      this.draw();
    },
    draw() {
      const canvas = this.$refs.canvas;
      if (!canvas || !this.offscreen) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, w);
      ctx.drawImage(this.offscreen, 0, 0, w, w);

      // 直近の数の位置に小さな印を付ける
      if (this.current >= 1 && !this.finished) {
        const cell = w / this.size;
        const { xs, ys } = this.coords;
        const cx = (xs[this.current] + 0.5) * cell;
        const cy = (ys[this.current] + 0.5) * cell;
        const dpr = window.devicePixelRatio || 1;
        const r = Math.max(cell * 0.9, 4 * dpr);
        ctx.strokeStyle = COLOR_HIGHLIGHT;
        ctx.lineWidth = Math.max(1, 1.5 * dpr);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },
};
</script>

<style scoped>
.lead {
  margin-bottom: 1rem;
  line-height: 1.7;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stat {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: bold;
  overflow-wrap: anywhere;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.action-button {
  padding: 0.35rem 1rem;
  border-radius: 0.375rem;
  background-color: var(--tb-main);
  color: #fff;
  min-width: 6rem;
}

.action-button:hover {
  background-color: var(--tb-main-hover);
}

.action-button.secondary {
  background-color: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
  min-width: 0;
}

.action-button.secondary:hover {
  border-color: var(--tb-main);
}

.pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
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

.canvas-wrap {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.spiral-canvas {
  display: block;
  outline: 1px solid #e5e7eb;
  /* マスをくっきり拡大する */
  image-rendering: pixelated;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
}
</style>
