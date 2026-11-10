<template>
  <!-- リング: 円形のプログレス -->
  <div v-if="variant === 'ring'" class="ring-item">
    <svg class="ring-svg" viewBox="0 0 120 120" role="img" :aria-label="ariaLabel">
      <circle class="ring-track" cx="60" cy="60" :r="ringRadius" />
      <circle
        class="ring-fill"
        :class="{ 'no-transition': instant }"
        cx="60"
        cy="60"
        :r="ringRadius"
        :stroke-dasharray="ringCircumference"
        :stroke-dashoffset="ringCircumference * (1 - ratio)"
      />
      <text class="ring-percent" x="60" y="60">{{ percentLabel }}</text>
    </svg>
    <div class="ring-caption">{{ currentVal }}{{ unit }} → {{ nextVal }}{{ unit }}</div>
  </div>

  <!-- それ以外: 横棒タイプ -->
  <div v-else class="progress-container flex items-center w-full sm:w-3/4 mx-auto" :class="{ 'is-minimal': variant === 'minimal' }">
    <div class="progress-value w-16 sm:w-24 text-right text-base sm:text-xl">{{ currentVal }}{{ unit }}</div>

    <!-- テキスト: 文字で描くバー -->
    <div v-if="variant === 'text'" class="text-bar flex-grow mx-2.5 my-2" role="img" :aria-label="ariaLabel">
      <span class="text-bar-body">[{{ textBar }}]</span>
      <span class="text-bar-percent">{{ percentLabel }}</span>
    </div>

    <!-- セグメント: 単位ごとのブロック -->
    <div v-else-if="variant === 'segment'" class="segment-bar flex flex-grow mx-2.5 my-2" :class="barHeight" role="img" :aria-label="ariaLabel">
      <div v-for="(fill, i) in segmentFills" :key="i" class="segment">
        <div class="segment-fill" :style="{ width: fill * 100 + '%' }"></div>
      </div>
    </div>

    <!-- ミニマル: 細い線 + 大きな数値 -->
    <div v-else-if="variant === 'minimal'" class="minimal-bar flex-grow mx-2.5 my-2" role="img" :aria-label="ariaLabel">
      <div class="minimal-percent">{{ percentLabel }}</div>
      <div class="minimal-track">
        <div class="minimal-fill" :class="{ 'no-transition': instant }" :style="{ width: ratio * 100 + '%' }"></div>
      </div>
    </div>

    <!-- 標準 / グラデーション / ストライプ -->
    <div v-else class="bar-track flex flex-grow overflow-hidden text-xs mx-2.5 my-2 rounded-full relative" :class="barHeight" role="img" :aria-label="ariaLabel">
      <div
        class="bar-fill text-xs font-medium text-center flex items-center justify-center whitespace-nowrap overflow-hidden"
        :class="['bar-' + variant, { 'no-transition': instant }]"
        :style="barFillStyle"
      >{{ percentLabel }}</div>
    </div>

    <div class="progress-value w-16 sm:w-24 text-right text-base sm:text-xl">{{ nextVal }}{{ unit }}</div>
  </div>
</template>

<script>
// テキストバーの部分ブロック (1/8 刻み)
const PARTIAL_BLOCKS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
const TEXT_BAR_WIDTH = 30;

export default {
  name: 'TimeProgress',
  props: {
    unit: {
      type: String,
      required: true
    },
    currentTime: {
      type: Number,
      required: true
    },
    totalTime: {
      type: Number,
      required: true
    },
    currentVal: {
      type: Number,
      required: true
    },
    nextVal: {
      type: Number,
      required: true
    },
    barHeight: {
      type: String,
      default: "h-5"  // デフォルトの高さをh-5とします。必要に応じて変更できます。
    },
    // standard / gradient / stripe / segment / ring / minimal / text
    variant: {
      type: String,
      default: 'standard'
    },
    // セグメント表示時のブロック数
    segments: {
      type: Number,
      default: 10
    },
    // パーセント表示の小数点以下の桁数
    decimals: {
      type: Number,
      default: 0
    },
  },
  data() {
    return {
      // 周期の切り替わり (100% → 0%) で逆方向にアニメーションしないようにする
      instant: false,
      ringRadius: 52,
    };
  },
  computed: {
    ratio() {
      if (!this.totalTime) return 0;
      return Math.min(Math.max(this.currentTime / this.totalTime, 0), 1);
    },
    percentLabel() {
      // 表示桁で切り捨て (四捨五入だと周期の終わり前に 100% と表示されてしまう)
      const factor = 10 ** this.decimals;
      return (Math.floor(this.ratio * 100 * factor) / factor).toFixed(this.decimals) + '%';
    },
    barFillStyle() {
      const style = { width: this.ratio * 100 + '%', height: '100%' };
      if (this.variant === 'gradient' && this.ratio > 0) {
        // グラデーションをバー全体の幅に合わせ、進むにつれて先の色が見えるようにする
        style.backgroundSize = `${100 / this.ratio}% 100%`;
      }
      return style;
    },
    ariaLabel() {
      return `${this.currentVal}${this.unit}: ${this.percentLabel}`;
    },
    ringCircumference() {
      return 2 * Math.PI * this.ringRadius;
    },
    segmentFills() {
      const filled = this.ratio * this.segments;
      return Array.from({ length: this.segments }, (_, i) => Math.min(Math.max(filled - i, 0), 1));
    },
    textBar() {
      const eighths = Math.floor(this.ratio * TEXT_BAR_WIDTH * 8);
      const full = Math.floor(eighths / 8);
      const partial = PARTIAL_BLOCKS[eighths % 8];
      const rest = TEXT_BAR_WIDTH - full - (partial ? 1 : 0);
      return '█'.repeat(full) + partial + '░'.repeat(Math.max(rest, 0));
    },
  },
  watch: {
    ratio(newVal, oldVal) {
      if (newVal >= oldVal) return;
      this.instant = true;
      // 1 フレーム描画してからアニメーションを戻す
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.instant = false;
      }));
    },
  },
}
</script>

<style scoped>
.progress-container {
  --tp-track: #e5e7eb;
  --tp-fill: #2563eb;
  --tp-fill-2: #9333ea;
  --tp-fill-text: #fee2e2;
  --tp-muted: #6b7280;
}

.ring-item {
  --tp-track: #e5e7eb;
  --tp-fill: #2563eb;
  --tp-muted: #6b7280;
}

.no-transition {
  transition: none !important;
}

/* 標準 / グラデーション / ストライプ */
.bar-track {
  background-color: var(--tp-track);
}

.bar-fill {
  color: var(--tp-fill-text);
  transition: width 600ms ease-in-out;
}

.bar-standard {
  background-color: var(--tp-fill);
}

.bar-gradient {
  background-image: linear-gradient(90deg, #06b6d4, var(--tp-fill), var(--tp-fill-2), #ec4899);
}

.bar-stripe {
  background-color: var(--tp-fill);
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.2) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.2) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: stripe-move 1s linear infinite;
}

@keyframes stripe-move {
  from { background-position: 1rem 0; }
  to { background-position: 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .bar-stripe {
    animation: none;
  }
}

/* セグメント */
.segment-bar {
  gap: 2px;
}

.segment {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  border-radius: 2px;
  background-color: var(--tp-track);
}

.segment-fill {
  height: 100%;
  background-color: var(--tp-fill);
}

/* ミニマル */
.is-minimal {
  align-items: flex-end;
}

.minimal-percent {
  font-size: 1.5rem;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.minimal-track {
  height: 2px;
  background-color: var(--tp-track);
}

.minimal-fill {
  height: 100%;
  background-color: var(--tp-fill);
  transition: width 600ms ease-in-out;
}

/* テキスト */
.text-bar {
  display: flex;
  align-items: center;
  gap: 0.75ch;
  min-width: 0;
  /* 幅に合わせて文字サイズを縮め、狭い画面でもバー全体を表示する */
  container-type: inline-size;
  font-family: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: nowrap;
}

.text-bar-body,
.text-bar-percent {
  font-size: min(1rem, calc(100cqi / 24));
}

.text-bar-body {
  color: var(--tp-fill);
}

.text-bar-percent {
  font-variant-numeric: tabular-nums;
}

/* リング */
.ring-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ring-svg {
  width: 100%;
  max-width: 140px;
}

.ring-track,
.ring-fill {
  fill: none;
  stroke-width: 10;
}

.ring-track {
  stroke: var(--tp-track);
}

.ring-fill {
  stroke: var(--tp-fill);
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 60px 60px;
  transition: stroke-dashoffset 600ms ease-in-out;
}

.ring-percent {
  fill: currentColor;
  font-size: 18px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}

.ring-caption {
  margin-top: 0.25rem;
  color: var(--tp-muted);
  font-size: 0.875rem;
}
</style>
