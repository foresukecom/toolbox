<template>
  <div class="dev-tool cat-number">
    <div class="layout">
      <div ref="boardWrap" class="board-wrap">
        <canvas ref="board" class="board" role="img" aria-label="正方形に打った点。四分円の内側は青、外側はオレンジ"></canvas>
      </div>

      <div class="panel">
        <div class="estimate-label">π ≈</div>
        <div class="estimate font-mono" aria-live="off">
          <template v-if="total > 0">
            <span class="digit-match">{{ digits.text.slice(0, digits.matched) }}</span><span class="digit-rest">{{ digits.text.slice(digits.matched) }}</span>
          </template>
          <span v-else class="digit-rest">—</span>
        </div>
        <p class="true-pi font-mono">本物の π = {{ truePiText }}…</p>

        <table class="stats">
          <tbody>
            <tr>
              <th>点の数</th>
              <td class="font-mono">{{ formatInt(total) }}</td>
            </tr>
            <tr>
              <th><span class="swatch swatch-in"></span>内側</th>
              <td class="font-mono">{{ formatInt(inside) }}</td>
            </tr>
            <tr>
              <th><span class="swatch swatch-out"></span>外側</th>
              <td class="font-mono">{{ formatInt(total - inside) }}</td>
            </tr>
            <tr>
              <th>誤差</th>
              <td class="font-mono">{{ errorText }}</td>
            </tr>
          </tbody>
        </table>

        <div class="controls">
          <button type="button" class="ctrl-button primary" :disabled="capReached" @click="toggleRunning">
            {{ running ? '一時停止' : '再開' }}
          </button>
          <button type="button" class="ctrl-button" @click="reset">リセット</button>
        </div>
        <div class="speed-picker" role="radiogroup" aria-label="速度（1フレームあたりの点の数）">
          <span class="speed-label">速度</span>
          <button
            v-for="opt in speedOptions"
            :key="opt"
            type="button"
            role="radio"
            class="speed-option"
            :class="{ active: speed === opt }"
            :aria-checked="speed === opt"
            @click="speed = opt"
          >{{ formatInt(opt) }}点</button>
        </div>
        <p class="hint mt-2">1フレームあたりに打つ点の数</p>
        <p v-if="capReached" class="notice mt-3">
          上限の {{ formatInt(maxPoints) }} 点に達したので停止しました。「リセット」でやり直せます。
        </p>
      </div>
    </div>

    <section class="mt-8">
      <div class="chart-head">
        <h2 class="section-title">推定値の推移</h2>
        <label class="inline-flex items-center gap-1 text-sm">
          <input v-model="zoom" type="checkbox" />
          縦軸を拡大（π ± 0.05）
        </label>
      </div>
      <div ref="chartWrap" class="chart-wrap">
        <canvas ref="chart" class="chart" role="img" aria-label="点の数（対数目盛）に対する推定値の折れ線グラフ"></canvas>
      </div>
      <p class="hint mt-2">
        横軸は点の数（対数目盛）。赤い破線が本物の π、灰色の帯は理論上のばらつき（±2σ、σ ≈ 1.64 / √点の数）です。
      </p>
    </section>

    <section class="mt-8">
      <h2 class="section-title">しくみ</h2>
      <p class="explain">
        1 辺 1 の正方形にランダムに点を打つと、半径 1 の四分円（面積 π/4）の内側に入る割合は約 π/4 になります。
        そこで「π ≈ 4 × 内側の点 / 全体の点」と推定できます。点を 100 倍にすると誤差はおよそ 1/10 になるので、
        1 桁ずつ合わせていくにはどんどん多くの点が必要です。
      </p>
    </section>
  </div>
</template>

<script>
import {
  throwPoints,
  estimatePi,
  compareWithPi,
  theoreticalSigma,
  createHistory,
  recordHistory,
} from '@/utilities/monteCarloPi.js';

const STORAGE_KEY = 'toolbox.monteCarloPi.settings';
const SPEED_OPTIONS = [1, 10, 100, 1000];
// 点の総数の上限（到達したら停止する）
const MAX_POINTS = 1000000;
// 点を蓄積しておくオフスクリーンキャンバスの解像度（px）
const OFFSCREEN_SIZE = 1000;
const COLOR_IN = 'rgba(37, 99, 235, 0.75)';
const COLOR_OUT = 'rgba(234, 88, 12, 0.75)';
const COLOR_PI = '#dc2626';
const COLOR_LINE = '#2563eb';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

// 横軸ラベル（10 の累乗）を日本語の単位で
function powerLabel(k) {
  return ['1', '10', '100', '1000', '1万', '10万', '100万'][k] || `1e${k}`;
}

export default {
  name: 'MonteCarloPi',
  data() {
    const saved = loadSettings();
    return {
      speedOptions: SPEED_OPTIONS,
      speed: SPEED_OPTIONS.includes(saved.speed) ? saved.speed : 10,
      zoom: saved.zoom === true,
      maxPoints: MAX_POINTS,
      running: true,
      capReached: false,
      total: 0,
      inside: 0,
    };
  },
  computed: {
    estimate() {
      return estimatePi(this.inside, this.total);
    },
    digits() {
      return compareWithPi(this.estimate, 6);
    },
    truePiText() {
      return Math.PI.toFixed(15).slice(0, 10);
    },
    errorText() {
      if (this.total === 0) return '—';
      const abs = Math.abs(this.estimate - Math.PI);
      const pct = (abs / Math.PI) * 100;
      return `${abs.toFixed(6)}（${pct.toFixed(4)}%）`;
    },
  },
  watch: {
    speed: 'saveSettings',
    zoom() {
      this.saveSettings();
      this.drawChart();
    },
  },
  created() {
    // 大きなデータや描画用オブジェクトはリアクティブにしない
    this.rafId = null;
    this.resizeRafId = null;
    this.resizeObserver = null;
    this.latest = null;
    this.offscreen = null;
    this.offCtx = null;
    this.history = createHistory();
  },
  mounted() {
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = OFFSCREEN_SIZE;
    this.offscreen.height = OFFSCREEN_SIZE;
    this.offCtx = this.offscreen.getContext('2d');
    this.clearOffscreen();

    // ResizeObserver のコールバック内でサイズを変えるとループ警告が出るので、次のフレームに回す
    this.onResize = () => {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = requestAnimationFrame(() => this.resizeCanvases());
    };
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.$refs.boardWrap);
      this.resizeObserver.observe(this.$refs.chartWrap);
    } else {
      window.addEventListener('resize', this.onResize);
    }
    this.resizeCanvases();
    this.start();
  },
  beforeUnmount() {
    cancelAnimationFrame(this.rafId);
    cancelAnimationFrame(this.resizeRafId);
    this.rafId = null;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', this.onResize);
    }
  },
  methods: {
    formatInt(n) {
      return n.toLocaleString('ja-JP');
    },
    saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed: this.speed, zoom: this.zoom }));
      } catch (e) {
        // 保存できなくても動作には影響しない
      }
    },
    start() {
      if (this.capReached) return;
      this.running = true;
      cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(this.tick);
    },
    stop() {
      this.running = false;
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    },
    toggleRunning() {
      if (this.running) this.stop();
      else this.start();
    },
    reset() {
      this.total = 0;
      this.inside = 0;
      this.capReached = false;
      this.history = createHistory();
      this.clearOffscreen();
      this.drawBoard();
      this.drawChart();
      this.start();
    },
    tick() {
      this.rafId = null;
      this.step(Math.min(this.speed, MAX_POINTS - this.total));
      this.drawBoard();
      this.drawChart();
      if (this.total >= MAX_POINTS) {
        this.capReached = true;
        this.stop();
        return;
      }
      if (this.running) this.rafId = requestAnimationFrame(this.tick);
    },
    // count 個の点を打ち、オフスクリーンに追記描画して履歴を記録する
    step(count) {
      if (count <= 0) return;
      const ctx = this.offCtx;
      const size = OFFSCREEN_SIZE;
      // 点が少ないうちは大きめの点で、多くなったら小さい点で描く
      const r = this.total < 200 ? 8 : this.total < 2000 ? 5 : this.total < 20000 ? 3 : 1.5;
      const useArc = r >= 3;
      const pathIn = new Path2D();
      const pathOut = new Path2D();
      const history = this.history;
      let n = this.total;
      let ins = this.inside;

      throwPoints(count, Math.random, (x, y, hit) => {
        n++;
        if (hit) ins++;
        // 原点を左下にとる
        const px = x * size;
        const py = (1 - y) * size;
        const path = hit ? pathIn : pathOut;
        if (useArc) {
          path.moveTo(px + r, py);
          path.arc(px, py, r, 0, Math.PI * 2);
        } else {
          path.rect(px - r, py - r, r * 2, r * 2);
        }
        if (n >= history.next) recordHistory(history, n, estimatePi(ins, n));
      });

      ctx.fillStyle = COLOR_IN;
      ctx.fill(pathIn);
      ctx.fillStyle = COLOR_OUT;
      ctx.fill(pathOut);

      this.total = n;
      this.inside = ins;
      // 最後の点は間引きに関係なく記録しておく（グラフの右端を最新に合わせる）
      this.latest = { n, estimate: estimatePi(ins, n) };
    },
    clearOffscreen() {
      if (!this.offCtx) return;
      this.offCtx.fillStyle = '#ffffff';
      this.offCtx.fillRect(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE);
      this.latest = null;
    },
    // キャンバスをコンテナ幅に合わせ、devicePixelRatio を考慮した解像度にする
    setupCanvas(canvas, width, height) {
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    },
    resizeCanvases() {
      const boardWrap = this.$refs.boardWrap;
      const chartWrap = this.$refs.chartWrap;
      if (!boardWrap || !chartWrap) return;
      const bw = Math.floor(boardWrap.clientWidth);
      const cw = Math.floor(chartWrap.clientWidth);
      if (bw > 0 && bw !== this.boardSize) {
        this.boardSize = bw;
        this.boardCtx = this.setupCanvas(this.$refs.board, bw, bw);
      }
      const ch = cw < 480 ? 200 : 260;
      if (cw > 0 && (cw !== this.chartWidth || ch !== this.chartHeight)) {
        this.chartWidth = cw;
        this.chartHeight = ch;
        this.chartCtx = this.setupCanvas(this.$refs.chart, cw, ch);
      }
      this.drawBoard();
      this.drawChart();
    },
    drawBoard() {
      const ctx = this.boardCtx;
      const s = this.boardSize;
      if (!ctx || !s) return;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.offscreen, 0, 0, s, s);
      // 四分円と正方形の枠
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#374151';
      ctx.beginPath();
      ctx.arc(0, s, s - 1, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
    },
    drawChart() {
      const ctx = this.chartCtx;
      const w = this.chartWidth;
      const h = this.chartHeight;
      if (!ctx || !w) return;
      const pad = { left: 46, right: 12, top: 10, bottom: 26 };
      const pw = w - pad.left - pad.right;
      const ph = h - pad.top - pad.bottom;
      const maxLog = Math.log10(MAX_POINTS);
      const half = this.zoom ? 0.05 : 0.6;
      const yMin = Math.PI - half;
      const yMax = Math.PI + half;
      const xOf = (n) => pad.left + (Math.log10(Math.max(n, 1)) / maxLog) * pw;
      const yOf = (v) => pad.top + ((yMax - v) / (yMax - yMin)) * ph;

      ctx.clearRect(0, 0, w, h);
      ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = '#6b7280';

      // 縦軸の目盛
      const stepY = this.zoom ? 0.02 : 0.2;
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let v = Math.ceil(yMin / stepY) * stepY; v <= yMax + 1e-9; v += stepY) {
        const y = Math.round(yOf(v)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + pw, y);
        ctx.stroke();
        ctx.fillText(v.toFixed(this.zoom ? 2 : 1), pad.left - 6, y);
      }
      // 横軸の目盛（10 の累乗）
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let k = 0; k <= maxLog; k++) {
        const x = Math.round(xOf(10 ** k)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, pad.top + ph);
        ctx.stroke();
        // 狭い画面ではラベルが詰まるので 1 つおきに
        if (pw < 360 && k % 2 === 1) continue;
        // 右端のラベルははみ出さないよう右寄せ
        ctx.textAlign = k === maxLog ? 'right' : 'center';
        ctx.fillText(powerLabel(k), k === maxLog ? pad.left + pw : x, pad.top + ph + 6);
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.left, pad.top, pw, ph);
      ctx.clip();

      // 理論上のばらつき（±2σ）の帯
      ctx.fillStyle = 'rgba(107, 114, 128, 0.12)';
      ctx.beginPath();
      const bandSteps = 80;
      for (let i = 0; i <= bandSteps; i++) {
        const n = 10 ** ((i / bandSteps) * maxLog);
        const yv = yOf(Math.PI + 2 * theoreticalSigma(n));
        if (i === 0) ctx.moveTo(xOf(n), yv);
        else ctx.lineTo(xOf(n), yv);
      }
      for (let i = bandSteps; i >= 0; i--) {
        const n = 10 ** ((i / bandSteps) * maxLog);
        ctx.lineTo(xOf(n), yOf(Math.PI - 2 * theoreticalSigma(n)));
      }
      ctx.closePath();
      ctx.fill();

      // π の水平線
      ctx.strokeStyle = COLOR_PI;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, yOf(Math.PI));
      ctx.lineTo(pad.left + pw, yOf(Math.PI));
      ctx.stroke();
      ctx.setLineDash([]);

      // 推定値の折れ線
      const points = this.history.points;
      if (points.length > 0) {
        ctx.strokeStyle = COLOR_LINE;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(xOf(p.n), yOf(p.estimate));
          else ctx.lineTo(xOf(p.n), yOf(p.estimate));
        });
        if (this.latest) ctx.lineTo(xOf(this.latest.n), yOf(this.latest.estimate));
        ctx.stroke();
        // 最新の値に点を打つ
        const last = this.latest || points[points.length - 1];
        ctx.fillStyle = COLOR_LINE;
        ctx.beginPath();
        ctx.arc(xOf(last.n), yOf(last.estimate), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // π のラベル
      ctx.fillStyle = COLOR_PI;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.font = 'bold 12px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillText('π', pad.left + pw - 12, yOf(Math.PI) - 2);

      // 枠
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad.left + 0.5, pad.top + 0.5, pw - 1, ph - 1);
    },
  },
};
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .layout {
    grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
  }
}

.board-wrap {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}

.board,
.chart {
  display: block;
}

.panel {
  min-width: 0;
}

.estimate-label {
  color: #6b7280;
  font-size: 1rem;
}

.estimate {
  font-size: 3rem;
  font-weight: bold;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.digit-match {
  color: #16a34a;
}

.digit-rest {
  color: #9ca3af;
}

.true-pi {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0.25rem 0 1rem;
}

.stats th {
  text-align: left;
  font-weight: normal;
  color: #4b5563;
  padding: 0.2rem 1rem 0.2rem 0;
  white-space: nowrap;
}

.stats td {
  padding: 0.2rem 0;
  text-align: right;
}

.swatch {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  margin-right: 0.35rem;
  vertical-align: -0.05rem;
}

.swatch-in {
  background: rgb(37, 99, 235);
}

.swatch-out {
  background: rgb(234, 88, 12);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.25rem 0 0.75rem;
}

.ctrl-button {
  padding: 0.4rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: #fff;
}

.ctrl-button:hover:not(:disabled) {
  border-color: var(--tb-main);
}

.ctrl-button.primary {
  min-width: 6.5rem;
  background: var(--tb-main);
  border-color: var(--tb-main);
  color: #fff;
}

.ctrl-button.primary:hover:not(:disabled) {
  background: var(--tb-main-hover);
  border-color: var(--tb-main-hover);
}

.ctrl-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.speed-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.speed-label {
  margin-right: 0.25rem;
}

.speed-option {
  padding: 0.2rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  font-size: 0.875rem;
}

.speed-option:hover {
  border-color: #2563eb;
}

.speed-option.active {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.notice {
  color: #92400e;
  background: #fef3c7;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.chart-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.25rem 1rem;
}

.chart-wrap {
  width: 100%;
}

.section-title {
  font-weight: bold;
  font-size: 1.15rem;
  border-left: 4px solid var(--tb-main);
  padding-left: 0.5rem;
  margin-bottom: 1rem;
}

.explain {
  line-height: 1.8;
}

@media (prefers-reduced-motion: reduce) {
  .ctrl-button,
  .speed-option {
    transition: none;
  }
}
</style>
