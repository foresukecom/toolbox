<template>
  <div class="dev-tool cat-number fib-page">
    <!-- 操作 -->
    <div class="controls">
      <div class="button-row">
        <button type="button" class="ctrl-button primary" @click="togglePlay">
          {{ playing ? '一時停止' : '再開' }}
        </button>
        <button type="button" class="ctrl-button" :disabled="playing || atEnd" @click="step">1 項進める</button>
        <button type="button" class="ctrl-button" @click="reset">リセット</button>
      </div>
      <div class="speed-picker" role="radiogroup" aria-label="速度">
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
      <label class="inline-flex items-center gap-1 text-sm">
        <input v-model="loop" type="checkbox" />
        F({{ maxTerms }}) まで来たら最初から繰り返す
      </label>
    </div>
    <p v-if="atEnd" class="end-notice">
      F({{ maxTerms }}) に到達しました。
      <template v-if="loop">まもなく最初から始めます。</template>
      <template v-else>「リセット」で最初からもう一度眺められます。</template>
    </p>

    <div class="main-grid">
      <!-- 正方形タイルと黄金螺旋 -->
      <section class="panel">
        <h2 class="section-title">フィボナッチ・タイルと黄金螺旋</h2>
        <div ref="canvasBox" class="canvas-box">
          <canvas ref="canvas" role="img" :aria-label="`一辺が F(1) から F(${n}) の正方形を並べたタイルと黄金螺旋`"></canvas>
        </div>
        <p class="hint mt-2">一辺がフィボナッチ数の正方形を渦巻き状に並べ、各正方形に四分円の弧を描くと黄金螺旋（の近似）になります。</p>
      </section>

      <div>
        <!-- 現在の項 -->
        <section class="panel mb-6">
          <h2 class="section-title">現在の項</h2>
          <div class="term-label">
            F({{ n }}) =
            <span class="digit-badge">{{ current.digits }} 桁</span>
          </div>
          <div class="term-value" :class="{ 'is-new': flash }">{{ current.str }}</div>
          <p v-if="n >= 2" class="hint mt-1 break-all">F({{ n - 1 }}) = {{ previous.str }}</p>
        </section>

        <!-- 隣り合う項の比 -->
        <section class="panel">
          <h2 class="section-title">隣り合う項の比</h2>
          <template v-if="n >= 2">
            <div class="term-label">F({{ n }}) / F({{ n - 1 }}) =</div>
            <div class="ratio-row">
              <span class="ratio-name">比</span>
              <span class="ratio-digits">
                <span
                  v-for="(ch, i) in ratioChars"
                  :key="i"
                  :class="ch.match ? 'digit-match' : 'digit-miss'"
                >{{ ch.ch }}</span>
              </span>
            </div>
            <div class="ratio-row">
              <span class="ratio-name">φ</span>
              <span class="ratio-digits phi-digits">{{ phiDisplay }}…</span>
            </div>
            <p class="mt-2">
              一致している小数部:
              <span class="match-count">{{ current.match }}</span> / {{ ratioDecimals }} 桁
              <span v-if="current.match >= ratioDecimals" class="hint">（表示桁はすべて一致）</span>
            </p>
            <p class="hint">
              φ との差 ≈ {{ errorText.mantissa }}<template v-if="errorText.exp !== null"> × 10<sup>{{ errorText.exp }}</sup></template>（φ より{{ current.above ? '大きい' : '小さい' }}）
            </p>
          </template>
          <p v-else class="hint">2 項目から比を計算します。</p>
          <p class="hint mt-2">黄金比 φ = (1 + √5) / 2。比は φ をはさんで大小を交互に繰り返しながら近づきます（表示は小数点以下 {{ ratioDecimals }} 桁で切り捨て）。</p>
        </section>
      </div>
    </div>

    <!-- 比の推移グラフ -->
    <section class="panel mt-6">
      <div class="chart-head">
        <h2 class="section-title">比の推移</h2>
        <div class="speed-picker" role="radiogroup" aria-label="グラフの種類">
          <button
            v-for="opt in chartModes"
            :key="opt.value"
            type="button"
            role="radio"
            class="pill"
            :class="{ active: chartMode === opt.value }"
            :aria-checked="chartMode === opt.value"
            @click="chartMode = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>
      <div ref="chartBox" class="chart-box">
        <svg
          :viewBox="`0 0 ${chart.width} ${chart.height}`"
          :width="chart.width"
          :height="chart.height"
          class="chart-svg"
          role="img"
          :aria-label="chartMode === 'value' ? '隣り合う項の比の推移' : 'φ との差の推移（対数）'"
        >
          <!-- 目盛り -->
          <g class="grid">
            <g v-for="t in chart.yTicks" :key="'y' + t.label">
              <line :x1="chart.left" :x2="chart.width - chart.right" :y1="t.y" :y2="t.y" />
              <text :x="chart.left - 6" :y="t.y" class="tick-label" text-anchor="end" dominant-baseline="middle">{{ t.label }}</text>
            </g>
            <g v-for="t in chart.xTicks" :key="'x' + t.label">
              <line :x1="t.x" :x2="t.x" :y1="chart.top" :y2="chart.height - chart.bottom" />
              <text :x="t.x" :y="chart.height - chart.bottom + 14" class="tick-label" text-anchor="middle">{{ t.label }}</text>
            </g>
          </g>
          <text :x="chart.width - 4" :y="chart.height - chart.bottom + 14" class="axis-label" text-anchor="end">n</text>
          <!-- φ の水平線 -->
          <g v-if="chartMode === 'value'">
            <line class="phi-line" :x1="chart.left" :x2="chart.width - chart.right" :y1="chart.phiY" :y2="chart.phiY" />
            <text class="phi-label" :x="chart.width - chart.right - 4" :y="chart.phiY - 6" text-anchor="end">φ = 1.6180339887…</text>
          </g>
          <polyline v-if="chart.points.length > 1" class="series-line" :points="chart.polyline" />
          <circle
            v-for="p in chart.points"
            :key="p.n"
            :cx="p.x"
            :cy="p.y"
            r="3"
            :class="p.above ? 'dot-above' : 'dot-below'"
          />
        </svg>
      </div>
      <p class="hint mt-1">
        <span class="legend dot-above-text">●</span> φ より大きい
        <span class="legend dot-below-text ml-3">●</span> φ より小さい
        <template v-if="chartMode === 'error'"><br>縦軸は |F(n)/F(n−1) − φ| の常用対数。ほぼ直線的に小さくなります（1 項ごとに約 1/φ² 倍）。</template>
      </p>
    </section>

    <!-- 数列 -->
    <section class="panel mt-6">
      <h2 class="section-title">フィボナッチ数列</h2>
      <div ref="sequenceBox" class="sequence-box">
        <span v-for="t in terms" :key="t.n" class="seq-item" :title="`F(${t.n})`">{{ t.str }}</span>
      </div>
      <p class="hint mt-1">F(1) = F(2) = 1、F(n) = F(n−1) + F(n−2)。値は BigInt で正確に計算しています（最大 F({{ maxTerms }})）。</p>
    </section>
  </div>
</template>

<script>
/* global BigInt */

const STORAGE_KEY = 'toolbox.fibonacciGoldenRatio.settings';
const MAX_TERMS = 100;
// 表示する比の小数点以下の桁数
const RATIO_DECIMALS = 15;
// 誤差計算に使う固定小数点の桁数（F(100) 付近の誤差 10^-42 程度まで扱える）
const PRECISION = 60;
// F(MAX_TERMS) に到達してから最初に戻るまでの待ち時間 (ms)
const LOOP_WAIT = 5000;

const SPEED_OPTIONS = [
  { value: 2000, label: 'ゆっくり' },
  { value: 1000, label: '普通' },
  { value: 300, label: '速い' },
];
const CHART_MODES = [
  { value: 'value', label: '比の値' },
  { value: 'error', label: 'φ との差（対数）' },
];
// 正方形の塗り色（白背景向けの淡い色）
const TILE_COLORS = ['#dbeafe', '#fee2e2', '#dcfce7', '#fef9c3', '#f3e8ff', '#ffedd5'];
const SPIRAL_COLOR = '#c0392b';

// 整数の平方根（切り捨て）。ニュートン法
function isqrt(value) {
  if (value < 2n) return value;
  let x = BigInt(Math.floor(Math.sqrt(Number(value))));
  for (;;) {
    const y = (x + value / x) >> 1n;
    if (y >= x && x * x <= value && (x + 1n) * (x + 1n) > value) return x;
    x = y;
  }
}

const SCALE = 10n ** BigInt(PRECISION);
// φ × 10^PRECISION（切り捨て）
const PHI_SCALED = (SCALE + isqrt(5n * SCALE * SCALE)) / 2n;

// 固定小数点値（10^digits 倍された BigInt）を "1.234…" 形式の文字列にする
function formatFixed(value, digits) {
  const unit = 10n ** BigInt(digits);
  return `${value / unit}.${(value % unit).toString().padStart(digits, '0')}`;
}

const PHI_STRING = formatFixed(PHI_SCALED / 10n ** BigInt(PRECISION - RATIO_DECIMALS), RATIO_DECIMALS);

// 正の BigInt の常用対数（近似）
function log10BigInt(value) {
  const s = value.toString();
  const head = s.slice(0, 15);
  return Math.log10(Number(head)) + (s.length - head.length);
}

// n 項目の情報を作る（value = F(n), prev = F(n-1)）
function makeTerm(n, value, prev) {
  const str = value.toString();
  const term = { n, value, str, digits: str.length, ratio: null, intMatch: false, match: 0, above: false, ratioNum: null, log10Err: null };
  if (prev) {
    const scaled = (value * SCALE) / prev;
    const ratioStr = formatFixed(scaled / 10n ** BigInt(PRECISION - RATIO_DECIMALS), RATIO_DECIMALS);
    // 整数部から順に比べ、φ と一致している小数部の桁数を数える
    let match = 0;
    term.intMatch = ratioStr.slice(0, 2) === PHI_STRING.slice(0, 2);
    if (term.intMatch) {
      for (let i = 2; i < ratioStr.length && ratioStr[i] === PHI_STRING[i]; i++) match++;
    }
    const diff = scaled >= PHI_SCALED ? scaled - PHI_SCALED : PHI_SCALED - scaled;
    term.ratio = ratioStr;
    term.match = match;
    term.above = scaled > PHI_SCALED;
    term.ratioNum = Number(ratioStr);
    term.log10Err = diff > 0n ? log10BigInt(diff) - PRECISION : -PRECISION;
  }
  return term;
}

// k 項目 (1 始まり) の正方形の配置方向: 右 → 下 → 左 → 上 の順に時計回りで外側へ足していく
const DIRECTIONS = ['right', 'down', 'left', 'up'];
// 方向ごとの四分円の中心（正方形内の角）と角度（ラジアン）
const ARC_SPECS = {
  right: { cx: 0, cy: 1, from: -Math.PI / 2, to: 0 },
  down: { cx: 0, cy: 0, from: 0, to: Math.PI / 2 },
  left: { cx: 1, cy: 0, from: Math.PI / 2, to: Math.PI },
  up: { cx: 1, cy: 1, from: Math.PI, to: Math.PI * 1.5 },
};

// 目盛りの間隔を 1, 2, 5 × 10^k から選ぶ
function niceStep(range, count) {
  const raw = range / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 5, 10].find(m => m * pow >= raw) || 10;
  return unit * pow;
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default {
  name: 'FibonacciGoldenRatio',
  data() {
    const saved = loadSettings();
    return {
      maxTerms: MAX_TERMS,
      ratioDecimals: RATIO_DECIMALS,
      phiDisplay: PHI_STRING,
      speedOptions: SPEED_OPTIONS,
      chartModes: CHART_MODES,
      speed: SPEED_OPTIONS.some(opt => opt.value === saved.speed) ? saved.speed : 1000,
      loop: typeof saved.loop === 'boolean' ? saved.loop : true,
      chartMode: CHART_MODES.some(opt => opt.value === saved.chartMode) ? saved.chartMode : 'value',
      // 初回描画用に F(1) を入れておく（mounted の reset で作り直す）
      terms: [makeTerm(1, 1n, null)],
      playing: true,
      flash: false,
      chartWidth: 600,
      timerId: null,
      loopTimerId: null,
      flashTimerId: null,
    };
  },
  computed: {
    n() {
      return this.terms.length;
    },
    current() {
      return this.terms[this.terms.length - 1];
    },
    previous() {
      return this.terms[this.terms.length - 2];
    },
    atEnd() {
      return this.n >= MAX_TERMS;
    },
    ratioChars() {
      const { ratio, intMatch, match } = this.current;
      if (!ratio) return [];
      // 整数部 "1." は一致していれば色付け、小数部は一致桁数まで色付け
      return ratio.split('').map((ch, i) => ({ ch, match: intMatch && i < 2 + match }));
    },
    errorText() {
      const e = this.current.log10Err;
      if (e === null) return { mantissa: '', exp: null };
      const exp = Math.floor(e);
      if (exp >= -2) return { mantissa: (10 ** e).toFixed(4), exp: null };
      return { mantissa: (10 ** (e - exp)).toFixed(2), exp };
    },
    chart() {
      const width = Math.max(this.chartWidth, 280);
      const height = width < 500 ? 220 : 260;
      const left = this.chartMode === 'value' ? 40 : 52;
      const right = 22;
      const top = 14;
      const bottom = 24;
      const plotW = width - left - right;
      const plotH = height - top - bottom;
      const items = this.terms.filter(t => t.ratio !== null);
      const xMin = 2;
      const xMax = Math.max(this.n, 12);
      const xOf = n => left + ((n - xMin) / (xMax - xMin)) * plotW;

      let yMin;
      let yMax;
      let yValue;
      let yTicks = [];
      if (this.chartMode === 'value') {
        yMin = 0.9;
        yMax = 2.1;
        yValue = t => t.ratioNum;
        for (let v = 1; v <= 2.0001; v += 0.2) yTicks.push({ value: v, label: v.toFixed(1) });
      } else {
        const minErr = items.reduce((m, t) => Math.min(m, t.log10Err), 0);
        yMin = Math.min(-5, Math.floor(minErr / 5) * 5);
        yMax = 0;
        yValue = t => t.log10Err;
        const stepY = niceStep(yMax - yMin, 5);
        for (let v = 0; v >= yMin; v -= stepY) yTicks.push({ value: v, label: v === 0 ? '1' : `1e${v}` });
      }
      const yOf = v => top + ((yMax - v) / (yMax - yMin)) * plotH;
      yTicks = yTicks.map(t => ({ ...t, y: yOf(t.value) }));

      const stepX = niceStep(xMax - xMin, width < 500 ? 5 : 10);
      const xTicks = [];
      for (let v = Math.ceil(xMin / stepX) * stepX; v <= xMax; v += stepX) {
        if (v >= xMin) xTicks.push({ label: String(v), x: xOf(v) });
      }

      const points = items.map(t => ({ n: t.n, x: xOf(t.n), y: yOf(yValue(t)), above: t.above }));
      return {
        width,
        height,
        left,
        right,
        top,
        bottom,
        xTicks,
        yTicks,
        points,
        polyline: points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
        phiY: yOf((1 + Math.sqrt(5)) / 2),
      };
    },
  },
  watch: {
    speed() {
      this.saveSettings();
      if (this.playing) this.schedule();
    },
    loop() {
      this.saveSettings();
      if (this.atEnd) this.handleEnd();
    },
    chartMode: 'saveSettings',
  },
  created() {
    // 描画用の状態はリアクティブにしない
    this.squares = [];
    this.bounds = null;
    this.view = null;
    this.targetView = null;
    this.rafId = null;
    this.lastFrame = 0;
    this.newSquareStart = 0;
    this.canvasSize = { w: 0, h: 0 };
    this.resizeObserver = null;
  },
  mounted() {
    this.reducedMotion = prefersReducedMotion();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.$refs.canvasBox);
    this.resizeObserver.observe(this.$refs.chartBox);
    this.handleResize();
    this.reset();
  },
  beforeUnmount() {
    clearTimeout(this.timerId);
    clearTimeout(this.loopTimerId);
    clearTimeout(this.flashTimerId);
    cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
  },
  methods: {
    saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed: this.speed, loop: this.loop, chartMode: this.chartMode }));
      } catch (e) {
        // 保存できなくても表示には影響しない
      }
    },
    // 最初から（F(1) だけの状態）
    reset() {
      clearTimeout(this.timerId);
      clearTimeout(this.loopTimerId);
      this.terms = [];
      this.squares = [];
      this.bounds = null;
      this.view = null;
      this.addTerm();
      if (this.playing) this.schedule();
    },
    togglePlay() {
      this.playing = !this.playing;
      if (this.playing) {
        if (this.atEnd) {
          this.reset();
        } else {
          this.schedule();
        }
      } else {
        clearTimeout(this.timerId);
        clearTimeout(this.loopTimerId);
      }
    },
    step() {
      if (!this.atEnd) this.addTerm();
    },
    schedule() {
      clearTimeout(this.timerId);
      if (this.atEnd) {
        this.handleEnd();
        return;
      }
      this.timerId = setTimeout(() => {
        this.addTerm();
        this.schedule();
      }, this.speed);
    },
    // 最終項に到達したとき: 繰り返し設定なら少し待って最初から
    handleEnd() {
      clearTimeout(this.loopTimerId);
      if (this.loop && this.playing) {
        this.loopTimerId = setTimeout(() => this.reset(), LOOP_WAIT);
      }
    },
    // 次の項を 1 つ追加する（1 tick あたり BigInt の加算 1 回と比の割り算程度）
    addTerm() {
      const len = this.terms.length;
      let value;
      if (len < 2) {
        value = 1n;
      } else {
        value = this.terms[len - 1].value + this.terms[len - 2].value;
      }
      const prev = len >= 1 ? this.terms[len - 1].value : null;
      this.terms.push(makeTerm(len + 1, value, prev));
      this.addSquare(len + 1, Number(value));

      this.flash = true;
      clearTimeout(this.flashTimerId);
      this.flashTimerId = setTimeout(() => { this.flash = false; }, 400);
      this.$nextTick(() => {
        const box = this.$refs.sequenceBox;
        if (box) box.scrollTop = box.scrollHeight;
      });
    },
    // k 項目の正方形を外周に追加し、外接矩形を更新する
    addSquare(k, side) {
      const dir = DIRECTIONS[(k + 2) % 4];
      let x;
      let y;
      const b = this.bounds;
      if (!b) {
        x = 0;
        y = 0;
      } else if (dir === 'right') {
        x = b.x1;
        y = b.y0;
      } else if (dir === 'down') {
        x = b.x0;
        y = b.y1;
      } else if (dir === 'left') {
        x = b.x0 - side;
        y = b.y0;
      } else {
        x = b.x0;
        y = b.y0 - side;
      }
      this.squares.push({ k, x, y, s: side, dir, label: String(this.terms[k - 1].str) });
      this.bounds = b
        ? { x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x + side), y1: Math.max(b.y1, y + side) }
        : { x0: x, y0: y, x1: x + side, y1: y + side };
      this.newSquareStart = performance.now();
      this.updateTargetView();
      this.startAnimation();
    },
    handleResize() {
      const box = this.$refs.canvasBox;
      const canvas = this.$refs.canvas;
      if (box && canvas) {
        const w = box.clientWidth;
        const h = box.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        this.canvasSize = { w, h, dpr };
        this.updateTargetView();
        if (this.view) this.view = { ...this.targetView };
        this.draw();
      }
      if (this.$refs.chartBox) this.chartWidth = this.$refs.chartBox.clientWidth;
    },
    // 外接矩形全体が収まる表示範囲（中心と拡大率の対数）
    updateTargetView() {
      const b = this.bounds;
      const { w, h } = this.canvasSize;
      if (!b || !w || !h) return;
      const pad = 12;
      const scale = Math.min((w - pad * 2) / (b.x1 - b.x0), (h - pad * 2) / (b.y1 - b.y0));
      this.targetView = { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, logScale: Math.log(scale) };
      if (!this.view) this.view = { ...this.targetView };
    },
    startAnimation() {
      if (this.rafId) return;
      this.lastFrame = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
    },
    // 表示範囲を目標に向けて滑らかに近づける。収束したら rAF を止める
    frame(now) {
      this.rafId = null;
      const dt = Math.min(now - this.lastFrame, 100);
      this.lastFrame = now;
      const v = this.view;
      const t = this.targetView;
      let moving = false;
      if (v && t) {
        if (this.reducedMotion) {
          this.view = { ...t };
        } else {
          // 速い設定でも次の項が来る前に追いつくよう、時定数を間隔に合わせて短くする
          const a = 1 - Math.exp(-dt / Math.min(180, this.speed / 5));
          const scale = Math.exp(v.logScale);
          v.cx += (t.cx - v.cx) * a;
          v.cy += (t.cy - v.cy) * a;
          v.logScale += (t.logScale - v.logScale) * a;
          // 画面上で 0.3px 未満のずれになったら収束とみなす
          const close = Math.abs(t.cx - v.cx) * scale < 0.3 && Math.abs(t.cy - v.cy) * scale < 0.3 && Math.abs(t.logScale - v.logScale) < 0.001;
          if (close) this.view = { ...t };
          else moving = true;
        }
      }
      const fading = !this.reducedMotion && now - this.newSquareStart < this.fadeDuration();
      this.draw(now);
      if (moving || fading) this.rafId = requestAnimationFrame(this.frame);
    },
    // 新しい正方形のフェードイン時間（次の項が来る前に終わるようにする）
    fadeDuration() {
      return Math.min(500, this.speed * 0.6);
    },
    draw(now = performance.now()) {
      const canvas = this.$refs.canvas;
      const view = this.view;
      const { w, h, dpr } = this.canvasSize;
      if (!canvas || !w) return;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!view) return;

      const scale = Math.exp(view.logScale);
      const toX = x => (x - view.cx) * scale + w / 2;
      const toY = y => (y - view.cy) * scale + h / 2;
      const last = this.squares.length - 1;
      const progress = this.reducedMotion ? 1 : Math.min((now - this.newSquareStart) / this.fadeDuration(), 1);

      // 正方形
      this.squares.forEach((sq, i) => {
        const size = sq.s * scale;
        if (size < 0.5) return;
        const px = toX(sq.x);
        const py = toY(sq.y);
        ctx.globalAlpha = i === last ? progress : 1;
        ctx.fillStyle = TILE_COLORS[(sq.k - 1) % TILE_COLORS.length];
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = i === last ? SPIRAL_COLOR : '#9ca3af';
        ctx.lineWidth = i === last ? 1.5 : 1;
        ctx.strokeRect(px, py, size, size);
      });
      ctx.globalAlpha = 1;

      // 黄金螺旋（各正方形の四分円）。最新の弧は伸びていくように描く
      ctx.strokeStyle = SPIRAL_COLOR;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      this.squares.forEach((sq, i) => {
        const r = sq.s * scale;
        if (r < 0.5) return;
        const spec = ARC_SPECS[sq.dir];
        const end = i === last ? spec.from + (spec.to - spec.from) * progress : spec.to;
        ctx.beginPath();
        ctx.arc(toX(sq.x + spec.cx * sq.s), toY(sq.y + spec.cy * sq.s), r, spec.from, end);
        ctx.stroke();
      });

      // 辺の長さ（値）。収まらないものは省略
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#374151';
      this.squares.forEach((sq, i) => {
        const size = sq.s * scale;
        if (size < 16) return;
        const len = sq.label.length;
        // 等幅に近い数字幅（約 0.6em）で正方形の 8 割に収まるフォントサイズ
        const fontSize = Math.min(size * 0.28, (size * 0.8) / (len * 0.6), 28);
        if (fontSize < 8) return;
        ctx.globalAlpha = i === last ? progress : 1;
        ctx.font = `${i === last ? 'bold ' : ''}${fontSize.toFixed(1)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillText(sq.label, toX(sq.x + sq.s / 2), toY(sq.y + sq.s / 2));
      });
      ctx.globalAlpha = 1;
    },
  },
};
</script>

<style scoped>
.section-title {
  font-weight: bold;
  font-size: 1.15rem;
  border-left: 4px solid var(--tb-main);
  padding-left: 0.5rem;
  margin-bottom: 1rem;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
  margin-bottom: 1rem;
}

.button-row,
.speed-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ctrl-button {
  padding: 0.35rem 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: #fff;
  font-size: 0.9rem;
}

.ctrl-button:hover:not(:disabled) {
  border-color: var(--tb-main);
}

.ctrl-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ctrl-button.primary {
  background: var(--tb-main);
  border-color: var(--tb-main);
  color: #fff;
  min-width: 6.5em;
}

.ctrl-button.primary:hover {
  background: var(--tb-main-hover);
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

.end-notice {
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  border-left: 4px solid var(--tb-main);
  background: #fdf2f1;
  font-size: 0.9rem;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .main-grid {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  }
}

.panel {
  min-width: 0;
}

.canvas-box {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--tb-border);
  border-radius: 0.5rem;
  background: #fff;
  overflow: hidden;
}

.canvas-box canvas {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
}

.term-label {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.digit-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0 0.5rem;
  border-radius: 9999px;
  background: var(--tb-bg-soft);
  font-size: 0.8rem;
  font-weight: normal;
}

.term-value {
  font-size: 1.6rem;
  font-weight: bold;
  line-height: 1.3;
  word-break: break-all;
  color: var(--tb-text);
  transition: color 0.4s ease;
}

.term-value.is-new {
  color: var(--tb-main);
  transition: none;
}

.ratio-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.ratio-name {
  width: 1.5em;
  color: #6b7280;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.ratio-digits {
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  word-break: break-all;
}

.phi-digits {
  color: #6b7280;
}

.digit-match {
  color: #15803d;
  font-weight: bold;
}

.digit-miss {
  color: #9ca3af;
}

.match-count {
  font-size: 1.3rem;
  font-weight: bold;
  color: #15803d;
}

.chart-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0 1rem;
}

.chart-head .section-title {
  margin-bottom: 0.75rem;
}

.chart-head .speed-picker {
  margin-bottom: 0.75rem;
}

.chart-box {
  width: 100%;
  overflow: hidden;
}

.chart-svg {
  display: block;
}

.grid line {
  stroke: #eceff3;
  stroke-width: 1;
}

.tick-label,
.axis-label {
  font-size: 11px;
  fill: #6b7280;
}

.phi-line {
  stroke: #d97706;
  stroke-width: 1.5;
  stroke-dasharray: 6 4;
}

.phi-label {
  font-size: 12px;
  fill: #b45309;
}

.series-line {
  fill: none;
  stroke: #94a3b8;
  stroke-width: 1.5;
}

.dot-above {
  fill: #c0392b;
}

.dot-below {
  fill: #2563eb;
}

.dot-above-text {
  color: #c0392b;
}

.dot-below-text {
  color: #2563eb;
}

.sequence-box {
  max-height: 12rem;
  overflow-y: auto;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--tb-border);
  border-radius: 0.5rem;
  background: var(--tb-bg-soft);
  font-size: 0.85rem;
  line-height: 1.7;
  word-break: break-all;
}

.seq-item:not(:last-child)::after {
  content: ', ';
  color: #9ca3af;
}

.seq-item:last-child {
  color: var(--tb-main);
  font-weight: bold;
}

@media (prefers-reduced-motion: reduce) {
  .term-value {
    transition: none;
  }
}
</style>
