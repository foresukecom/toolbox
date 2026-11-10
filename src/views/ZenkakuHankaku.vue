<template>
  <div class="dev-tool cat-text">
    <section class="mb-6">
      <label for="zh-input" class="block font-bold mb-2">変換するテキスト</label>
      <textarea
        id="zh-input"
        v-model="input"
        class="zh-textarea"
        spellcheck="false"
        placeholder="ﾊﾟｿｺﾝ ＡＢＣ１２３"
      ></textarea>
    </section>

    <section class="mb-6">
      <div class="zh-direction mb-4" role="radiogroup" aria-label="変換の向き">
        <button
          v-for="d in directions"
          :key="d.value"
          type="button"
          role="radio"
          :aria-checked="direction === d.value"
          :class="['zh-direction-btn', { active: direction === d.value }]"
          @click="direction = d.value"
        >
          {{ d.label }}
        </button>
      </div>

      <div class="flex flex-wrap gap-x-5 gap-y-2 mb-3">
        <span class="font-bold">対象</span>
        <label v-for="t in targetOptions" :key="t.value" class="inline-flex items-center gap-1" :title="t.title">
          <input v-model="targets[t.value]" type="checkbox" />
          {{ t.label }}
        </label>
        <button type="button" class="zh-link" @click="setAllTargets(!allTargetsOn)">
          {{ allTargetsOn ? 'すべて外す' : 'すべて選択' }}
        </button>
      </div>

      <div class="flex flex-wrap gap-x-5 gap-y-2">
        <span class="font-bold">かな</span>
        <label v-for="k in kanaOptions" :key="k.value" class="inline-flex items-center gap-1">
          <input v-model="kana" type="radio" :value="k.value" />
          {{ k.label }}
        </label>
      </div>
    </section>

    <section class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 class="section-title">変換結果</h2>
        <p class="text-sm">
          変換した文字: <span class="font-mono font-bold">{{ changedCount }}</span>
          <span class="hint">／ {{ segments.length }} 文字</span>
        </p>
      </div>
      <div class="relative">
        <textarea :value="output" class="zh-textarea bg-gray-50" spellcheck="false" readonly></textarea>
        <div class="absolute top-2 right-2">
          <CopyButton :textToCopy="output" />
        </div>
      </div>
    </section>

    <section v-if="changedCount" class="mb-6">
      <h2 class="section-title mb-2">差分</h2>
      <p class="hint mb-2">色の付いた文字が変換された箇所です。</p>
      <div class="zh-diff-grid">
        <div>
          <p class="zh-diff-label">変換前</p>
          <div class="zh-diff">
            <template v-for="(s, i) in shownSegments" :key="i">
              <mark v-if="s.changed" class="zh-mark-src">{{ s.src }}</mark>
              <template v-else>{{ s.src }}</template>
            </template>
          </div>
        </div>
        <div>
          <p class="zh-diff-label">変換後</p>
          <div class="zh-diff">
            <template v-for="(s, i) in shownSegments" :key="i">
              <mark v-if="s.changed" class="zh-mark-dst">{{ s.dst }}</mark>
              <template v-else>{{ s.dst }}</template>
            </template>
          </div>
        </div>
      </div>
      <p v-if="segments.length > maxShown" class="hint mt-1">
        差分の表示は先頭 {{ maxShown.toLocaleString() }} 文字までです（変換結果は全文が対象です）。
      </p>

      <h3 class="font-bold mt-5 mb-2">変換の内訳</h3>
      <div class="zh-pairs">
        <span v-for="p in shownPairs" :key="p.src" class="zh-pair" :title="p.codes">
          <span class="font-mono">{{ p.src }}</span>
          <span class="zh-arrow">→</span>
          <span class="font-mono">{{ p.dst }}</span>
          <span class="zh-count">×{{ p.count }}</span>
        </span>
      </div>
      <p v-if="pairs.length > shownPairs.length" class="hint mt-1">ほか {{ pairs.length - shownPairs.length }} 種類</p>
    </section>

    <section>
      <h2 class="section-title mb-2">変換ルールの注記</h2>
      <p class="hint mb-2">見た目が似ていても別の文字のものがあるため、変換するもの・しないものを明示しています。</p>
      <table class="zh-notes">
        <tbody>
          <tr v-for="n in symbolNotes" :key="n.chars">
            <th class="font-mono">{{ n.chars }}</th>
            <td>{{ n.rule }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue';
import { convertSegments, SYMBOL_NOTES } from '@/utilities/zenkakuHankaku';

// 差分表示する単位数の上限（大きな入力で DOM が重くならないように）
const MAX_SHOWN = 5000;
const MAX_PAIRS = 60;

function codePoints(s) {
  return Array.from(s)
    .map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
    .join(' ');
}

export default {
  name: 'ZenkakuHankaku',
  components: { CopyButton },
  data() {
    return {
      input: 'ﾊﾟｿｺﾝでＡＢＣ－１２３を入力。ｶﾞｷﾞｸﾞ\u3000ｳﾞｧｲｵﾘﾝ ～ ￥１,０００',
      direction: 'toHalf',
      targets: { alpha: true, digit: true, symbol: true, space: true, kana: false },
      kana: 'none',
      maxShown: MAX_SHOWN,
      directions: [
        { value: 'toHalf', label: '全角 → 半角' },
        { value: 'toFull', label: '半角 → 全角' },
      ],
      targetOptions: [
        { value: 'alpha', label: '英字', title: 'A〜Z / a〜z ⇔ Ａ〜Ｚ / ａ〜ｚ' },
        { value: 'digit', label: '数字', title: '0〜9 ⇔ ０〜９' },
        { value: 'symbol', label: '記号', title: '! " # $ % & など ASCII の記号と ￥（下の注記を参照）' },
        { value: 'space', label: 'スペース', title: '半角スペース ⇔ 全角スペース（U+3000）' },
        { value: 'kana', label: 'カタカナ', title: '半角カナ ⇔ 全角カナ（濁点・半濁点は結合・分解）、。「」、・ー も含む' },
      ],
      kanaOptions: [
        { value: 'none', label: 'そのまま' },
        { value: 'hiraToKata', label: 'ひらがな → カタカナ' },
        { value: 'kataToHira', label: 'カタカナ → ひらがな' },
      ],
      symbolNotes: SYMBOL_NOTES,
    };
  },
  computed: {
    segments() {
      return convertSegments(this.input, { direction: this.direction, targets: this.targets, kana: this.kana });
    },
    output() {
      return this.segments.map((s) => s.dst).join('');
    },
    changedCount() {
      return this.segments.reduce((n, s) => n + (s.changed ? 1 : 0), 0);
    },
    shownSegments() {
      return this.segments.length > MAX_SHOWN ? this.segments.slice(0, MAX_SHOWN) : this.segments;
    },
    // 変換前 → 変換後 の組み合わせごとの件数（多い順）
    pairs() {
      const map = new Map();
      for (const s of this.segments) {
        if (!s.changed) continue;
        const p = map.get(s.src);
        if (p) p.count++;
        else map.set(s.src, { src: s.src, dst: s.dst, count: 1 });
      }
      return [...map.values()].sort((a, b) => b.count - a.count);
    },
    shownPairs() {
      return this.pairs.slice(0, MAX_PAIRS).map((p) => ({
        ...p,
        src: p.src === ' ' || p.src === '\u3000' ? `[${p.src === ' ' ? '半角' : '全角'}空白]` : p.src,
        dst: p.dst === ' ' || p.dst === '\u3000' ? `[${p.dst === ' ' ? '半角' : '全角'}空白]` : p.dst,
        codes: `${codePoints(p.src)} → ${codePoints(p.dst)}`,
      }));
    },
    allTargetsOn() {
      return Object.values(this.targets).every(Boolean);
    },
  },
  methods: {
    setAllTargets(on) {
      for (const key of Object.keys(this.targets)) this.targets[key] = on;
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
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.zh-textarea {
  width: 100%;
  min-height: 8rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.75rem;
  padding-right: 3rem;
  font-size: 1rem;
  resize: vertical;
}

.zh-textarea:focus {
  outline: none;
  border-color: var(--tb-main);
  box-shadow: 0 0 0 1px var(--tb-main);
}

.zh-direction {
  display: inline-flex;
  border: 1px solid var(--tb-main);
  border-radius: 0.375rem;
  overflow: hidden;
}

.zh-direction-btn {
  padding: 0.4rem 1rem;
  background: #fff;
  color: var(--tb-main);
}

.zh-direction-btn + .zh-direction-btn {
  border-left: 1px solid var(--tb-main);
}

.zh-direction-btn.active {
  background: var(--tb-main);
  color: #fff;
}

.zh-link {
  color: var(--tb-main);
  font-size: 0.875rem;
  text-decoration: underline;
}

.zh-diff-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .zh-diff-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.zh-diff-label {
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.zh-diff {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.75rem;
  min-height: 3rem;
  max-height: 20rem;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.8;
}

.zh-mark-src {
  background: #fee2e2;
  color: #991b1b;
  border-radius: 2px;
}

.zh-mark-dst {
  background: #dcfce7;
  color: #166534;
  border-radius: 2px;
}

.zh-pairs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.zh-pair {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 9999px;
  padding: 0.1rem 0.6rem;
  font-size: 0.875rem;
}

.zh-arrow,
.zh-count {
  color: #6b7280;
  font-size: 0.75rem;
}

.zh-notes {
  width: 100%;
  font-size: 0.875rem;
}

.zh-notes th,
.zh-notes td {
  border-top: 1px solid #e5e7eb;
  padding: 0.4rem 0.5rem;
  text-align: left;
  vertical-align: top;
}

.zh-notes th {
  white-space: nowrap;
  font-weight: normal;
}

@media (max-width: 480px) {
  .zh-notes th {
    white-space: normal;
    min-width: 5rem;
  }
}
</style>
