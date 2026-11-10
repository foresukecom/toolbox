<template>
  <div class="dev-tool cat-number collatz">
    <p class="lead">
      コラッツ予想: 正の整数 n に「偶数なら 2 で割る、奇数なら 3 倍して 1 を足す」を繰り返すと、どんな n から始めても必ず 1 にたどり着く、という未解決の予想です。
      n = 1, 2, 3, … と順に試していく様子を眺めます。
    </p>

    <!-- 操作 -->
    <div class="controls">
      <div class="button-row">
        <button type="button" class="ctrl-button primary" @click="toggleRunning">
          {{ running ? '一時停止' : '再開' }}
        </button>
        <button type="button" class="ctrl-button" :disabled="running" @click="manualStep">1ステップ</button>
        <button type="button" class="ctrl-button" @click="reset">リセット</button>
      </div>
      <div class="speed-picker" role="radiogroup" aria-label="速度">
        <button
          v-for="opt in speedOptions"
          :key="opt.value"
          type="button"
          role="radio"
          class="speed-option"
          :class="{ active: speed === opt.value }"
          :aria-checked="speed === opt.value"
          :title="opt.desc"
          @click="speed = opt.value"
        >{{ opt.label }}</button>
      </div>
      <p class="hint speed-desc">{{ currentSpeed.desc }}</p>
      <div class="option-row">
        <label class="inline-flex items-center gap-1">
          <input v-model="logScale" type="checkbox" />
          軌跡を対数スケールで表示
        </label>
        <form class="start-form" @submit.prevent="startFromInput">
          <label for="collatz-start" class="whitespace-nowrap">開始 n</label>
          <input
            id="collatz-start"
            v-model="startInput"
            type="number"
            min="1"
            :max="maxStartN"
            step="1"
            inputmode="numeric"
            class="border rounded-md p-1 w-28 font-mono"
            placeholder="1"
          />
          <button type="submit" class="ctrl-button">ここから開始</button>
        </form>
      </div>
      <p v-if="inputError" class="error">{{ inputError }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>

    <!-- 現在の n の状態 -->
    <div class="status font-mono">
      <span>n = <b>{{ fmt(currentN) }}</b></span>
      <span>ステップ <b>{{ fmt(stepCount) }}</b></span>
      <span>現在値 <b :class="currentValue % 2 === 0 ? 'text-even' : 'text-odd'">{{ fmt(currentValue) }}</b></span>
      <span>最大 <b>{{ fmt(peak) }}</b></span>
    </div>

    <!-- 軌跡グラフ -->
    <section class="mb-6">
      <h2 class="section-title">n = {{ fmt(currentN) }} の軌跡</h2>
      <div ref="trajWrap" class="canvas-wrap">
        <canvas ref="trajCanvas" class="chart-canvas" role="img" :aria-label="'n = ' + currentN + ' の軌跡'"></canvas>
      </div>
      <div class="legend hint">
        <span><i class="dot dot-even"></i>偶数（次は ÷2）</span>
        <span><i class="dot dot-odd"></i>奇数（次は ×3+1）</span>
      </div>
      <div class="chips font-mono" aria-live="off">
        <span
          v-for="chip in chips"
          :key="chip.key"
          class="chip"
          :class="[chip.value % 2 === 0 ? 'chip-even' : 'chip-odd', { 'no-anim': !animateChips }]"
        >{{ fmt(chip.value) }}</span>
      </div>
    </section>

    <!-- 記録 -->
    <section class="mb-6">
      <h2 class="section-title">記録（n = {{ fmt(scatterStartN) }} 〜 {{ fmt(lastDoneN) }} の {{ fmt(doneCount) }} 個）</h2>
      <div class="records">
        <div class="record-card">
          <div class="record-label">最長ステップ（停止時間）</div>
          <div v-if="records.steps" :key="'s' + records.steps.n" class="record-value" :class="{ flash: flashEnabled }">
            n = <b>{{ fmt(records.steps.n) }}</b>
            <span class="record-sub">{{ fmt(records.steps.value) }} ステップ</span>
          </div>
          <div v-else class="record-value">-</div>
          <div v-if="stepHistory.length > 1" class="record-history hint font-mono">
            これまで: {{ stepHistory.map(r => fmt(r.n) + '(' + fmt(r.value) + ')').join(' ← ') }}
          </div>
        </div>
        <div class="record-card">
          <div class="record-label">最大到達値</div>
          <div v-if="records.peak" :key="'p' + records.peak.n" class="record-value" :class="{ flash: flashEnabled }">
            n = <b>{{ fmt(records.peak.n) }}</b>
            <span class="record-sub">最大 {{ fmt(records.peak.value) }}</span>
          </div>
          <div v-else class="record-value">-</div>
          <div v-if="peakHistory.length > 1" class="record-history hint font-mono">
            これまで: {{ peakHistory.map(r => fmt(r.n) + '(' + fmt(r.value) + ')').join(' ← ') }}
          </div>
        </div>
      </div>
    </section>

    <!-- 停止時間の散布図 -->
    <section>
      <h2 class="section-title">n ごとのステップ数（散布図）</h2>
      <div ref="scatterWrap" class="canvas-wrap">
        <canvas ref="scatterCanvas" class="chart-canvas" role="img" aria-label="n ごとのステップ数の散布図"></canvas>
      </div>
      <p class="hint mt-2">横軸が n、縦軸が 1 に戻るまでのステップ数です。濃い点は最長ステップの記録を更新した n。数が増えるほど独特の縞模様が浮かび上がります（「爆速」がおすすめ）。</p>
    </section>
  </div>
</template>

<script>
const STORAGE_KEY = 'toolbox.collatzWatcher.settings';

// 3n+1 が Number.MAX_SAFE_INTEGER を超えないための上限
// （n ≦ 1 億での最大到達値は n = 80,049,391 の約 2.2×10^15 で、MAX_SAFE_INTEGER（約 9.0×10^15）より小さい。
//  初めて超えるのは n = 319,804,831 なので、開始 n を 1 億以下に制限しておけば実用上は届かない）
const SAFE_ODD_LIMIT = Math.floor((Number.MAX_SAFE_INTEGER - 1) / 3);
const MAX_START_N = 100000000;

// 軌跡の下に流すチップの最大数
const CHIP_MAX = 30;

// mode: 'step' はステップ単位で進める（interval ミリ秒ごと、hold は 1 に着いた後の待ち時間）
// mode: 'n' は 1 フレームで perFrame 個の n をまとめて計算する
const SPEED_OPTIONS = [
  { value: 'slow', label: 'ゆっくり', mode: 'step', interval: 600, hold: 1500, desc: '1 ステップずつ 0.6 秒ごとに進めます' },
  { value: 'normal', label: '普通', mode: 'step', interval: 120, hold: 800, desc: '1 ステップずつ 0.12 秒ごとに進めます' },
  { value: 'fast', label: '速い', mode: 'step', interval: 12, hold: 250, desc: '1 フレームに数ステップ進めます' },
  { value: 'turbo', label: '超速', mode: 'n', perFrame: 1, desc: '1 フレームで n を 1 つ進めます' },
  { value: 'max', label: '爆速', mode: 'n', perFrame: 50, desc: '1 フレームで n を 50 個進めます' },
];

// 1 ステップ分のコラッツ操作
function collatzNext(v) {
  if (v % 2 === 0) return v / 2;
  if (v > SAFE_ODD_LIMIT) {
    throw new RangeError('値が Number.MAX_SAFE_INTEGER を超えるため計算を止めました');
  }
  return 3 * v + 1;
}

// n から 1 までの数の列（n と 1 を含む）
function collatzTrajectory(n) {
  const values = [n];
  let v = n;
  while (v !== 1) {
    v = collatzNext(v);
    values.push(v);
  }
  return values;
}

// 列を作らずにステップ数と最大到達値だけを求める
function collatzStats(n) {
  let v = n;
  let steps = 0;
  let peak = n;
  while (v !== 1) {
    v = collatzNext(v);
    steps++;
    if (v > peak) peak = v;
  }
  return { steps, peak };
}

// v 以上で 1, 2, 5 × 10^k の形の最小値
function niceCeil(v) {
  if (v <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 5, 10]) {
    if (m * p >= v) return m * p;
  }
  return 10 * p;
}

// 0〜max を target 個程度に分ける目盛り間隔（1, 2, 5 × 10^k）
function niceStep(max, target) {
  const raw = Math.max(max / target, 1e-9);
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  const unit = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return unit * p;
}

// 軸ラベル用の短い表記
function axisLabel(v) {
  if (v >= 1e6) {
    const exp = Math.floor(Math.log10(v));
    const mant = v / 10 ** exp;
    return (Number.isInteger(mant) ? mant : mant.toFixed(1)) + 'e' + exp;
  }
  if (v >= 1e4) return (v / 1e3).toLocaleString('ja-JP', { maximumFractionDigits: 1 }) + 'k';
  return String(v);
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

const COLORS = {
  even: '#2563eb',
  odd: '#ea580c',
  line: '#9ca3af',
  grid: '#eeeeee',
  axis: '#d1d5db',
  label: '#6b7280',
  scatter: 'rgba(192, 57, 43, 0.55)',
  record: '#7b241c',
};

export default {
  name: 'CollatzWatcher',
  data() {
    const saved = loadSettings();
    return {
      speedOptions: SPEED_OPTIONS,
      speed: SPEED_OPTIONS.some(opt => opt.value === saved.speed) ? saved.speed : 'normal',
      logScale: saved.logScale === true,
      maxStartN: MAX_START_N,
      running: true,
      startInput: '',
      inputError: '',
      errorMessage: '',
      // 現在の n の状態
      currentN: 1,
      stepCount: 0,
      currentValue: 1,
      peak: 1,
      chips: [],
      // 集計
      scatterStartN: 1,
      doneCount: 0,
      records: { steps: null, peak: null },
      stepHistory: [],
      peakHistory: [],
      // 初回の記録表示ではハイライトしない
      flashEnabled: false,
    };
  },
  computed: {
    currentSpeed() {
      return SPEED_OPTIONS.find(opt => opt.value === this.speed);
    },
    animateChips() {
      return this.currentSpeed.mode === 'step' && this.currentSpeed.interval >= 100;
    },
    lastDoneN() {
      return this.doneCount > 0 ? this.scatterStartN + this.doneCount - 1 : this.scatterStartN;
    },
  },
  watch: {
    speed: 'saveSettings',
    logScale() {
      this.saveSettings();
      this.drawTrajectory();
    },
  },
  created() {
    // 描画用の大きなデータはリアクティブにしない
    this.traj = [];
    this.scatterSteps = [];
    this.stepRecordIdx = [];
    this.scatterView = { span: 0, yMax: 0, drawn: 0 };
    this.finished = false;
    this.holdLeft = 0;
    this.acc = 0;
    this.lastTs = 0;
    this.rafId = null;
    this.resizeObserver = null;
  },
  mounted() {
    this.startFrom(1);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvases());
      this.resizeObserver.observe(this.$refs.trajWrap);
      this.resizeObserver.observe(this.$refs.scatterWrap);
    }
    this.resizeCanvases();
    this.startLoop();
  },
  beforeUnmount() {
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.resizeObserver) this.resizeObserver.disconnect();
  },
  methods: {
    fmt(v) {
      return Number(v).toLocaleString('ja-JP');
    },
    saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed: this.speed, logScale: this.logScale }));
      } catch (e) {
        // 保存できなくても動作は続ける
      }
    },

    // ---- 進行制御 ----
    startLoop() {
      cancelAnimationFrame(this.rafId);
      this.lastTs = 0;
      this.acc = 0;
      this.rafId = requestAnimationFrame(this.frame);
    },
    toggleRunning() {
      this.running = !this.running;
      if (this.running) {
        this.startLoop();
      } else {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    },
    reset() {
      this.startFrom(this.scatterStartN);
    },
    startFromInput() {
      const raw = String(this.startInput).trim();
      if (raw === '') {
        this.inputError = '';
        this.startFrom(1);
        return;
      }
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > MAX_START_N) {
        this.inputError = `開始 n は 1 〜 ${this.fmt(MAX_START_N)} の整数で指定してください`;
        return;
      }
      this.inputError = '';
      this.startFrom(n);
    },
    // n から数え直す（記録と散布図も初期化）
    startFrom(n) {
      this.errorMessage = '';
      this.scatterStartN = n;
      this.scatterSteps = [];
      this.stepRecordIdx = [];
      this.scatterView = { span: 0, yMax: 0, drawn: 0 };
      this.doneCount = 0;
      this.records = { steps: null, peak: null };
      this.stepHistory = [];
      this.peakHistory = [];
      this.flashEnabled = false;
      this.beginN(n);
      this.drawTrajectory();
      this.drawScatter(true);
      if (!this.running) {
        this.running = true;
        this.startLoop();
      }
    },
    beginN(n) {
      this.currentN = n;
      this.traj = [n];
      this.stepCount = 0;
      this.currentValue = n;
      this.peak = n;
      this.finished = false;
      this.chips = [{ key: n + '-0', value: n }];
    },
    // 1 ステップ進めて、軌跡とチップを更新する
    stepOnce() {
      const v = collatzNext(this.currentValue);
      this.traj.push(v);
      this.stepCount++;
      this.currentValue = v;
      if (v > this.peak) this.peak = v;
      const chips = this.chips.length >= CHIP_MAX ? this.chips.slice(1) : this.chips.slice();
      chips.push({ key: this.currentN + '-' + this.stepCount, value: v });
      this.chips = chips;
    },
    // 現在の n が 1 に着いたので集計に加える
    finishN() {
      this.finished = true;
      this.recordResult(this.currentN, this.stepCount, this.peak);
    },
    recordResult(n, steps, peak) {
      this.scatterSteps.push(steps);
      this.doneCount++;
      if (!this.records.steps || steps > this.records.steps.value) {
        this.records.steps = { n, value: steps };
        this.stepHistory = [{ n, value: steps }, ...this.stepHistory].slice(0, 5);
        this.stepRecordIdx.push(this.scatterSteps.length - 1);
      }
      if (!this.records.peak || peak > this.records.peak.value) {
        this.records.peak = { n, value: peak };
        this.peakHistory = [{ n, value: peak }, ...this.peakHistory].slice(0, 5);
      }
    },
    // ステップ単位モードの 1 tick
    tickStep() {
      const opt = this.currentSpeed;
      if (this.finished) {
        // 1 に着いた後は少し止めてから次の n へ
        if (this.holdLeft > 0) {
          this.holdLeft--;
          return;
        }
        this.beginN(this.currentN + 1);
        return;
      }
      if (this.currentValue === 1) {
        this.finishN();
        this.holdLeft = Math.round(opt.hold / opt.interval);
        return;
      }
      this.stepOnce();
    },
    // n 単位モードの 1 フレーム
    tickN(perFrame) {
      let count = 0;
      if (!this.finished) {
        // ステップ途中から切り替えた場合は残りを一気に進める
        while (this.currentValue !== 1) {
          const v = collatzNext(this.currentValue);
          this.traj.push(v);
          this.stepCount++;
          this.currentValue = v;
          if (v > this.peak) this.peak = v;
        }
        this.finishN();
        count++;
      }
      let n = this.currentN;
      // 最後の 1 個以外は列を作らずに集計だけ行う
      for (; count < perFrame - 1; count++) {
        n++;
        const s = collatzStats(n);
        this.recordResult(n, s.steps, s.peak);
      }
      if (count < perFrame) {
        n++;
        const values = collatzTrajectory(n);
        this.traj = values;
        this.currentN = n;
        this.stepCount = values.length - 1;
        this.currentValue = 1;
        this.peak = Math.max(...values);
        this.finished = true;
        this.recordResult(n, this.stepCount, this.peak);
      }
      this.chips = this.traj.slice(-CHIP_MAX).map((value, i, arr) => ({
        key: this.currentN + '-' + (this.traj.length - arr.length + i),
        value,
      }));
    },
    frame(ts) {
      if (!this.running) return;
      const dt = this.lastTs ? Math.min(ts - this.lastTs, 1000) : 0;
      this.lastTs = ts;
      const opt = this.currentSpeed;
      const doneBefore = this.doneCount;
      const trajBefore = this.traj.length + ':' + this.currentN;
      try {
        if (opt.mode === 'step') {
          this.acc += dt;
          // 1 フレームあたりの処理量を制限する
          let guard = 50;
          while (this.acc >= opt.interval && guard-- > 0) {
            this.acc -= opt.interval;
            this.tickStep();
          }
          if (guard <= 0) this.acc = 0;
        } else {
          this.tickN(opt.perFrame);
        }
      } catch (e) {
        this.errorMessage = e.message;
        this.running = false;
        return;
      }
      if (doneBefore !== this.doneCount) this.flashEnabled = true;
      if (trajBefore !== this.traj.length + ':' + this.currentN) this.drawTrajectory();
      if (doneBefore !== this.doneCount) this.drawScatter(false);
      this.rafId = requestAnimationFrame(this.frame);
    },
    // 一時停止中に 1 ステップだけ進める
    manualStep() {
      try {
        const opt = this.currentSpeed;
        if (opt.mode === 'step') {
          if (this.finished) {
            this.holdLeft = 0;
            this.beginN(this.currentN + 1);
          } else if (this.currentValue === 1) {
            this.finishN();
          } else {
            this.stepOnce();
          }
        } else {
          this.tickN(1);
        }
      } catch (e) {
        this.errorMessage = e.message;
      }
      this.flashEnabled = true;
      this.drawTrajectory();
      this.drawScatter(false);
    },

    // ---- 描画 ----
    resizeCanvases() {
      for (const [canvasRef, wrapRef] of [['trajCanvas', 'trajWrap'], ['scatterCanvas', 'scatterWrap']]) {
        const canvas = this.$refs[canvasRef];
        const wrap = this.$refs[wrapRef];
        if (!canvas || !wrap) continue;
        const dpr = window.devicePixelRatio || 1;
        const w = wrap.clientWidth;
        const h = w < 500 ? 220 : 280;
        canvas.style.height = h + 'px';
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.cssWidth = w;
        canvas.cssHeight = h;
      }
      this.drawTrajectory();
      this.drawScatter(true);
    },
    prepareCanvas(canvas) {
      if (!canvas || !canvas.cssWidth) return null;
      const ctx = canvas.getContext('2d');
      const dpr = canvas.width / canvas.cssWidth;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    },
    drawTrajectory() {
      const canvas = this.$refs.trajCanvas;
      const ctx = this.prepareCanvas(canvas);
      if (!ctx) return;
      const W = canvas.cssWidth;
      const H = canvas.cssHeight;
      const pad = { l: 48, r: 12, t: 10, b: 24 };
      const pw = W - pad.l - pad.r;
      const ph = H - pad.t - pad.b;
      const values = this.traj;
      ctx.clearRect(0, 0, W, H);
      ctx.font = '11px system-ui, sans-serif';

      // 横軸: これまでのステップ数に合わせて自動スケール
      const xMax = Math.max(values.length - 1, 10);
      const maxV = Math.max(...values, 2);
      let yOf;
      const yTicks = [];
      if (this.logScale) {
        const logMax = Math.max(Math.ceil(Math.log10(maxV)), 1);
        yOf = v => pad.t + ph - (Math.log10(v) / logMax) * ph;
        const every = Math.ceil(logMax / 5);
        for (let e = 0; e <= logMax; e += every) yTicks.push(10 ** e);
      } else {
        const step = niceStep(maxV, 4);
        const yMax = Math.ceil(maxV / step) * step;
        yOf = v => pad.t + ph - (v / yMax) * ph;
        for (let v = 0; v <= yMax; v += step) yTicks.push(v);
      }
      const xOf = i => pad.l + (i / xMax) * pw;

      // 目盛り
      ctx.fillStyle = COLORS.label;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const v of yTicks) {
        const y = yOf(v);
        ctx.strokeStyle = COLORS.grid;
        ctx.beginPath();
        ctx.moveTo(pad.l, y);
        ctx.lineTo(W - pad.r, y);
        ctx.stroke();
        ctx.fillText(axisLabel(v), pad.l - 6, y);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const xStep = niceStep(xMax, Math.max(Math.floor(pw / 70), 2));
      for (let i = 0; i <= xMax; i += xStep) {
        ctx.fillText(String(i), xOf(i), H - pad.b + 6);
      }
      ctx.strokeStyle = COLORS.axis;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t);
      ctx.lineTo(pad.l, pad.t + ph);
      ctx.lineTo(W - pad.r, pad.t + ph);
      ctx.stroke();

      // 折れ線
      ctx.strokeStyle = COLORS.line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      values.forEach((v, i) => {
        if (i === 0) ctx.moveTo(xOf(i), yOf(v));
        else ctx.lineTo(xOf(i), yOf(v));
      });
      ctx.stroke();
      ctx.lineWidth = 1;

      // 点（偶数 / 奇数で色分け）
      const r = values.length > 200 ? 1.5 : 2.5;
      values.forEach((v, i) => {
        ctx.fillStyle = v % 2 === 0 ? COLORS.even : COLORS.odd;
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 現在位置を強調
      const last = values.length - 1;
      ctx.strokeStyle = values[last] % 2 === 0 ? COLORS.even : COLORS.odd;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(xOf(last), yOf(values[last]), 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    },
    // full = true なら全体を描き直し、false なら新しい点だけ追加で描く
    drawScatter(full) {
      const canvas = this.$refs.scatterCanvas;
      const ctx = this.prepareCanvas(canvas);
      if (!ctx) return;
      const W = canvas.cssWidth;
      const H = canvas.cssHeight;
      const pad = { l: 40, r: 12, t: 10, b: 24 };
      const pw = W - pad.l - pad.r;
      const ph = H - pad.t - pad.b;
      const steps = this.scatterSteps;
      const view = this.scatterView;
      const count = steps.length;
      const maxSteps = this.records.steps ? this.records.steps.value : 0;

      // 軸の範囲を超えたら広げて描き直す
      if (full || count > view.span || maxSteps > view.yMax) {
        view.span = niceCeil(Math.max(count, 10));
        view.yMax = Math.max(Math.ceil((maxSteps + 1) / 50) * 50, 50);
        view.drawn = 0;
        full = true;
      }
      const startN = this.scatterStartN;
      const xOf = i => pad.l + ((i + 0.5) / view.span) * pw;
      const yOf = s => pad.t + ph - (s / view.yMax) * ph;
      // 1 つの n あたりの幅に合わせて点の大きさを決める
      const size = Math.min(Math.max(pw / view.span, 1), 4);

      if (full) {
        ctx.clearRect(0, 0, W, H);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = COLORS.label;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const yStep = niceStep(view.yMax, 4);
        for (let s = 0; s <= view.yMax; s += yStep) {
          ctx.strokeStyle = COLORS.grid;
          ctx.beginPath();
          ctx.moveTo(pad.l, yOf(s));
          ctx.lineTo(W - pad.r, yOf(s));
          ctx.stroke();
          ctx.fillText(String(s), pad.l - 6, yOf(s));
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const xStep = niceStep(view.span, Math.max(Math.floor(pw / 80), 2));
        // 目盛りは xStep の倍数の n に置く（左端は開始 n）
        ctx.fillText(axisLabel(startN), xOf(0), H - pad.b + 6);
        const first = Math.ceil((startN + xStep * 0.5) / xStep) * xStep;
        for (let n = first; n < startN + view.span; n += xStep) {
          ctx.fillText(axisLabel(n), xOf(n - startN), H - pad.b + 6);
        }
        ctx.strokeStyle = COLORS.axis;
        ctx.beginPath();
        ctx.moveTo(pad.l, pad.t);
        ctx.lineTo(pad.l, pad.t + ph);
        ctx.lineTo(W - pad.r, pad.t + ph);
        ctx.stroke();
      }

      ctx.fillStyle = COLORS.scatter;
      for (let i = view.drawn; i < count; i++) {
        ctx.fillRect(xOf(i) - size / 2, yOf(steps[i]) - size / 2, size, size);
      }
      // 記録更新した n は濃い点で重ねる
      ctx.fillStyle = COLORS.record;
      for (const i of this.stepRecordIdx) {
        if (!full && i < view.drawn) continue;
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(steps[i]), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      view.drawn = count;
    },
  },
};
</script>

<style scoped>
.lead {
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}

.button-row,
.speed-picker,
.option-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.option-row {
  gap: 0.5rem 1.5rem;
}

.start-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.ctrl-button {
  padding: 0.3rem 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: #fff;
}

.ctrl-button:hover:not(:disabled) {
  border-color: var(--tb-main);
}

.ctrl-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ctrl-button.primary {
  min-width: 6.5rem;
  background: var(--tb-main);
  border-color: var(--tb-main);
  color: #fff;
}

.ctrl-button.primary:hover {
  background: var(--tb-main-hover);
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

.speed-desc {
  margin-top: -0.25rem;
}

.status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
  padding: 0.6rem 0.9rem;
  margin-bottom: 1.25rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.text-even {
  color: #2563eb;
}

.text-odd {
  color: #ea580c;
}

.section-title {
  font-weight: bold;
  font-size: 1.15rem;
  border-left: 4px solid var(--tb-main);
  padding-left: 0.5rem;
  margin-bottom: 0.75rem;
}

.canvas-wrap {
  width: 100%;
  min-width: 0;
}

.chart-canvas {
  display: block;
  width: 100%;
  height: 280px;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #fff;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
  margin: 0.5rem 0;
}

.dot {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 9999px;
  margin-right: 0.35rem;
  vertical-align: middle;
}

.dot-even {
  background: #2563eb;
}

.dot-odd {
  background: #ea580c;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-height: 1.8rem;
}

.chip {
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  border: 1px solid transparent;
  animation: chip-in 300ms ease-out;
}

.chip-even {
  background: #dbeafe;
  border-color: #bfdbfe;
  color: #1e40af;
}

.chip-odd {
  background: #ffedd5;
  border-color: #fed7aa;
  color: #9a3412;
}

.chip.no-anim {
  animation: none;
}

@keyframes chip-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.85);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.records {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .records {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.record-card {
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  min-width: 0;
}

.record-label {
  font-size: 0.85rem;
  color: #6b7280;
}

.record-value {
  font-size: 1.25rem;
  border-radius: 0.25rem;
}

.record-sub {
  font-size: 0.95rem;
  margin-left: 0.5rem;
}

.record-value.flash {
  animation: record-flash 1.2s ease-out;
}

@keyframes record-flash {
  0% {
    background-color: #fde68a;
  }
  100% {
    background-color: transparent;
  }
}

.record-history {
  margin-top: 0.25rem;
  overflow-wrap: anywhere;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.error {
  color: #b91c1c;
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .record-value.flash {
    animation: none;
  }
}
</style>
