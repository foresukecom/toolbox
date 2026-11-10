<template>
  <div class="dev-tool cat-number constant-digits-view">
    <div class="constant-picker" role="radiogroup" aria-label="定数">
      <button
        v-for="c in constants"
        :key="c.key"
        type="button"
        role="radio"
        class="constant-option"
        :class="{ active: constantKey === c.key }"
        :aria-checked="constantKey === c.key"
        @click="selectConstant(c.key)"
      >{{ c.label }}</button>
    </div>

    <div class="controls">
      <div class="button-group">
        <button type="button" class="ctrl-button primary" @click="toggleRunning">
          {{ running ? '一時停止' : '再開' }}
        </button>
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
          @click="speed = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">小数点以下</div>
        <div class="summary-value">{{ total.toLocaleString() }}<span class="summary-unit">桁</span></div>
      </div>
      <div class="summary-item">
        <div class="summary-label">実効速度</div>
        <div class="summary-value">{{ actualRateText }}<span class="summary-unit">桁/秒</span></div>
      </div>
      <div class="summary-item">
        <div class="summary-label">10% との最大差</div>
        <div class="summary-value">{{ maxDeviationText }}</div>
      </div>
    </div>

    <div class="note-area" aria-live="polite">
      <p v-if="notes.length" :key="'note-' + notes[0].id" class="note-latest">
        <span class="note-pos">{{ notes[0].pos.toLocaleString() }}桁目</span>{{ notes[0].text }}
      </p>
      <p v-else class="note-placeholder">見どころに差しかかると、ここで一言お知らせします。</p>
      <ul v-if="notes.length > 1" class="note-history">
        <li v-for="note in notes.slice(1)" :key="note.id">
          <span class="note-pos">{{ note.pos.toLocaleString() }}桁目</span>{{ note.text }}
        </li>
      </ul>
    </div>

    <section class="mb-8">
      <h2 class="section-title">{{ constant.symbol }} = {{ headText }}</h2>
      <div ref="digitBox" class="digit-box" @scroll="onDigitScroll">
        <span class="cd-head">{{ headText }}</span>
        <p v-if="omittedGroups > 0" class="omitted">
          … 先頭の {{ (omittedGroups * 10).toLocaleString() }} 桁は省略（{{ (omittedGroups * 10 + 1).toLocaleString() }}桁目から表示）
        </p>
        <DigitGroup
          v-for="(text, i) in groups"
          :key="omittedGroups + i"
          :text="text"
          :start="(omittedGroups + i) * 10 + 1"
          :highlight="!current && i === groups.length - 1"
        />
        <DigitGroup
          v-if="current"
          :key="'current'"
          :text="current"
          :start="(omittedGroups + groups.length) * 10 + 1"
          :highlight="true"
        />
      </div>
      <p class="hint mt-2">
        {{ constant.method }}。ブラウザ上で実際に計算しながら表示しており、桁が進むほど計算が重くなります。区切りにマウスを乗せると何桁目か分かります。
      </p>
    </section>

    <section>
      <h2 class="section-title">0〜9 の出現回数</h2>
      <div class="chart" role="img" :aria-label="chartLabel">
        <div class="chart-plot">
          <div class="chart-ref" :style="{ bottom: refLineBottom }">
            <span class="chart-ref-label">10%</span>
          </div>
          <div v-for="bar in bars" :key="bar.digit" class="chart-col">
            <div class="chart-bar" :class="'bar-d' + bar.digit" :style="{ height: bar.height + '%' }"></div>
          </div>
        </div>
        <div class="chart-axis">
          <div v-for="bar in bars" :key="bar.digit" class="chart-tick">
            <div class="chart-digit" :class="'cd-d d' + bar.digit">{{ bar.digit }}</div>
            <div class="chart-count">{{ bar.count.toLocaleString() }}</div>
            <div class="chart-pct">{{ bar.pctText }}</div>
          </div>
        </div>
      </div>
      <p class="hint mt-2">{{ constant.normalNote }}</p>
    </section>
  </div>
</template>

<script>
import { h } from 'vue';
import { CONSTANTS, findConstant } from '@/utilities/constantDigits.js';

const STORAGE_KEY = 'toolbox.constantDigits.settings';
const SPEED_OPTIONS = [
  { value: 1, label: '1桁/秒' },
  { value: 10, label: '10桁/秒' },
  { value: 100, label: '100桁/秒' },
  { value: 0, label: '最速' },
];
// 1 フレームで計算に使ってよい時間 (ms)。これを超えたら次のフレームに持ち越す
const FRAME_BUDGET_MS = 10;
// 表示しておく 10 桁区切りの数（これを超えた古い桁は省略）
const MAX_GROUPS = 200;
// 一言メモを残しておく件数
const MAX_NOTES = 6;
// 棒グラフの上端に当たる割合 (%)
const CHART_MAX_PCT = 15;
// 到達を知らせる桁数
const MILESTONES = [100, 1000, 2000, 5000, 10000, 20000, 50000];

// 10 桁ぶんを 1 つの塊として描画する子コンポーネント。
// 中身が変わらない塊は再描画されないので、桁数が増えても描画コストが一定に保たれる
const DigitGroup = {
  name: 'DigitGroup',
  props: {
    text: { type: String, required: true },
    start: { type: Number, required: true },
    highlight: { type: Boolean, default: false },
  },
  render() {
    const last = this.text.length - 1;
    const children = [...this.text].map((c, i) => h('span', {
      class: ['cd-d', 'd' + c, this.highlight && i === last ? 'latest' : null],
    }, c));
    return h('span', {
      class: 'cd-group',
      title: `${this.start.toLocaleString()}〜${(this.start + last).toLocaleString()}桁目`,
    }, children);
  },
};

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export default {
  name: 'ConstantDigits',
  components: { DigitGroup },
  data() {
    const saved = loadSettings();
    return {
      constants: CONSTANTS,
      constantKey: findConstant(saved.constant).key,
      speedOptions: SPEED_OPTIONS,
      speed: SPEED_OPTIONS.some(opt => opt.value === saved.speed) ? saved.speed : 10,
      running: true,
      total: 0, // 小数点以下の桁数
      counts: Array(10).fill(0),
      groups: [], // 確定した 10 桁の塊（表示中のもの）
      current: '', // 書きかけの塊
      omittedGroups: 0, // 表示から省略した塊の数
      notes: [], // 新しい順
      actualRate: 0,
    };
  },
  computed: {
    constant() {
      return findConstant(this.constantKey);
    },
    headText() {
      return `${this.constant.intPart}.`;
    },
    actualRateText() {
      if (!this.running) return '—';
      return this.actualRate >= 100 ? Math.round(this.actualRate).toLocaleString() : this.actualRate.toFixed(1);
    },
    bars() {
      const total = this.total;
      return this.counts.map((count, digit) => {
        const pct = total ? (count / total) * 100 : 0;
        // CHART_MAX_PCT を棒の上端とする
        return {
          digit,
          count,
          pct,
          pctText: total ? pct.toFixed(1) + '%' : '—',
          height: Math.min(100, (pct / CHART_MAX_PCT) * 100),
        };
      });
    },
    // 10% の基準線の位置
    refLineBottom() {
      return (10 / CHART_MAX_PCT) * 100 + '%';
    },
    maxDeviationText() {
      if (!this.total) return '—';
      const dev = Math.max(...this.bars.map(bar => Math.abs(bar.pct - 10)));
      return dev.toFixed(2) + ' pt';
    },
    chartLabel() {
      return this.bars.map(bar => `${bar.digit}: ${bar.count}回 (${bar.pctText})`).join('、');
    },
  },
  watch: {
    speed() {
      this.owed = Math.min(this.owed, 1);
      this.saveSettings();
    },
  },
  created() {
    // 描画に関わらない作業用の状態はリアクティブにしない
    this.rafId = null;
    this.initState();
  },
  mounted() {
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  },
  beforeUnmount() {
    cancelAnimationFrame(this.rafId);
  },
  methods: {
    initState() {
      this.generator = this.constant.create();
      this.owed = 1; // 次のフレームで出すべき桁数（端数を持ち越す）。開始直後に 1 桁出す
      this.runDigit = -1;
      this.runLength = 0;
      this.runStart = 0;
      this.runNoteId = null;
      this.seenDigits = new Set();
      // 先頭 3 桁（整数部を含む有効数字）の並びと、その再登場を探すための直近 3 桁
      this.headSeq = this.constant.intPart > 0 ? String(this.constant.intPart) : '';
      this.last3 = '';
      this.seenHead = false;
      this.noteSeq = 0;
      this.rateSamples = [];
      this.stickToBottom = true;
    },
    frame(now) {
      const dt = Math.min(now - this.lastFrame, 1000);
      this.lastFrame = now;
      if (this.running) {
        let want;
        if (this.speed === 0) {
          want = Infinity;
        } else {
          // 端数を持ち越しつつ、溜まりすぎ（タブ復帰時など）は 0.5 秒分に抑える
          this.owed = Math.min(this.owed + (dt * this.speed) / 1000, Math.max(1, this.speed * 0.5));
          want = Math.floor(this.owed);
        }
        if (want > 0) {
          const digits = this.generator.take(want, performance.now() + FRAME_BUDGET_MS);
          if (this.speed !== 0) this.owed -= digits.length;
          if (digits.length) this.append(digits);
          this.recordRate(now, digits.length);
        } else {
          this.recordRate(now, 0);
        }
      }
      this.rafId = requestAnimationFrame(this.frame);
    },
    // 計算した桁をまとめて表示用の状態に反映する（リアクティブな更新は 1 フレーム 1 回）
    append(digits) {
      const counts = this.counts.slice();
      const newGroups = [];
      let current = this.current;
      let pos = this.total;
      for (const d of digits) {
        pos += 1;
        counts[d] += 1;
        current += d;
        if (current.length === 10) {
          newGroups.push(current);
          current = '';
        }
        this.checkNotes(pos, d);
      }
      this.counts = counts;
      this.total = pos;
      this.current = current;
      if (newGroups.length) {
        const groups = this.groups.concat(newGroups);
        const overflow = groups.length - MAX_GROUPS;
        if (overflow > 0) {
          groups.splice(0, overflow);
          this.omittedGroups += overflow;
        }
        this.groups = groups;
      }
      this.$nextTick(this.scrollDigits);
    },
    checkNotes(pos, d) {
      // 同じ数字の連続
      if (d === this.runDigit) {
        this.runLength += 1;
      } else {
        this.runDigit = d;
        this.runLength = 1;
        this.runStart = pos;
        this.runNoteId = null;
      }
      if (this.runLength >= 4) {
        const text = `「${String(d).repeat(this.runLength)}」同じ数字が ${this.runLength} 連続（${this.runStart.toLocaleString()}桁目から）`;
        if (this.runNoteId !== null && this.notes.length && this.notes[0].id === this.runNoteId) {
          // 同じ連続が伸びたときは直前の一言を書き換える
          this.notes[0] = { ...this.notes[0], pos, text };
          this.notes = this.notes.slice();
        } else {
          this.runNoteId = this.addNote(pos, text);
        }
      }

      // 0〜9 が出揃った
      if (!this.seenDigits.has(d)) {
        this.seenDigits.add(d);
        if (this.seenDigits.size === 10) {
          this.addNote(pos, `初めての「${d}」が登場。これで 0〜9 のすべての数字が出揃いました。`);
        }
      }

      // 先頭と同じ 3 桁の並びの再登場（整数部が 0 のときは小数部の先頭 3 桁）
      if (this.headSeq.length < 3) this.headSeq += d;
      this.last3 = (this.last3 + d).slice(-3);
      const minStart = this.constant.intPart > 0 ? 1 : 2;
      if (!this.seenHead && pos - 2 >= minStart && this.last3 === this.headSeq) {
        this.seenHead = true;
        this.addNote(pos, `${this.constant.symbol} の頭と同じ並び「${this.headSeq}」が初めて再登場（${(pos - 2).toLocaleString()}桁目から）`);
      }

      // 定数ごとの豆知識
      for (const note of this.constant.notes) {
        if (note.pos === pos) this.addNote(pos, note.text);
      }
      if (MILESTONES.includes(pos)) {
        this.addNote(pos, `${pos.toLocaleString()}桁に到達しました。`);
      }
    },
    addNote(pos, text) {
      const id = ++this.noteSeq;
      this.notes = [{ id, pos, text }, ...this.notes].slice(0, MAX_NOTES);
      return id;
    },
    // 直近 1 秒間に出した桁数から実効速度を求める
    recordRate(now, count) {
      const samples = this.rateSamples;
      samples.push([now, count]);
      while (samples.length && now - samples[0][0] > 1000) samples.shift();
      const span = samples.length > 1 ? now - samples[0][0] : 0;
      const sum = samples.reduce((acc, s) => acc + s[1], 0);
      const rate = span > 0 ? (sum * 1000) / Math.max(span, 1000 / 60) : 0;
      // 毎フレーム書き換えると表示がちらつくので、0.25 秒ごとに更新
      if (!this.rateUpdatedAt || now - this.rateUpdatedAt > 250) {
        this.actualRate = rate;
        this.rateUpdatedAt = now;
      }
    },
    onDigitScroll() {
      const box = this.$refs.digitBox;
      if (!box) return;
      // ユーザーが上へスクロールしている間は自動スクロールしない
      this.stickToBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 24;
    },
    scrollDigits() {
      const box = this.$refs.digitBox;
      if (box && this.stickToBottom) box.scrollTop = box.scrollHeight;
    },
    toggleRunning() {
      this.running = !this.running;
      if (this.running) {
        this.owed = Math.max(this.owed, 1);
        this.rateSamples = [];
      }
    },
    selectConstant(key) {
      if (key === this.constantKey) return;
      this.constantKey = key;
      this.saveSettings();
      this.reset();
    },
    reset() {
      this.initState();
      this.total = 0;
      this.counts = Array(10).fill(0);
      this.groups = [];
      this.current = '';
      this.omittedGroups = 0;
      this.notes = [];
      this.actualRate = 0;
      this.running = true;
    },
    saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed: this.speed, constant: this.constantKey }));
      } catch (e) {
        // 保存できなくても動作には影響しない
      }
    },
  },
};
</script>

<style scoped>
.constant-picker {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.constant-option {
  padding: 0.35rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: #fff;
}

.constant-option:hover {
  border-color: var(--tb-main);
}

.constant-option.active {
  border-color: var(--tb-main);
  background: #fdf2f1;
  color: var(--tb-main);
  font-weight: bold;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem 1rem;
  margin-bottom: 1.5rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

.ctrl-button {
  padding: 0.35rem 1rem;
  border: 1px solid var(--tb-main);
  border-radius: 0.375rem;
  color: var(--tb-main);
  background: #fff;
  min-width: 6.5rem;
}

.ctrl-button:hover {
  background: #fdf2f1;
}

.ctrl-button.primary {
  background: var(--tb-main);
  color: #fff;
}

.ctrl-button.primary:hover {
  background: var(--tb-main-hover);
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

.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.summary-item {
  border: 1px solid var(--tb-border);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  text-align: center;
}

.summary-label {
  color: #6b7280;
  font-size: 0.75rem;
}

.summary-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.5rem;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.summary-unit {
  font-size: 0.8rem;
  font-weight: normal;
  margin-left: 0.15rem;
}

.note-area {
  min-height: 3.5rem;
  margin-bottom: 1.5rem;
}

.note-latest {
  background: #fdf2f1;
  border-left: 4px solid var(--tb-main);
  border-radius: 0.25rem;
  padding: 0.5rem 0.75rem;
  animation: note-in 0.5s ease-out;
}

.note-placeholder {
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
}

.note-history {
  margin-top: 0.5rem;
  padding-left: 0.75rem;
  color: #6b7280;
  font-size: 0.8rem;
}

.note-pos {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: bold;
  margin-right: 0.5rem;
}

@keyframes note-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

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

.digit-box {
  max-height: 22rem;
  overflow-y: auto;
  border: 1px solid var(--tb-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: #fcfcfc;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.05rem;
  line-height: 1.7;
  word-break: break-all;
}

.cd-head {
  font-weight: bold;
  margin-right: 0.25rem;
}

.omitted {
  color: #9ca3af;
  font-size: 0.8rem;
  font-family: system-ui, sans-serif;
  margin: 0.25rem 0;
}

.chart {
  max-width: 640px;
  margin: 0 auto;
}

.chart-plot {
  position: relative;
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 0.4rem;
  height: 180px;
  border-bottom: 1px solid #9ca3af;
}

.chart-col {
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.chart-bar {
  width: 100%;
  border-radius: 0.25rem 0.25rem 0 0;
  transition: height 0.3s ease-out;
}

.chart-ref {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed #6b7280;
  pointer-events: none;
  z-index: 1;
}

.chart-ref-label {
  position: absolute;
  right: 0;
  top: -1.1rem;
  font-size: 0.7rem;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.8);
  padding: 0 0.2rem;
}

.chart-axis {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 0.4rem;
  margin-top: 0.25rem;
  text-align: center;
}

.chart-digit {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.1rem;
  font-weight: bold;
}

.chart-count,
.chart-pct {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  color: #4b5563;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .summary-value {
    font-size: 1.1rem;
  }

  .chart-plot,
  .chart-axis {
    gap: 0.2rem;
  }

  .chart-count,
  .chart-pct {
    font-size: 0.6rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .note-latest {
    animation: none;
  }

  .chart-bar {
    transition: none;
  }
}
</style>

<style>
/* 子コンポーネント（DigitGroup）の中身にも効かせるため scoped にしない */
.constant-digits-view .cd-group {
  display: inline-block;
  margin-right: 0.6em;
  white-space: nowrap;
}

.constant-digits-view .cd-d {
  display: inline-block;
}

.constant-digits-view .cd-d.latest {
  font-weight: bold;
  transform: scale(1.3);
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
  animation: cd-digit-pop 0.4s ease-out;
}

@keyframes cd-digit-pop {
  from { transform: scale(2); opacity: 0.2; }
  to { transform: scale(1.3); opacity: 1; }
}

.constant-digits-view .d0 { color: #dc2626; }
.constant-digits-view .d1 { color: #c2410c; }
.constant-digits-view .d2 { color: #a16207; }
.constant-digits-view .d3 { color: #15803d; }
.constant-digits-view .d4 { color: #0f766e; }
.constant-digits-view .d5 { color: #0369a1; }
.constant-digits-view .d6 { color: #1d4ed8; }
.constant-digits-view .d7 { color: #6d28d9; }
.constant-digits-view .d8 { color: #a21caf; }
.constant-digits-view .d9 { color: #be185d; }

.constant-digits-view .bar-d0 { background: #f87171; }
.constant-digits-view .bar-d1 { background: #fb923c; }
.constant-digits-view .bar-d2 { background: #facc15; }
.constant-digits-view .bar-d3 { background: #4ade80; }
.constant-digits-view .bar-d4 { background: #2dd4bf; }
.constant-digits-view .bar-d5 { background: #38bdf8; }
.constant-digits-view .bar-d6 { background: #60a5fa; }
.constant-digits-view .bar-d7 { background: #a78bfa; }
.constant-digits-view .bar-d8 { background: #e879f9; }
.constant-digits-view .bar-d9 { background: #f472b6; }

@media (prefers-reduced-motion: reduce) {
  .constant-digits-view .cd-d.latest {
    animation: none;
  }
}
</style>
