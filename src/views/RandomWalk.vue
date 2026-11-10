<template>
  <div class="dev-tool cat-number">
    <div class="mode-picker" role="radiogroup" aria-label="モード">
      <button
        v-for="opt in modeOptions"
        :key="opt.value"
        type="button"
        role="radio"
        class="mode-option"
        :class="{ active: mode === opt.value }"
        :aria-checked="mode === opt.value"
        @click="mode = opt.value"
      >{{ opt.label }}</button>
    </div>

    <div class="layout mt-4">
      <div class="board-col">
        <div ref="boardWrap" class="board-wrap">
          <canvas ref="board" class="board" role="img" :aria-label="boardLabel"></canvas>
        </div>
        <p class="hint mt-2">{{ boardHint }}</p>
      </div>

      <div class="panel">
        <table class="stats">
          <tbody>
            <tr>
              <th>ステップ数</th>
              <td class="font-mono">{{ formatInt(steps) }}</td>
            </tr>
            <tr>
              <th><span class="swatch swatch-msd"></span>平均二乗変位</th>
              <td class="font-mono">{{ formatFixed(msd, 1) }}</td>
            </tr>
            <tr>
              <th><span class="swatch swatch-theory"></span>理論値（= ステップ数）</th>
              <td class="font-mono">{{ formatInt(steps) }}</td>
            </tr>
            <tr>
              <th>比（実測 / 理論）</th>
              <td class="font-mono">{{ steps > 0 ? formatFixed(msd / steps, 3) : '—' }}</td>
            </tr>
            <tr>
              <th>{{ mode === 'continuous' ? '原点付近に戻った回数' : '原点に戻った回数' }}</th>
              <td class="font-mono">{{ formatInt(returns) }}</td>
            </tr>
            <tr>
              <th>1 粒子あたり（期待値）</th>
              <td class="font-mono">
                {{ formatFixed(returns / count, 2) }}<span class="expected">（{{ expectedText }}）</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="controls">
          <button type="button" class="ctrl-button primary" :disabled="capReached" @click="toggleRunning">
            {{ running ? '一時停止' : '再開' }}
          </button>
          <button type="button" class="ctrl-button" @click="reset">リセット</button>
        </div>
        <div class="picker" role="radiogroup" aria-label="速度（1フレームあたりの歩数）">
          <span class="picker-label">速度</span>
          <button
            v-for="opt in speedOptions"
            :key="opt"
            type="button"
            role="radio"
            class="pill-option"
            :class="{ active: speed === opt }"
            :aria-checked="speed === opt"
            @click="speed = opt"
          >{{ opt }}歩</button>
        </div>
        <p class="hint mt-1">1フレームあたりに進む歩数</p>
        <div class="picker mt-3" role="radiogroup" aria-label="粒子数">
          <span class="picker-label">粒子数</span>
          <button
            v-for="opt in countOptions"
            :key="opt"
            type="button"
            role="radio"
            class="pill-option"
            :class="{ active: count === opt }"
            :aria-checked="count === opt"
            @click="count = opt"
          >{{ opt }}</button>
        </div>
        <p class="hint mt-1">モードや粒子数を変えると最初からやり直します</p>
        <p v-if="capReached" class="notice mt-3">
          上限の {{ formatInt(maxSteps) }} ステップに達したので停止しました。「リセット」でやり直せます。
        </p>
      </div>
    </div>

    <section class="mt-8">
      <h2 class="section-title">平均二乗変位の推移</h2>
      <div ref="chartWrap" class="chart-wrap">
        <canvas ref="chart" class="chart" role="img" aria-label="ステップ数に対する平均二乗変位の実測値と理論値の折れ線グラフ"></canvas>
      </div>
      <p class="hint mt-2">
        青い線が全粒子の平均二乗変位（原点からの距離の 2 乗の平均）、赤い破線が理論値（MSD = ステップ数）です。
        粒子が少ないとばらつきますが、粒子を増やすと直線に沿うようになります。
      </p>
    </section>

    <section v-show="mode === 'line'" class="mt-8">
      <h2 class="section-title">位置の分布</h2>
      <div ref="histWrap" class="chart-wrap">
        <canvas ref="hist" class="chart" role="img" aria-label="粒子の位置のヒストグラムと正規分布の曲線"></canvas>
      </div>
      <p class="hint mt-2">
        棒が今の粒子の位置の分布、赤い曲線が平均 0・分散 = ステップ数の正規分布です。
        粒子数を 100 にすると、時間がたつにつれてベル型に近づいていく様子が分かりやすくなります。
      </p>
    </section>

    <section class="mt-8">
      <h2 class="section-title">しくみ</h2>
      <p class="explain">
        各粒子は 1 歩ごとに独立にランダムな向きへ長さ 1 だけ進みます。向きに偏りがないので平均の位置は原点のままですが、
        各歩の変位の 2 乗の平均が 1 で、異なる歩どうしは打ち消し合うため、N 歩後の平均二乗変位はちょうど N になります。
        つまり原点からの典型的な距離は √N で、歩数を 100 倍にしても 10 倍しか広がりません。
      </p>
      <p class="explain mt-3">
        1 次元と 2 次元の格子ウォークは「再帰的」で、いつか必ず原点に戻ってきます（3 次元以上ではそうなりません）。
        ただし戻ってくる回数の期待値は 1 次元で √N に比例、2 次元では log N に比例する程度にしか増えません。
        連続方向モードでは原点にぴったり戻ることはないので、原点から半径 0.5 以内に入った回数を数えています。
      </p>
    </section>
  </div>
</template>

<script>
import {
  MODES,
  createWalkers,
  stepAll,
  meanSquaredDisplacement,
  totalReturns,
  maxExtent,
  createReturnTheory,
  expectedReturns,
  createHistory,
  recordHistory,
  lineHistogram,
  gaussianDensity,
} from '@/utilities/randomWalk.js';

const STORAGE_KEY = 'toolbox.randomWalk.settings';
const MODE_OPTIONS = [
  { value: 'lattice', label: '格子ウォーク' },
  { value: 'continuous', label: '連続方向' },
  { value: 'line', label: '1 次元ウォーク' },
];
const SPEED_OPTIONS = [1, 5, 20, 100];
const COUNT_OPTIONS = [1, 5, 20, 50, 100];
// ステップ数の上限（到達したら停止する）
const MAX_STEPS = 1000000;
// 軌跡を蓄積しておくオフスクリーンキャンバスの解像度（px）
const OFFSCREEN_SIZE = 1000;
// 表示範囲の初期値（2 次元は ±INITIAL_RANGE、1 次元は時間 0〜INITIAL_TIME）
const INITIAL_RANGE = 10;
const INITIAL_TIME = 100;
// 粒子がこの割合を超えて端に近づいたら表示範囲を広げる
const EDGE_RATIO = 0.92;
const COLOR_MSD = '#2563eb';
const COLOR_THEORY = '#dc2626';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

// 粒子ごとの色（黄金角ずつ色相をずらして隣どうしが似ないように）
function particleHue(i) {
  return (i * 137.508 + 210) % 360;
}

// 表示範囲を 1.4 倍以上のきりのよい値（1, 1.5, 2, 3, 5, 7 × 10^k）に広げる
function widerRange(r) {
  const target = r * 1.4;
  const p = 10 ** Math.floor(Math.log10(target));
  const m = [1, 1.5, 2, 3, 5, 7, 10].find((c) => c * p >= target - 1e-9);
  return m * p;
}

// 0〜max を 5 つ前後に区切る、きりのよい目盛間隔
function niceStep(max, ticks = 5) {
  const raw = max / ticks;
  const p = 10 ** Math.floor(Math.log10(raw));
  const r = raw / p;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * p;
}

// 目盛ラベル（大きな数は「万」で短く）
function tickLabel(v) {
  if (v >= 10000 && v % 10000 === 0) return `${v / 10000}万`;
  return v.toLocaleString('ja-JP');
}

export default {
  name: 'RandomWalk',
  data() {
    const saved = loadSettings();
    return {
      modeOptions: MODE_OPTIONS,
      speedOptions: SPEED_OPTIONS,
      countOptions: COUNT_OPTIONS,
      mode: MODES.includes(saved.mode) ? saved.mode : 'lattice',
      speed: SPEED_OPTIONS.includes(saved.speed) ? saved.speed : 5,
      count: COUNT_OPTIONS.includes(saved.count) ? saved.count : 20,
      maxSteps: MAX_STEPS,
      running: true,
      capReached: false,
      steps: 0,
      msd: 0,
      returns: 0,
      expected: 0,
    };
  },
  computed: {
    expectedText() {
      return this.mode === 'continuous' ? '—' : this.formatFixed(this.expected, 2);
    },
    boardLabel() {
      return this.mode === 'line'
        ? '横軸を時間、縦軸を位置にとった 1 次元ランダムウォークの軌跡'
        : '原点から広がっていく粒子の 2 次元ランダムウォークの軌跡';
    },
    boardHint() {
      return this.mode === 'line'
        ? '横軸は時間（ステップ）、縦軸は位置。黒い破線は ±√ステップ数 です。'
        : '中心が原点。黒い破線の円は半径 √ステップ数（理論上の典型的な距離）です。粒子が端に近づくと表示範囲を自動で広げます。';
    },
  },
  watch: {
    speed: 'saveSettings',
    mode() {
      this.saveSettings();
      this.reset();
    },
    count() {
      this.saveSettings();
      this.reset();
    },
  },
  created() {
    // 大きなデータや描画用オブジェクトはリアクティブにしない
    this.rafId = null;
    this.resizeRafId = null;
    this.resizeObserver = null;
    this.offscreen = null;
    this.offCtx = null;
    this.tmpCanvas = null;
    this.buffer = null;
    this.initSimulation();
  },
  mounted() {
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = OFFSCREEN_SIZE;
    this.offscreen.height = OFFSCREEN_SIZE;
    this.offCtx = this.offscreen.getContext('2d');
    this.tmpCanvas = document.createElement('canvas');
    this.tmpCanvas.width = OFFSCREEN_SIZE;
    this.tmpCanvas.height = OFFSCREEN_SIZE;
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
      this.resizeObserver.observe(this.$refs.histWrap);
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
    formatFixed(v, digits) {
      return v.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    },
    saveSettings() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ mode: this.mode, speed: this.speed, count: this.count })
        );
      } catch (e) {
        // 保存できなくても動作には影響しない
      }
    },
    // 粒子・履歴・表示範囲を初期状態にする
    initSimulation() {
      this.walkers = createWalkers(this.count);
      this.history = createHistory();
      this.history.points.push({ steps: 0, msd: 0 });
      this.theory = createReturnTheory();
      this.view = this.mode === 'line'
        ? { x0: 0, x1: INITIAL_TIME, y0: -INITIAL_RANGE, y1: INITIAL_RANGE }
        : { x0: -INITIAL_RANGE, x1: INITIAL_RANGE, y0: -INITIAL_RANGE, y1: INITIAL_RANGE };
      this.trailColors = [];
      this.dotColors = [];
      for (let i = 0; i < this.count; i++) {
        const h = particleHue(i);
        this.trailColors.push(`hsla(${h}, 75%, 42%, 0.35)`);
        this.dotColors.push(`hsl(${h}, 80%, 40%)`);
      }
      this.steps = 0;
      this.msd = 0;
      this.returns = 0;
      this.expected = 0;
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
      this.capReached = false;
      this.initSimulation();
      this.clearOffscreen();
      this.drawAll();
      this.start();
    },
    tick() {
      this.rafId = null;
      this.advance(Math.min(this.speed, MAX_STEPS - this.walkers.steps));
      this.drawAll();
      if (this.walkers.steps >= MAX_STEPS) {
        this.capReached = true;
        this.stop();
        return;
      }
      if (this.running) this.rafId = requestAnimationFrame(this.tick);
    },
    // n 歩進め、軌跡をオフスクリーンに追記して統計を更新する
    advance(n) {
      if (n <= 0) return;
      const st = this.walkers;
      const c = st.count;
      const line = this.mode === 'line';
      const stride = (n + 1) * 2;
      // 粒子ごとに「移動前 + n 歩分」の座標を並べる（1 次元は (時間, 位置)）
      if (!this.buffer || this.buffer.length < c * stride) this.buffer = new Float64Array(c * stride);
      const buf = this.buffer;
      for (let i = 0; i < c; i++) {
        buf[i * stride] = line ? st.steps : st.x[i];
        buf[i * stride + 1] = line ? st.x[i] : st.y[i];
      }
      let offset = 0;
      let t = 0;
      const onMove = line
        ? (i, x) => {
          buf[i * stride + offset] = t;
          buf[i * stride + offset + 1] = x;
        }
        : (i, x, y) => {
          buf[i * stride + offset] = x;
          buf[i * stride + offset + 1] = y;
        };
      const history = this.history;
      for (let s = 1; s <= n; s++) {
        offset = s * 2;
        t = st.steps + 1;
        stepAll(st, this.mode, Math.random, onMove);
        if (st.steps % history.interval === 0) {
          recordHistory(history, st.steps, meanSquaredDisplacement(st));
        }
      }

      this.expandView();
      this.drawTrails(buf, c, n, stride);

      this.steps = st.steps;
      this.msd = meanSquaredDisplacement(st);
      this.returns = totalReturns(st);
      this.expected = expectedReturns(this.theory, this.mode, st.steps) || 0;
    },
    // 粒子が端に近づいたら表示範囲を広げ（時間軸は 2 倍）、これまでの軌跡を縮小して描き直す
    expandView() {
      const v = this.view;
      const next = { ...v };
      const ext = maxExtent(this.walkers);
      while (ext > EDGE_RATIO * next.y1) {
        next.y1 = widerRange(next.y1);
        next.y0 = -next.y1;
        if (this.mode !== 'line') {
          next.x1 = next.y1;
          next.x0 = -next.y1;
        }
      }
      if (this.mode === 'line') {
        while (this.walkers.steps > next.x1) next.x1 *= 2;
      }
      if (next.x0 === v.x0 && next.x1 === v.x1 && next.y0 === v.y0 && next.y1 === v.y1) return;

      const size = OFFSCREEN_SIZE;
      const tctx = this.tmpCanvas.getContext('2d');
      tctx.clearRect(0, 0, size, size);
      tctx.drawImage(this.offscreen, 0, 0);
      const nw = next.x1 - next.x0;
      const nh = next.y1 - next.y0;
      const dx = ((v.x0 - next.x0) / nw) * size;
      const dy = ((next.y1 - v.y1) / nh) * size;
      const dw = ((v.x1 - v.x0) / nw) * size;
      const dh = ((v.y1 - v.y0) / nh) * size;
      this.clearOffscreen();
      this.offCtx.imageSmoothingEnabled = true;
      this.offCtx.drawImage(this.tmpCanvas, dx, dy, dw, dh);
      this.view = next;
    },
    drawTrails(buf, c, n, stride) {
      const ctx = this.offCtx;
      const v = this.view;
      const sx = OFFSCREEN_SIZE / (v.x1 - v.x0);
      const sy = OFFSCREEN_SIZE / (v.y1 - v.y0);
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let i = 0; i < c; i++) {
        const base = i * stride;
        ctx.strokeStyle = this.trailColors[i];
        ctx.beginPath();
        ctx.moveTo((buf[base] - v.x0) * sx, (v.y1 - buf[base + 1]) * sy);
        for (let s = 1; s <= n; s++) {
          const k = base + s * 2;
          ctx.lineTo((buf[k] - v.x0) * sx, (v.y1 - buf[k + 1]) * sy);
        }
        ctx.stroke();
      }
    },
    clearOffscreen() {
      if (!this.offCtx) return;
      this.offCtx.fillStyle = '#ffffff';
      this.offCtx.fillRect(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE);
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
      const { boardWrap, chartWrap, histWrap } = this.$refs;
      if (!boardWrap || !chartWrap || !histWrap) return;
      const bw = Math.floor(boardWrap.clientWidth);
      if (bw > 0 && bw !== this.boardSize) {
        this.boardSize = bw;
        this.boardCtx = this.setupCanvas(this.$refs.board, bw, bw);
      }
      const cw = Math.floor(chartWrap.clientWidth);
      const ch = cw < 480 ? 200 : 260;
      if (cw > 0 && (cw !== this.chartWidth || ch !== this.chartHeight)) {
        this.chartWidth = cw;
        this.chartHeight = ch;
        this.chartCtx = this.setupCanvas(this.$refs.chart, cw, ch);
      }
      // 1 次元モード以外では非表示（幅 0）なので、表示されたときに合わせ直す
      const hw = Math.floor(histWrap.clientWidth);
      const hh = hw < 480 ? 200 : 240;
      if (hw > 0 && (hw !== this.histWidth || hh !== this.histHeight)) {
        this.histWidth = hw;
        this.histHeight = hh;
        this.histCtx = this.setupCanvas(this.$refs.hist, hw, hh);
      }
      this.drawAll();
    },
    drawAll() {
      this.drawBoard();
      this.drawChart();
      if (this.mode === 'line') this.drawHistogram();
    },
    drawBoard() {
      const ctx = this.boardCtx;
      const s = this.boardSize;
      if (!ctx || !s || !this.offscreen) return;
      const v = this.view;
      const line = this.mode === 'line';
      const xOf = (x) => ((x - v.x0) / (v.x1 - v.x0)) * s;
      const yOf = (y) => ((v.y1 - y) / (v.y1 - v.y0)) * s;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.offscreen, 0, 0, s, s);

      // 原点を通る軸
      ctx.strokeStyle = 'rgba(107, 114, 128, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(yOf(0)) + 0.5);
      ctx.lineTo(s, Math.round(yOf(0)) + 0.5);
      if (!line) {
        ctx.moveTo(Math.round(xOf(0)) + 0.5, 0);
        ctx.lineTo(Math.round(xOf(0)) + 0.5, s);
      }
      ctx.stroke();

      const st = this.walkers;
      // 今の粒子の位置
      const r = st.count <= 20 ? 4 : st.count <= 50 ? 3 : 2.5;
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      for (let i = 0; i < st.count; i++) {
        const px = line ? xOf(st.steps) : xOf(st.x[i]);
        const py = line ? yOf(st.x[i]) : yOf(st.y[i]);
        ctx.fillStyle = this.dotColors[i];
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 理論上の広がり（2 次元は半径 √N の円、1 次元は ±√t の曲線）
      ctx.strokeStyle = 'rgba(17, 24, 39, 0.85)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (line) {
        const tMax = Math.max(st.steps, 0);
        const seg = 60;
        for (const sign of [1, -1]) {
          for (let k = 0; k <= seg; k++) {
            const t = (tMax * k) / seg;
            const px = xOf(t);
            const py = yOf(sign * Math.sqrt(t));
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
      } else if (st.steps > 0) {
        const r = (Math.sqrt(st.steps) / (v.x1 - v.x0)) * s;
        ctx.arc(xOf(0), yOf(0), r, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 表示範囲のラベル
      const label = line
        ? `時間 0〜${tickLabel(v.x1)}・位置 ±${tickLabel(v.y1)}`
        : `表示範囲 ±${tickLabel(v.x1)}`;
      ctx.font = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(4, 4, tw + 10, 20);
      ctx.fillStyle = '#374151';
      ctx.fillText(label, 9, 8);

      // 枠
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
    },
    // 縦軸（0 始まりの線形）の目盛を描き、横軸の目盛は xLabel に任せる
    drawAxes(ctx, w, h, pad, yMax, xLabel) {
      const pw = w - pad.left - pad.right;
      const ph = h - pad.top - pad.bottom;
      ctx.clearRect(0, 0, w, h);
      ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const stepY = niceStep(yMax, ph < 180 ? 4 : 5);
      for (let val = 0; val <= yMax + 1e-9; val += stepY) {
        const y = Math.round(pad.top + ph - (val / yMax) * ph) + 0.5;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + pw, y);
        ctx.stroke();
        ctx.fillText(yLabelText(val, stepY), pad.left - 6, y);
      }
      if (xLabel) xLabel(pw, ph);
      return { pw, ph };

      function yLabelText(val, step) {
        return step < 1 ? val.toFixed(Math.ceil(-Math.log10(step))) : tickLabel(val);
      }
    },
    drawChart() {
      const ctx = this.chartCtx;
      const w = this.chartWidth;
      const h = this.chartHeight;
      if (!ctx || !w) return;
      const pad = { left: 52, right: 14, top: 10, bottom: 26 };
      const points = this.history.points;
      const st = this.walkers;
      const latest = { steps: st.steps, msd: meanSquaredDisplacement(st) };
      let peak = 0;
      for (const p of points) peak = Math.max(peak, p.msd);
      const xMax = Math.max(10, niceCeil(st.steps));
      const yMax = Math.max(10, niceCeil(Math.max(peak, latest.msd, xMax) * 1.05));

      const { pw, ph } = this.drawAxes(ctx, w, h, pad, yMax, (pw, ph) => {
        const step = niceStep(xMax, pw < 360 ? 3 : 5);
        ctx.textBaseline = 'top';
        for (let val = 0; val <= xMax + 1e-9; val += step) {
          const x = Math.round(pad.left + (val / xMax) * pw) + 0.5;
          ctx.beginPath();
          ctx.moveTo(x, pad.top);
          ctx.lineTo(x, pad.top + ph);
          ctx.stroke();
          // 右端のラベルははみ出さないよう右寄せ
          ctx.textAlign = val + step > xMax + 1e-9 ? 'right' : 'center';
          ctx.fillText(tickLabel(val), val + step > xMax + 1e-9 ? pad.left + pw : x, pad.top + ph + 6);
        }
      });
      const xOf = (n) => pad.left + (n / xMax) * pw;
      const yOf = (m) => pad.top + ph - (m / yMax) * ph;

      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.left, pad.top, pw, ph);
      ctx.clip();

      // 理論値 MSD = N
      ctx.strokeStyle = COLOR_THEORY;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(0));
      ctx.lineTo(xOf(xMax), yOf(xMax));
      ctx.stroke();
      ctx.setLineDash([]);

      // 実測値
      ctx.strokeStyle = COLOR_MSD;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(xOf(p.steps), yOf(p.msd));
        else ctx.lineTo(xOf(p.steps), yOf(p.msd));
      });
      ctx.lineTo(xOf(latest.steps), yOf(latest.msd));
      ctx.stroke();
      ctx.fillStyle = COLOR_MSD;
      ctx.beginPath();
      ctx.arc(xOf(latest.steps), yOf(latest.msd), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad.left + 0.5, pad.top + 0.5, pw - 1, ph - 1);

      function niceCeil(v) {
        if (v <= 0) return 0;
        const step = niceStep(v, 5);
        return Math.ceil(v / step) * step;
      }
    },
    drawHistogram() {
      const ctx = this.histCtx;
      const w = this.histWidth;
      const h = this.histHeight;
      if (!ctx || !w) return;
      const pad = { left: 52, right: 14, top: 10, bottom: 26 };
      const st = this.walkers;
      const { bins } = lineHistogram(st.x, st.steps);
      const xMin = bins[0].from;
      const xMax = bins[bins.length - 1].to;
      const peakGauss = gaussianDensity(0, st.steps);
      let peak = peakGauss;
      for (const b of bins) peak = Math.max(peak, b.density);
      const yMax = peak * 1.1;

      const { pw, ph } = this.drawAxes(ctx, w, h, pad, yMax, (pw, ph) => {
        // 横軸の目盛（0 を中心に左右対称）
        const step = niceStep(xMax, pw < 360 ? 2 : 3);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let val = -Math.floor(xMax / step) * step; val <= xMax; val += step) {
          const x = Math.round(pad.left + ((val - xMin) / (xMax - xMin)) * pw) + 0.5;
          ctx.fillText(val < 0 ? `−${tickLabel(-val)}` : tickLabel(val), x, pad.top + ph + 6);
        }
      });
      const xOf = (x) => pad.left + ((x - xMin) / (xMax - xMin)) * pw;
      const yOf = (d) => pad.top + ph - (d / yMax) * ph;

      // 棒
      ctx.fillStyle = 'rgba(37, 99, 235, 0.55)';
      for (const b of bins) {
        if (b.count === 0) continue;
        const x0 = xOf(b.from) + 0.5;
        const x1 = xOf(b.to) - 0.5;
        ctx.fillRect(x0, yOf(b.density), Math.max(1, x1 - x0), yOf(0) - yOf(b.density));
      }

      // 正規分布の曲線
      ctx.strokeStyle = COLOR_THEORY;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      const seg = 120;
      for (let k = 0; k <= seg; k++) {
        const x = xMin + ((xMax - xMin) * k) / seg;
        const px = xOf(x);
        const py = yOf(gaussianDensity(x, st.steps));
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

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

.board-col {
  min-width: 0;
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

.mode-picker {
  display: inline-flex;
  flex-wrap: wrap;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  overflow: hidden;
}

.mode-option {
  padding: 0.4rem 1rem;
  background: #fff;
}

.mode-option + .mode-option {
  border-left: 1px solid #d1d5db;
}

.mode-option:hover:not(.active) {
  background: #f3f4f6;
}

.mode-option.active {
  background: var(--tb-main);
  color: #fff;
}

.stats {
  width: 100%;
  max-width: 24rem;
}

.stats th {
  text-align: left;
  font-weight: normal;
  color: #4b5563;
  padding: 0.25rem 1rem 0.25rem 0;
}

.stats td {
  padding: 0.25rem 0;
  text-align: right;
  white-space: nowrap;
}

.expected {
  color: #6b7280;
  font-size: 0.8rem;
}

.swatch {
  display: inline-block;
  width: 0.9rem;
  height: 0.2rem;
  margin-right: 0.35rem;
  vertical-align: 0.2rem;
}

.swatch-msd {
  background: #2563eb;
}

.swatch-theory {
  background: repeating-linear-gradient(90deg, #dc2626 0 4px, transparent 4px 6px);
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

.picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.picker-label {
  min-width: 3.5rem;
}

.pill-option {
  padding: 0.2rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  font-size: 0.875rem;
}

.pill-option:hover {
  border-color: #2563eb;
}

.pill-option.active {
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
  .pill-option,
  .mode-option {
    transition: none;
  }
}
</style>
