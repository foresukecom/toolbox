<template>
  <div class="dev-tool cat-number">
    <!-- 世代数・生存セル数 -->
    <div class="stats">
      <div class="stat">
        <span class="stat-label">世代</span>
        <span class="stat-value">{{ generation.toLocaleString() }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">生存セル</span>
        <span class="stat-value">{{ population.toLocaleString() }}</span>
      </div>
      <div class="status" aria-live="polite">{{ statusText }}</div>
    </div>

    <!-- 盤面 -->
    <div ref="boardWrap" class="board-wrap">
      <canvas
        ref="canvas"
        class="board"
        role="img"
        :aria-label="`ライフゲームの盤面（${cols}×${rows}）`"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @click="onClick"
      ></canvas>
    </div>
    <p class="hint text-center mt-1">セルをクリック（タップ）すると生死を反転できます。</p>

    <!-- 基本操作 -->
    <div class="controls actions">
      <button type="button" class="action primary" @click="toggleRunning">{{ running ? '一時停止' : '再開' }}</button>
      <button type="button" class="action" @click="stepOnce">1世代進める</button>
      <button type="button" class="action" @click="randomize">ランダム</button>
      <button type="button" class="action" @click="clearBoard">クリア</button>
    </div>

    <div class="controls">
      <div class="picker" role="radiogroup" aria-label="速度">
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
      <div class="picker" role="radiogroup" aria-label="盤面サイズ">
        <span class="picker-label">サイズ</span>
        <button
          v-for="opt in sizeOptions"
          :key="opt.value"
          type="button"
          role="radio"
          class="pill"
          :class="{ active: size === opt.value }"
          :aria-checked="size === opt.value"
          @click="changeSize(opt.value)"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div class="controls">
      <label class="inline-flex items-center gap-2">
        プリセット
        <select v-model="presetKey" class="border rounded-md p-1" @change="placePreset(presetKey)">
          <option value="">（選択）</option>
          <option v-for="p in presetOptions" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
      </label>
      <label class="inline-flex items-center gap-2">
        <input v-model="autoRestart" type="checkbox" />
        自動リスタート
      </label>
    </div>
    <p class="hint text-center">自動リスタート: ランダム盤面が静止・周期的な振動だけになるか、ほぼ全滅したら新しいランダム盤面に切り替えます。</p>

    <!-- 色の凡例 -->
    <div class="legend">
      <span v-for="item in legend" :key="item.label" class="legend-item">
        <span class="legend-swatch" :style="{ backgroundColor: item.color }"></span>{{ item.label }}
      </span>
    </div>

    <section class="mt-6">
      <h2 class="section-title">ルール（B3/S23）</h2>
      <ul class="rules">
        <li>死んでいるセルの周囲 8 マスにちょうど 3 つの生きたセルがあれば、次の世代で誕生します。</li>
        <li>生きているセルは、周囲の生きたセルが 2 つか 3 つなら生き残り、それ以外なら死にます（過疎・過密）。</li>
        <li>盤面の端は上下・左右がつながっています（トーラス）。</li>
      </ul>
    </section>
  </div>
</template>

<script>
const STORAGE_KEY = 'toolbox.gameOfLife.settings';

// 盤面サイズ（列 × 行）
const SIZES = {
  small: { cols: 40, rows: 25 },
  medium: { cols: 80, rows: 50 },
  large: { cols: 160, rows: 100 },
};
const SIZE_OPTIONS = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
];
// 1 秒あたりの世代数
const SPEED_OPTIONS = [
  { value: 4, label: 'ゆっくり' },
  { value: 10, label: '普通' },
  { value: 24, label: '速い' },
  { value: 60, label: '最速' },
];
// 1 フレームで進める世代数の上限（タブ復帰時などにまとめて計算しないため）
const MAX_STEPS_PER_FRAME = 4;
// ランダム配置の密度
const RANDOM_DENSITY = 0.3;
// 消えたセルの残像が残る世代数
const FADE_MAX = 6;
// 年齢による色の段階数（これ以上は同じ色）
const AGE_MAX = 64;
// 停滞を検出してから新しい盤面に切り替えるまでの待ち時間 (ms)
const RESTART_DELAY = 2000;
// 生存数の推移で周期性を調べる窓の長さと最大周期
const POP_WINDOW = 200;
const POP_MAX_PERIOD = 30;

// 色: 誕生直後 → 若い → 長寿 の順に補間する
const AGE_STOPS = [
  { age: 1, rgb: [245, 158, 11] },   // 誕生（アンバー）
  { age: 3, rgb: [16, 185, 129] },   // 若い（エメラルド）
  { age: 12, rgb: [37, 99, 235] },   // 中年（ブルー）
  { age: AGE_MAX, rgb: [76, 29, 149] }, // 長寿（バイオレット）
];
const BG_RGB = [248, 250, 252];
const FADE_RGB = [165, 180, 252];
const GRID_COLOR = 'rgba(148, 163, 184, 0.22)';

// 有名なパターン（O = 生きたセル）。at は配置位置の目安（盤面に対する比率）
const PRESETS = [
  { key: 'glider', label: 'グライダー', at: [0.15, 0.15], rows: ['.O.', '..O', 'OOO'] },
  {
    key: 'lwss',
    label: '軽量級宇宙船',
    at: [0.1, 0.5],
    rows: ['.O..O', 'O....', 'O...O', 'OOOO.'],
  },
  {
    key: 'gosper',
    label: 'グライダー銃（ゴスパー）',
    at: [0.02, 0.06],
    rows: [
      '........................O...........',
      '......................O.O...........',
      '............OO......OO............OO',
      '...........O...O....OO............OO',
      'OO........O.....O...OO..............',
      'OO........O...O.OO....O.O...........',
      '..........O.....O.......O...........',
      '...........O...O....................',
      '............OO......................',
    ],
  },
  {
    key: 'pulsar',
    label: 'パルサー',
    at: [0.5, 0.5],
    rows: [
      '..OOO...OOO..',
      '.............',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '..OOO...OOO..',
      '.............',
      '..OOO...OOO..',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '.............',
      '..OOO...OOO..',
    ],
  },
  { key: 'acorn', label: 'どんぐり（Acorn）', at: [0.5, 0.5], rows: ['.O.....', '...O...', 'OO..OOO'] },
  { key: 'rpentomino', label: 'R-ペントミノ', at: [0.5, 0.5], rows: ['.OO', 'OO.', '.O.'] },
  { key: 'diehard', label: 'ダイハード', at: [0.5, 0.5], rows: ['......O.', 'OO......', '.O...OOO'] },
];

// ---- ここから盤面計算（Vue に依存しない純粋関数） ----

// B3/S23 で 1 世代進める。cur を読んで next に書き込み、生存セル数を返す（端はトーラス）
function stepLife(cur, next, w, h) {
  let alive = 0;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    const up = (y === 0 ? h - 1 : y - 1) * w;
    const down = (y === h - 1 ? 0 : y + 1) * w;
    for (let x = 0; x < w; x++) {
      const l = x === 0 ? w - 1 : x - 1;
      const r = x === w - 1 ? 0 : x + 1;
      const n =
        cur[up + l] + cur[up + x] + cur[up + r] +
        cur[row + l] + cur[row + r] +
        cur[down + l] + cur[down + x] + cur[down + r];
      const v = n === 3 || (n === 2 && cur[row + x] === 1) ? 1 : 0;
      next[row + x] = v;
      alive += v;
    }
  }
  return alive;
}

// 盤面のハッシュ（FNV-1a 32bit）。周期 1・2 の検出に使う
function hashCells(cells) {
  let h = 0x811c9dc5;
  for (let i = 0; i < cells.length; i++) {
    h ^= cells[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ---- ここまで盤面計算 ----

// 色 (r, g, b) を ImageData の Uint32 表現（リトルエンディアン: ABGR）に変換
function packColor([r, g, b]) {
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function lerpRgb(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

// 年齢 → 色の対応表
function buildAgePalette() {
  const palette = new Uint32Array(AGE_MAX + 1);
  for (let age = 1; age <= AGE_MAX; age++) {
    let k = 0;
    while (k < AGE_STOPS.length - 2 && age > AGE_STOPS[k + 1].age) k++;
    const s0 = AGE_STOPS[k];
    const s1 = AGE_STOPS[k + 1];
    const t = Math.min(Math.max((age - s0.age) / (s1.age - s0.age), 0), 1);
    palette[age] = packColor(lerpRgb(s0.rgb, s1.rgb, t));
  }
  return palette;
}

// 残像の濃さ → 色の対応表（0 は背景色）
function buildFadePalette() {
  const palette = new Uint32Array(FADE_MAX + 1);
  for (let f = 0; f <= FADE_MAX; f++) {
    palette[f] = packColor(lerpRgb(BG_RGB, FADE_RGB, (f / FADE_MAX) * 0.85));
  }
  return palette;
}

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

export default {
  name: 'GameOfLife',
  data() {
    const saved = loadSettings();
    const defaultSpeed = prefersReducedMotion() ? 4 : 10;
    return {
      size: SIZES[saved.size] ? saved.size : 'medium',
      speed: SPEED_OPTIONS.some((o) => o.value === saved.speed) ? saved.speed : defaultSpeed,
      autoRestart: typeof saved.autoRestart === 'boolean' ? saved.autoRestart : true,
      running: true,
      generation: 0,
      population: 0,
      // 'random' | 'preset' | 'manual'（自動リスタートはランダム盤面のときだけ働く）
      source: 'random',
      presetKey: '',
      // 停滞の種類: null | 'extinct' | 'sparse' | 'still' | 'oscillating' | 'cyclic'
      stagnation: null,
      restartAt: 0,
      speedOptions: SPEED_OPTIONS,
      sizeOptions: SIZE_OPTIONS,
      presetOptions: PRESETS.map(({ key, label }) => ({ key, label })),
      legend: [
        { label: '誕生', color: 'rgb(245, 158, 11)' },
        { label: '若い', color: 'rgb(16, 185, 129)' },
        { label: '中年', color: 'rgb(37, 99, 235)' },
        { label: '長寿', color: 'rgb(76, 29, 149)' },
        { label: '残像', color: 'rgb(178, 190, 251)' },
      ],
    };
  },
  computed: {
    cols() {
      return SIZES[this.size].cols;
    },
    rows() {
      return SIZES[this.size].rows;
    },
    statusText() {
      const labels = {
        extinct: '全滅しました',
        sparse: 'ほとんどのセルが消えました',
        still: '静止しました',
        oscillating: '振動だけになりました',
        cyclic: '周期的な動きだけになりました',
      };
      if (!this.stagnation) return this.running ? '' : '一時停止中';
      const base = labels[this.stagnation];
      return this.restartAt ? `${base} → まもなく新しい盤面へ` : base;
    },
  },
  watch: {
    speed() {
      this.saveSettings();
    },
    autoRestart(val) {
      this.saveSettings();
      if (!val) this.restartAt = 0;
      else this.scheduleRestartIfNeeded();
    },
  },
  created() {
    // 大きな配列はリアクティブにしない（Proxy を通さず高速に扱う）
    this.agePalette = buildAgePalette();
    this.fadePalette = buildFadePalette();
    this.rafId = null;
    this.lastTime = 0;
    this.acc = 0;
    this.cellPx = 1;
    this.painting = false;
    this.paintValue = 1;
    this.lastPointerType = 'mouse';
    this.allocate();
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext('2d');
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.$refs.boardWrap);
    this.resize();
    this.randomize();
    this.rafId = requestAnimationFrame(this.loop);
  },
  beforeUnmount() {
    cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
  },
  methods: {
    // 盤面サイズに合わせて配列を確保する
    allocate() {
      const n = this.cols * this.rows;
      this.cells = new Uint8Array(n);
      this.nextCells = new Uint8Array(n);
      this.age = new Uint8Array(n);
      this.fade = new Uint8Array(n);
      // 盤面と同じ解像度の画像（1 セル = 1 ピクセル）を作って拡大描画する
      this.offscreen = document.createElement('canvas');
      this.offscreen.width = this.cols;
      this.offscreen.height = this.rows;
      this.offCtx = this.offscreen.getContext('2d');
      this.imageData = this.offCtx.createImageData(this.cols, this.rows);
      this.pixels = new Uint32Array(this.imageData.data.buffer);
    },
    // 世代・停滞検出の状態をリセットする
    resetHistory() {
      this.generation = 0;
      this.hashHistory = [];
      this.popHistory = [];
      this.stagnation = null;
      this.restartAt = 0;
      this.age.fill(0);
      this.fade.fill(0);
      // 初期配置のセルは「誕生」扱いにする
      for (let i = 0; i < this.cells.length; i++) {
        if (this.cells[i]) this.age[i] = 1;
      }
      this.population = this.countAlive();
    },
    countAlive() {
      let c = 0;
      for (let i = 0; i < this.cells.length; i++) c += this.cells[i];
      return c;
    },
    randomize() {
      for (let i = 0; i < this.cells.length; i++) {
        this.cells[i] = Math.random() < RANDOM_DENSITY ? 1 : 0;
      }
      this.source = 'random';
      this.presetKey = '';
      this.resetHistory();
      this.render();
    },
    clearBoard() {
      this.cells.fill(0);
      this.source = 'manual';
      this.presetKey = '';
      this.resetHistory();
      this.render();
    },
    placePreset(key) {
      const preset = PRESETS.find((p) => p.key === key);
      if (!preset) return;
      const pw = preset.rows[0].length;
      const ph = preset.rows.length;
      // 位置の目安（比率）から左上の座標を決める。中央寄せのものはパターンの中心を合わせる
      const centered = preset.at[0] === 0.5;
      const ox = Math.max(0, Math.round(preset.at[0] * this.cols - (centered ? pw / 2 : 0)));
      const oy = Math.max(0, Math.round(preset.at[1] * this.rows - (centered ? ph / 2 : 0)));
      this.cells.fill(0);
      preset.rows.forEach((line, y) => {
        for (let x = 0; x < line.length; x++) {
          if (line[x] === 'O') this.cells[((oy + y) % this.rows) * this.cols + ((ox + x) % this.cols)] = 1;
        }
      });
      this.source = 'preset';
      this.resetHistory();
      this.render();
    },
    changeSize(size) {
      if (this.size === size) return;
      this.size = size;
      this.saveSettings();
      this.allocate();
      this.resize();
      if (this.source === 'preset' && this.presetKey) this.placePreset(this.presetKey);
      else this.randomize();
    },
    toggleRunning() {
      this.running = !this.running;
      this.lastTime = 0;
      this.acc = 0;
      if (this.running) this.scheduleRestartIfNeeded();
      else this.restartAt = 0;
    },
    stepOnce() {
      this.running = false;
      this.restartAt = 0;
      this.advance();
      this.render();
    },
    // 1 世代進め、年齢・残像・停滞検出を更新する
    advance() {
      const cur = this.cells;
      const next = this.nextCells;
      const alive = stepLife(cur, next, this.cols, this.rows);
      const age = this.age;
      const fade = this.fade;
      for (let i = 0; i < next.length; i++) {
        if (next[i]) {
          age[i] = cur[i] ? Math.min(age[i] + 1, AGE_MAX) : 1;
          fade[i] = 0;
        } else {
          if (cur[i]) fade[i] = FADE_MAX;
          else if (fade[i] > 0) fade[i]--;
          age[i] = 0;
        }
      }
      this.cells = next;
      this.nextCells = cur;
      this.generation++;
      this.population = alive;
      this.detectStagnation(alive);
    },
    // 盤面が静止・振動・ほぼ全滅になったかを調べる
    detectStagnation(alive) {
      if (this.stagnation) return;
      const total = this.cells.length;
      let kind = null;
      if (alive === 0) kind = 'extinct';
      else if (alive < Math.max(4, total * 0.003)) kind = 'sparse';
      else {
        // 周期 1・2: 盤面のハッシュを直近 2 世代と比べる
        const h = hashCells(this.cells);
        const hist = this.hashHistory;
        if (hist[hist.length - 1] === h) kind = 'still';
        else if (hist[hist.length - 2] === h) kind = 'oscillating';
        hist.push(h);
        if (hist.length > 2) hist.shift();
        // 長めの周期やグライダーだけが残った状態: 生存数の推移が周期的なら停滞とみなす
        const pops = this.popHistory;
        pops.push(alive);
        if (pops.length > POP_WINDOW + POP_MAX_PERIOD) pops.shift();
        if (!kind && pops.length === POP_WINDOW + POP_MAX_PERIOD && this.generation % 10 === 0) {
          if (this.isPopulationPeriodic(pops)) kind = 'cyclic';
        }
      }
      if (kind) {
        this.stagnation = kind;
        this.scheduleRestartIfNeeded();
      }
    },
    isPopulationPeriodic(pops) {
      const n = pops.length;
      for (let p = 1; p <= POP_MAX_PERIOD; p++) {
        let ok = true;
        for (let i = n - POP_WINDOW; i < n; i++) {
          if (pops[i] !== pops[i - p]) {
            ok = false;
            break;
          }
        }
        if (ok) return true;
      }
      return false;
    },
    scheduleRestartIfNeeded() {
      if (this.stagnation && this.autoRestart && this.source === 'random' && this.running && !this.restartAt) {
        this.restartAt = performance.now() + RESTART_DELAY;
      }
    },
    loop(now) {
      this.rafId = requestAnimationFrame(this.loop);
      if (!this.running) return;
      if (this.restartAt && now >= this.restartAt) {
        this.randomize();
        return;
      }
      // 停滞して切り替え待ちの間も盤面は動かし続ける（振動が見える）
      if (!this.lastTime) this.lastTime = now;
      this.acc += now - this.lastTime;
      this.lastTime = now;
      const interval = 1000 / this.speed;
      let steps = 0;
      while (this.acc >= interval && steps < MAX_STEPS_PER_FRAME) {
        this.advance();
        this.acc -= interval;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
      if (steps > 0) this.render();
    },
    // コンテナ幅に合わせてキャンバスの大きさを決める（セルは整数の物理ピクセルにそろえる）
    resize() {
      const wrap = this.$refs.boardWrap;
      const canvas = this.$refs.canvas;
      if (!wrap || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = wrap.clientWidth;
      this.cellPx = Math.max(1, Math.floor((cssWidth * dpr) / this.cols));
      canvas.width = this.cellPx * this.cols;
      canvas.height = this.cellPx * this.rows;
      canvas.style.width = `${canvas.width / dpr}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      this.buildGrid();
      this.render();
    },
    // セルの境界線を別キャンバスに描いておく（セルが十分大きいときだけ）
    buildGrid() {
      const canvas = this.$refs.canvas;
      this.gridCanvas = null;
      if (this.cellPx < 5) return;
      const g = document.createElement('canvas');
      g.width = canvas.width;
      g.height = canvas.height;
      const gctx = g.getContext('2d');
      gctx.fillStyle = GRID_COLOR;
      for (let x = 0; x <= this.cols; x++) gctx.fillRect(x * this.cellPx, 0, 1, g.height);
      for (let y = 0; y <= this.rows; y++) gctx.fillRect(0, y * this.cellPx, g.width, 1);
      this.gridCanvas = g;
    },
    render() {
      if (!this.ctx) return;
      const { cells, age, fade, pixels, agePalette, fadePalette } = this;
      for (let i = 0; i < cells.length; i++) {
        pixels[i] = cells[i] ? agePalette[age[i] || 1] : fadePalette[fade[i]];
      }
      this.offCtx.putImageData(this.imageData, 0, 0);
      const canvas = this.$refs.canvas;
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.offscreen, 0, 0, canvas.width, canvas.height);
      if (this.gridCanvas) this.ctx.drawImage(this.gridCanvas, 0, 0);
    },
    // ---- セルの反転（マウスはドラッグで連続描画、タッチはタップで反転） ----
    cellAt(event) {
      const rect = this.$refs.canvas.getBoundingClientRect();
      const x = Math.floor(((event.clientX - rect.left) / rect.width) * this.cols);
      const y = Math.floor(((event.clientY - rect.top) / rect.height) * this.rows);
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return -1;
      return y * this.cols + x;
    },
    setCell(i, value) {
      if (i < 0 || this.cells[i] === value) return;
      this.cells[i] = value;
      this.age[i] = value ? 1 : 0;
      this.fade[i] = value ? 0 : FADE_MAX;
      this.population += value ? 1 : -1;
      // 手で編集した盤面は自動リスタートの対象外にし、停滞判定もやり直す
      this.source = 'manual';
      this.presetKey = '';
      this.stagnation = null;
      this.restartAt = 0;
      this.hashHistory = [];
      this.popHistory = [];
      this.render();
    },
    onPointerDown(event) {
      this.lastPointerType = event.pointerType;
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      const i = this.cellAt(event);
      if (i < 0) return;
      this.painting = true;
      this.paintValue = this.cells[i] ? 0 : 1;
      this.$refs.canvas.setPointerCapture(event.pointerId);
      this.setCell(i, this.paintValue);
    },
    onPointerMove(event) {
      if (!this.painting) return;
      this.setCell(this.cellAt(event), this.paintValue);
    },
    onPointerUp() {
      this.painting = false;
    },
    onClick(event) {
      // マウスは pointerdown で処理済み。タッチ・ペンはタップで反転（スクロールを妨げない）
      if (this.lastPointerType === 'mouse') return;
      const i = this.cellAt(event);
      if (i >= 0) this.setCell(i, this.cells[i] ? 0 : 1);
    },
    saveSettings() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ size: this.size, speed: this.speed, autoRestart: this.autoRestart })
        );
      } catch (e) {
        // 保存できなくても動作には影響しない
      }
    },
  },
};
</script>

<style scoped>
.stats {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem 1.5rem;
  margin-bottom: 0.75rem;
}

.stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  min-width: 4ch;
}

.status {
  flex-basis: 100%;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  min-height: 1.25rem;
}

.board-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
}

.board {
  display: block;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: crosshair;
  box-sizing: content-box;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem 1.5rem;
  margin-top: 1rem;
}

.action {
  padding: 0.4rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  min-width: 5.5rem;
}

.actions {
  gap: 0.5rem;
}

/* スマホ幅では 2 列に並べる */
@media (max-width: 479px) {
  .actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.action:hover {
  border-color: var(--tb-main);
}

.action.primary {
  background-color: var(--tb-main);
  border-color: var(--tb-main);
  color: #fff;
}

.action.primary:hover {
  background-color: var(--tb-main-hover);
}

.picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.picker-label {
  font-size: 0.875rem;
  margin-right: 0.25rem;
}

.pill {
  padding: 0.2rem 0.7rem;
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

.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem 1rem;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.legend-swatch {
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 2px;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.section-title {
  font-weight: bold;
  font-size: 1.15rem;
  border-left: 4px solid var(--tb-main);
  padding-left: 0.5rem;
  margin-bottom: 0.75rem;
}

.rules {
  list-style: disc;
  padding-left: 1.5rem;
  line-height: 1.7;
}
</style>
