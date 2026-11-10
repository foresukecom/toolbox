<template>
  <div class="dev-tool cat-number mandelbrot">
    <p class="lead">
      z ← z² + c を繰り返しても発散しない複素数 c の集まりがマンデルブロ集合です（黒い部分）。外側は発散するまでの回数で色を付けています。境界の見どころへ向けて自動でズームし続けます。
    </p>

    <div class="stats">
      <div class="stat stat-center">
        <div class="stat-label">中心</div>
        <div class="stat-value coord font-mono">
          <span>{{ centerText.re }}</span><span>{{ centerText.im }}</span>
        </div>
      </div>
      <div class="stat">
        <div class="stat-label">倍率</div>
        <div class="stat-value font-mono">
          ×{{ zoomText.mantissa }}<template v-if="zoomText.exp">×10<sup>{{ zoomText.exp }}</sup></template>
        </div>
      </div>
      <div class="stat">
        <div class="stat-label">反復回数（上限）</div>
        <div class="stat-value font-mono">{{ stats.maxIter.toLocaleString() }}</div>
      </div>
    </div>

    <div class="controls">
      <button type="button" class="action-button" @click="togglePause">{{ paused ? '自動ズーム再開' : '一時停止' }}</button>
      <button type="button" class="action-button secondary" @click="zoomOutStep">ズームアウト</button>
      <button type="button" class="action-button secondary" @click="reset">リセット</button>
      <div class="picker" role="radiogroup" aria-label="ズーム速度">
        <span class="picker-label">速度</span>
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
        配色
        <select v-model="paletteKey" class="border rounded-md p-1" aria-label="配色">
          <option v-for="p in paletteOptions" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
      </label>
    </div>

    <div ref="wrap" class="canvas-wrap">
      <canvas
        ref="canvas"
        class="fractal-canvas"
        role="img"
        :aria-label="ariaLabel"
        @click="onClick"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      ></canvas>
    </div>
    <p class="status" aria-live="polite">{{ statusText }}</p>
    <p class="hint">
      クリック（タップ）するとその点を中心に 4 倍に拡大します。マウスホイールやピンチでも拡大・縮小できます。手動で操作すると自動ズームは一時停止します。
    </p>
  </div>
</template>

<script>
import {
  HOME_VIEW,
  MIN_WIDTH,
  PALETTES,
  SPOTS,
  buildLut,
  colorize,
  maxIterFor,
  renderRows,
  zoomPath,
} from '@/utilities/mandelbrot.js';

const STORAGE_KEY = 'toolbox.mandelbrot.settings';
// 自動ズームの速さ（1 秒あたりの拡大率）
const SPEED_OPTIONS = [
  { value: 'slow', label: 'ゆっくり', rate: 1.25 },
  { value: 'normal', label: '普通', rate: 1.5 },
  { value: 'fast', label: '速い', rate: 2.2 },
];
// 縮小できる上限（全体表示の何倍まで引けるか）
const MAX_WIDTH = HOME_VIEW.width * 2;
// 全体表示で止まる時間・最深部で止まる時間・全体へ戻る時間 (ms)
const INTRO_MS = 1500;
const HOLD_MS = 2500;
const OUT_MS = 4000;
// クリック時の拡大率とアニメーション時間
const CLICK_ZOOM = 4;
const CLICK_ANIM_MS = 400;
// 止まっているときの段階的な描画（計算する格子の間隔、デバイスピクセル単位）
const STATIC_STEPS = [8, 2, 1];
// 動いているときの格子の間隔の上限（描画時間に合わせて自動調整する）
const MAX_ANIM_STEP = 6;

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
}

// 倍率を「仮数 × 10^指数」に分ける
function splitExp(value) {
  if (value < 1000) return { mantissa: value.toFixed(value < 10 ? 2 : 1), exp: 0 };
  const [m, e] = value.toExponential(2).split('e');
  return { mantissa: m, exp: Number(e) };
}

export default {
  name: 'MandelbrotSet',
  data() {
    const saved = loadSettings();
    return {
      speedOptions: SPEED_OPTIONS,
      paletteOptions: PALETTES.map(({ key, label }) => ({ key, label })),
      speed: SPEED_OPTIONS.some((o) => o.value === saved.speed) ? saved.speed : 'normal',
      paletteKey: PALETTES.some((p) => p.key === saved.palette) ? saved.palette : 'classic',
      paused: prefersReducedMotion(),
      // 表示用（毎フレームではなく間引いて更新する）
      stats: { cx: HOME_VIEW.cx, cy: HOME_VIEW.cy, width: HOME_VIEW.width, maxIter: maxIterFor(HOME_VIEW.width) },
      phase: 'intro',
      spotIndex: 0,
      atLimit: false,
      workerMode: true,
    };
  },
  computed: {
    rate() {
      return SPEED_OPTIONS.find((o) => o.value === this.speed).rate;
    },
    centerText() {
      // 横幅に応じて意味のある桁数だけ表示する
      const digits = Math.min(17, Math.max(3, Math.ceil(-Math.log10(this.stats.width)) + 3));
      const re = this.stats.cx.toFixed(digits);
      const imAbs = Math.abs(this.stats.cy).toFixed(digits);
      const sign = this.stats.cy < 0 && Number(imAbs) !== 0 ? '−' : '+';
      return { re, im: ` ${sign} ${imAbs}i` };
    },
    zoomText() {
      return splitExp(HOME_VIEW.width / this.stats.width);
    },
    statusText() {
      if (this.atLimit) return 'これ以上は倍精度（64bit 浮動小数点）の限界で拡大できません。';
      if (this.paused) return '自動ズームは一時停止中です。';
      const spot = SPOTS[this.spotIndex].label;
      if (this.phase === 'in') return `「${spot}」へズーム中…`;
      if (this.phase === 'hold') return `「${spot}」の最深部（倍精度の限界の手前）に到達しました。`;
      if (this.phase === 'out') return '全体表示に戻っています…';
      return `次は「${spot}」へ向かいます。`;
    },
    ariaLabel() {
      return `マンデルブロ集合: 中心 ${this.centerText.re}${this.centerText.im}、倍率 ${Math.round(HOME_VIEW.width / this.stats.width)} 倍`;
    },
  },
  watch: {
    speed: 'saveSettings',
    paletteKey() {
      this.saveSettings();
      this.lut = buildLut(PALETTES.find((p) => p.key === this.paletteKey));
      // 計算済みの反復値から塗り直す（再計算は不要）
      [this.latest, this.homeImage].forEach((img) => img && this.paintImage(img));
      if (this.job) this.cancelJob();
      this.needsDraw = true;
    },
  },
  created() {
    // 大きなデータやキャンバスはリアクティブにしない
    this.view = { ...HOME_VIEW };
    this.lut = buildLut(PALETTES.find((p) => p.key === this.paletteKey));
    this.workers = [];
    this.job = null;
    this.jobSeq = 0;
    this.latest = null;
    this.homeImage = null;
    this.animStep = 2;
    this.lastJobMs = 100;
    this.rafId = null;
    this.lastTime = 0;
    this.lastStatsAt = 0;
    this.phaseElapsed = 0;
    this.path = null;
    this.pathT = 0;
    this.manualAnim = null;
    this.resumeFromManual = false;
    this.needsDraw = true;
    this.viewChanged = false;
    this.pointers = new Map();
    this.pinch = null;
    this.suppressClickUntil = 0;
    this.resizeObserver = null;
    this.canvasW = 0;
    this.canvasH = 0;
  },
  mounted() {
    this.startWorkers();
    this.animStep = Math.max(1, Math.round(window.devicePixelRatio || 1));
    // ホイールで拡大するときにページがスクロールしないよう passive: false で登録する
    this.$refs.canvas.addEventListener('wheel', this.onWheelNative, { passive: false });
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
    this.$refs.canvas.removeEventListener('wheel', this.onWheelNative);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', this.resizeCanvas);
    }
    this.workers.forEach((w) => w.worker.terminate());
    this.workers = [];
  },
  methods: {
    saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed: this.speed, palette: this.paletteKey }));
      } catch (e) {
        // 保存できなくても表示には影響しない
      }
    },

    // ---- Worker ----

    startWorkers() {
      const count = Math.min(6, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));
      try {
        for (let i = 0; i < count; i++) {
          const worker = new Worker(new URL('../utilities/mandelbrot.worker.js', import.meta.url));
          const entry = { worker, busy: false };
          worker.onmessage = (e) => {
            entry.busy = false;
            this.onChunk(e.data);
            this.dispatch();
          };
          worker.onerror = () => {
            // Worker が使えない環境ではメインスレッドで少しずつ計算する
            this.fallbackToMainThread();
          };
          this.workers.push(entry);
        }
      } catch (e) {
        this.fallbackToMainThread();
      }
    },
    fallbackToMainThread() {
      this.workers.forEach((w) => w.worker.terminate());
      this.workers = [];
      this.workerMode = false;
      if (this.job) this.cancelJob();
    },

    // 表示範囲 view を格子間隔 step で計算するジョブを始める
    startJob(view, step) {
      const gw = Math.ceil(this.canvasW / step);
      const gh = Math.ceil(this.canvasH / step);
      // 格子の端数で横幅がずれないよう、計算する範囲を格子に合わせて広げる
      const width = (view.width * gw * step) / this.canvasW;
      const params = { cx: view.cx, cy: view.cy, width, gw, gh, maxIter: maxIterFor(view.width) };
      const workerCount = Math.max(1, this.workers.length);
      const rowsPerChunk = Math.max(2, Math.ceil(gh / (workerCount * 6)));
      const queue = [];
      for (let y = 0; y < gh; y += rowsPerChunk) queue.push([y, Math.min(gh, y + rowsPerChunk)]);
      const canvas = document.createElement('canvas');
      canvas.width = gw;
      canvas.height = gh;
      this.job = {
        id: ++this.jobSeq,
        params,
        step,
        view: { ...view },
        canvasW: this.canvasW,
        canvasH: this.canvasH,
        values: new Float32Array(gw * gh),
        canvas,
        ctx: canvas.getContext('2d'),
        queue,
        remaining: queue.length,
        startedAt: performance.now(),
      };
      this.dispatch();
    },
    cancelJob() {
      // 計算中の断片は jobId が合わないので捨てられる
      this.job = null;
    },
    dispatch() {
      const job = this.job;
      if (!job) return;
      for (const entry of this.workers) {
        if (entry.busy || job.queue.length === 0) continue;
        const [y0, y1] = job.queue.shift();
        entry.busy = true;
        entry.worker.postMessage({ jobId: job.id, params: job.params, y0, y1 });
      }
    },
    // Worker なしのときは 1 フレームあたり一定時間だけ計算する
    computeOnMainThread() {
      const job = this.job;
      if (!job) return;
      const deadline = performance.now() + 10;
      while (this.job === job && job.queue.length > 0 && performance.now() < deadline) {
        const [y0, y1] = job.queue.shift();
        const values = new Float32Array((y1 - y0) * job.params.gw);
        renderRows(job.params, y0, y1, values);
        this.onChunk({ jobId: job.id, y0, y1, values });
      }
    },
    onChunk({ jobId, y0, y1, values }) {
      const job = this.job;
      if (!job || job.id !== jobId) return;
      const gw = job.params.gw;
      job.values.set(values, y0 * gw);
      // 届いた行から塗っていく（止まっているときは途中経過も表示する）
      const imageData = job.ctx.createImageData(gw, y1 - y0);
      colorize(values, this.lut, new Uint32Array(imageData.data.buffer));
      job.ctx.putImageData(imageData, 0, y0);
      job.remaining--;
      this.needsDraw = true;
      if (job.remaining > 0) return;
      this.job = null;
      // 描画時間に合わせて、動いているときの格子間隔を調整する
      const elapsed = performance.now() - job.startedAt;
      this.lastJobMs = elapsed;
      if (job.animating) {
        if (elapsed > 220) this.animStep = Math.min(MAX_ANIM_STEP, this.animStep + 1);
        else if (elapsed < 70) this.animStep = Math.max(1, this.animStep - 1);
      }
      const img = {
        view: job.view,
        params: job.params,
        step: job.step,
        canvasW: job.canvasW,
        canvasH: job.canvasH,
        values: job.values,
        canvas: job.canvas,
      };
      this.latest = img;
      // 全体表示の画像は、縮小したときの背景として取っておく
      if (job.view.width >= HOME_VIEW.width * 0.99 && job.step <= 2) this.homeImage = img;
    },
    // 画像を現在のパレットで塗り直す
    paintImage(img) {
      const ctx = img.canvas.getContext('2d');
      const imageData = ctx.createImageData(img.params.gw, img.params.gh);
      colorize(img.values, this.lut, new Uint32Array(imageData.data.buffer));
      ctx.putImageData(imageData, 0, 0);
    },

    // ---- 表示範囲の更新 ----

    tick(now) {
      // タブ復帰時などに一気に進みすぎないよう経過時間を制限する
      const dt = this.lastTime ? Math.min(now - this.lastTime, 100) : 16;
      this.lastTime = now;
      const before = this.view;
      if (this.manualAnim) {
        this.advanceManual(dt);
      } else if (!this.paused) {
        this.advanceAuto(dt);
      }
      const moving = this.view !== before || this.viewChanged;
      this.viewChanged = false;
      if (moving) this.needsDraw = true;
      this.scheduleRender(moving);
      if (!this.workerMode) this.computeOnMainThread();
      if (this.needsDraw) {
        this.draw();
        this.needsDraw = false;
      }
      if (now - this.lastStatsAt > 100) {
        this.lastStatsAt = now;
        this.updateStats();
      }
      this.rafId = requestAnimationFrame(this.tick);
    },
    updateStats() {
      const { cx, cy, width } = this.view;
      if (cx !== this.stats.cx || cy !== this.stats.cy || width !== this.stats.width) {
        this.stats = { cx, cy, width, maxIter: maxIterFor(width) };
      }
    },
    setView(view) {
      this.view = view;
    },
    // 自動ズーム: intro（全体で静止）→ in（見どころへ）→ hold（最深部で静止）→ out（全体へ戻る）
    advanceAuto(dt) {
      if (this.resumeFromManual) {
        this.resumeFromManual = false;
        this.beginOut();
      }
      this.phaseElapsed += dt;
      if (this.phase === 'intro') {
        if (this.phaseElapsed >= INTRO_MS) this.beginIn();
      } else if (this.phase === 'in') {
        // 速度を途中で変えても滑らかにつながるよう、進捗 t を拡大率から進める
        const total = Math.log(HOME_VIEW.width / MIN_WIDTH);
        this.pathT = Math.min(1, this.pathT + (dt / 1000) * (Math.log(this.rate) / total));
        this.setView(this.path(this.pathT));
        if (this.pathT >= 1) this.setPhase('hold');
      } else if (this.phase === 'hold') {
        if (this.phaseElapsed >= HOLD_MS) this.beginOut();
      } else if (this.phase === 'out') {
        this.pathT = Math.min(1, this.phaseElapsed / OUT_MS);
        this.setView(this.path(easeInOut(this.pathT)));
        if (this.pathT >= 1) {
          this.spotIndex = (this.spotIndex + 1) % SPOTS.length;
          this.setPhase('intro');
        }
      }
    },
    setPhase(phase) {
      this.phase = phase;
      this.phaseElapsed = 0;
    },
    beginIn() {
      const spot = SPOTS[this.spotIndex];
      this.path = zoomPath(this.view, { cx: spot.cx, cy: spot.cy, width: MIN_WIDTH });
      this.pathT = 0;
      this.setPhase('in');
    },
    beginOut() {
      const v = this.view;
      if (Math.abs(v.width / HOME_VIEW.width - 1) < 0.01 && Math.hypot(v.cx - HOME_VIEW.cx, v.cy - HOME_VIEW.cy) < 0.01) {
        this.setPhase('intro');
        return;
      }
      this.path = zoomPath(v, HOME_VIEW);
      this.pathT = 0;
      this.setPhase('out');
    },
    // クリックやボタンによる短いズームアニメーション
    animateTo(target) {
      const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, target.width));
      this.manualAnim = { path: zoomPath(this.view, { ...target, width }), t: 0 };
    },
    advanceManual(dt) {
      const anim = this.manualAnim;
      anim.t = Math.min(1, anim.t + dt / CLICK_ANIM_MS);
      this.setView(anim.path(easeInOut(anim.t)));
      if (anim.t >= 1) this.manualAnim = null;
    },
    // 手動で操作したら自動ズームを止め、再開時は全体へ戻ってから次の見どころへ向かう
    stopAutoForManual() {
      if (!this.paused) this.paused = true;
      this.resumeFromManual = true;
    },

    // 描画ジョブの発行: 動いている間は粗めに、止まったら細かく描き直す
    scheduleRender(moving) {
      if (!this.canvasW) return;
      const latest = this.latest;
      const sameView = latest && this.isSameView(latest);
      if (moving) {
        // 動いている間は計算中のジョブが終わるのを待ってから次を出す
        if (this.job) return;
        if (this.isAutoOut()) {
          // 全体へ戻るときは縮小が速く描画が追いつかないので、少し先の（広い）範囲を粗めに描く
          const ahead = Math.min(800, Math.max(60, this.lastJobMs * 1.5));
          const t = Math.min(1, this.pathT + ahead / OUT_MS);
          this.startJob(this.path(easeInOut(t)), Math.max(3, this.animStep));
        } else {
          this.startJob(this.view, this.animStep);
        }
        this.job.animating = true;
        return;
      }
      if (this.job) {
        if (this.job.animating || !this.isSameView(this.job)) this.cancelJob();
        else return;
      }
      let step;
      if (sameView) {
        step = STATIC_STEPS.find((s) => s < latest.step);
        if (step === undefined) return;
      } else {
        step = latest ? Math.min(2, this.animStep) : STATIC_STEPS[0];
      }
      this.startJob(this.view, step);
    },
    isAutoOut() {
      return this.phase === 'out' && !this.paused && !this.manualAnim;
    },
    isSameView(img) {
      return (
        img.view.cx === this.view.cx &&
        img.view.cy === this.view.cy &&
        img.view.width === this.view.width &&
        img.canvasW === this.canvasW &&
        img.canvasH === this.canvasH
      );
    },

    // ---- 描画 ----

    resizeCanvas() {
      const canvas = this.$refs.canvas;
      const wrap = this.$refs.wrap;
      if (!canvas || !wrap) return;
      const cssW = Math.max(1, Math.floor(wrap.clientWidth));
      // スマホでは正方形、PC では横長にする
      const cssH = Math.round(cssW * (cssW < 560 ? 1 : 0.625));
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(cssW * dpr);
      const h = Math.round(cssH * dpr);
      canvas.style.height = `${cssH}px`;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        this.canvasW = w;
        this.canvasH = h;
        if (this.job) this.cancelJob();
      }
      this.needsDraw = true;
    },
    draw() {
      const canvas = this.$refs.canvas;
      if (!canvas || !this.canvasW) return;
      const ctx = canvas.getContext('2d');
      const inside = this.lut[this.lut.length - 1];
      ctx.fillStyle = `rgb(${inside & 255}, ${(inside >> 8) & 255}, ${(inside >> 16) & 255})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      // 縮小中に端が欠けないよう、全体表示の画像を下に敷く
      if (this.homeImage && this.homeImage !== this.latest && this.view.width > HOME_VIEW.width / 32) {
        this.drawImageAt(ctx, this.homeImage);
      }
      if (this.latest) this.drawImageAt(ctx, this.latest);
      // 止まっているときは計算中の画像も届いた行から重ねる
      const job = this.job;
      if (job && !job.animating && this.isSameView(job)) this.drawImageAt(ctx, job);
    },
    // 別の表示範囲で計算した画像を、現在の表示範囲に合わせて拡大・縮小して描く
    drawImageAt(ctx, img) {
      const W = this.canvasW;
      const H = this.canvasH;
      const { gw, gh, width: imgWidth } = img.params;
      const unit = this.view.width / W; // 1 デバイスピクセルあたりの複素平面上の長さ
      const imgUnit = imgWidth / gw; // 画像 1 ピクセルあたりの長さ
      const viewLeft = this.view.cx - (W / 2) * unit;
      const viewTop = this.view.cy + (H / 2) * unit;
      const imgLeft = img.params.cx - (gw / 2) * imgUnit;
      const imgTop = img.params.cy + (gh / 2) * imgUnit;
      // 画像の左上の描画先座標と拡大率
      const dx = (imgLeft - viewLeft) / unit;
      const dy = (viewTop - imgTop) / unit;
      const k = imgUnit / unit;
      // 画面からはみ出す部分を切り取ってから描く（大きく拡大したときの負荷を抑える）
      const sx0 = Math.max(0, -dx / k);
      const sy0 = Math.max(0, -dy / k);
      const sx1 = Math.min(gw, (W - dx) / k);
      const sy1 = Math.min(gh, (H - dy) / k);
      if (sx1 <= sx0 || sy1 <= sy0) return;
      ctx.drawImage(
        img.canvas,
        sx0, sy0, sx1 - sx0, sy1 - sy0,
        dx + sx0 * k, dy + sy0 * k, (sx1 - sx0) * k, (sy1 - sy0) * k,
      );
    },

    // ---- 操作 ----

    togglePause() {
      this.paused = !this.paused;
      this.atLimit = false;
    },
    reset() {
      this.manualAnim = null;
      this.resumeFromManual = false;
      this.atLimit = false;
      this.spotIndex = 0;
      this.setView({ ...HOME_VIEW });
      this.viewChanged = true;
      this.setPhase('intro');
    },
    zoomOutStep() {
      this.stopAutoForManual();
      this.atLimit = false;
      this.animateTo({ cx: this.view.cx, cy: this.view.cy, width: this.view.width * CLICK_ZOOM });
    },
    // 画面上の座標（CSS ピクセル）を複素平面上の点に変換する
    toComplex(clientX, clientY) {
      const rect = this.$refs.canvas.getBoundingClientRect();
      const unit = this.view.width / rect.width;
      return {
        x: this.view.cx + (clientX - rect.left - rect.width / 2) * unit,
        y: this.view.cy - (clientY - rect.top - rect.height / 2) * unit,
      };
    },
    onClick(e) {
      if (performance.now() < this.suppressClickUntil) return;
      this.stopAutoForManual();
      const p = this.toComplex(e.clientX, e.clientY);
      if (this.view.width <= MIN_WIDTH * 1.0001) {
        this.atLimit = true;
        this.animateTo({ cx: p.x, cy: p.y, width: this.view.width });
        return;
      }
      this.animateTo({ cx: p.x, cy: p.y, width: this.view.width / CLICK_ZOOM });
    },
    // 点 p を画面上で動かさずに factor 倍に拡大（<1 で縮小）する
    zoomAround(p, factor) {
      const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, this.view.width / factor));
      const s = width / this.view.width;
      this.manualAnim = null;
      this.setView({ cx: p.x + (this.view.cx - p.x) * s, cy: p.y + (this.view.cy - p.y) * s, width });
      this.atLimit = width <= MIN_WIDTH * 1.0001;
      this.viewChanged = true;
    },
    onWheelNative(e) {
      e.preventDefault();
      this.stopAutoForManual();
      // deltaMode が行単位のときはピクセルに換算する
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      this.zoomAround(this.toComplex(e.clientX, e.clientY), Math.exp(-delta * 0.002));
    },
    onPointerDown(e) {
      if (e.pointerType !== 'touch') return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
        this.stopAutoForManual();
      }
    },
    onPointerMove(e) {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!this.pinch || this.pointers.size !== 2) return;
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinch.dist > 0 && dist > 0) {
        const mid = this.toComplex((a.x + b.x) / 2, (a.y + b.y) / 2);
        this.zoomAround(mid, dist / this.pinch.dist);
      }
      this.pinch.dist = dist;
    },
    onPointerUp(e) {
      this.pointers.delete(e.pointerId);
      if (this.pinch && this.pointers.size < 2) {
        this.pinch = null;
        // ピンチの指を離したときのタップ扱いを防ぐ
        this.suppressClickUntil = performance.now() + 400;
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
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
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
  font-size: 1.15rem;
  font-weight: bold;
  overflow-wrap: anywhere;
}

.stat-value.coord {
  font-size: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  column-gap: 0.25rem;
}

.stat-value sup {
  font-size: 0.7em;
}

@media (max-width: 559px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-center {
    grid-column: 1 / -1;
  }
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
  min-width: 8.5rem;
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

.picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.picker-label {
  margin-right: 0.15rem;
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
}

.fractal-canvas {
  display: block;
  width: 100%;
  border-radius: 0.375rem;
  cursor: zoom-in;
  /* 縦スクロールはブラウザに任せ、ピンチは自前で処理する */
  touch-action: pan-y;
}

.status {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.9rem;
  min-height: 1.4em;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
}
</style>
