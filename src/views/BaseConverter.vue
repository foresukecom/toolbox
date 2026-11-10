<template>
  <div class="dev-tool cat-number">
    <section class="mb-8">
      <label class="block font-bold mb-2" for="base-input">数値を入力</label>
      <div class="flex flex-wrap items-center gap-3">
        <input
          id="base-input"
          v-model="input"
          type="text"
          class="border rounded-md p-2 w-full max-w-md font-mono"
          placeholder="255 / 0xff / 0b1010 / -42 / 1_000_000"
          spellcheck="false"
          autocomplete="off"
        />
        <select v-model="inputBase" class="border rounded-md p-2" aria-label="入力の基数">
          <option v-for="opt in baseOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <p class="hint mt-2">自動: 接頭辞 0b / 0o / 0x で判定し、なければ10進数。区切りの「_」「,」空白は無視します。</p>
      <p v-if="parsed.error" class="error mt-2">{{ parsed.error }}</p>
    </section>

    <template v-if="parsed.value !== null">
      <section class="mb-8">
        <div class="flex flex-wrap gap-x-6 gap-y-2 mb-4">
          <label class="inline-flex items-center gap-1">
            <input v-model="upperHex" type="checkbox" />
            16進数を大文字にする
          </label>
          <label class="inline-flex items-center gap-1">
            <input v-model="withPrefix" type="checkbox" />
            接頭辞を付ける（0b / 0o / 0x）
          </label>
          <label class="inline-flex items-center gap-1">
            <input v-model="grouping" type="checkbox" />
            桁区切り
          </label>
        </div>
        <table class="outputs">
          <tbody>
            <tr v-for="row in outputRows" :key="row.label">
              <th class="pr-4 text-left whitespace-nowrap">{{ row.label }}</th>
              <td class="font-mono pr-2 break-all">{{ row.value }}</td>
              <td><CopyButton :textToCopy="row.value" /></td>
            </tr>
          </tbody>
        </table>
        <p class="mt-3">
          ビット数（絶対値）: <span class="font-mono font-bold">{{ bitLength }}</span>
          <span v-if="parsed.inputBase !== null" class="hint ml-2">（{{ parsed.inputBase }}進数として解釈）</span>
        </p>
      </section>

      <section class="mb-8">
        <h2 class="section-title">2の補数表示</h2>
        <div class="flex flex-wrap gap-4 mb-3">
          <label v-for="w in widths" :key="w" class="inline-flex items-center gap-1">
            <input v-model.number="width" type="radio" :value="w" />
            {{ w }}ビット
          </label>
        </div>
        <p v-if="twos === null" class="error">
          範囲外（{{ width }}ビットで表せるのは {{ rangeText }}）
        </p>
        <table v-else class="outputs">
          <tbody>
            <tr v-for="row in twosRows" :key="row.label">
              <th class="pr-4 text-left whitespace-nowrap">{{ row.label }}</th>
              <td class="font-mono pr-2 break-all">{{ row.value }}</td>
              <td><CopyButton :textToCopy="row.value" /></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 class="section-title">ビット表示</h2>
        <p v-if="width > 32" class="hint">ビット表示は32ビットまでです。幅を32ビット以下にしてください。</p>
        <p v-else-if="twos === null" class="hint">値が{{ width }}ビットの範囲外のため表示できません。</p>
        <template v-else>
          <p class="hint mb-2">ビットをクリックすると反転します（負の数は符号付きとして解釈します）。</p>
          <div class="bits font-mono">
            <div v-for="(nibble, ni) in bitNibbles" :key="ni" class="nibble">
              <button
                v-for="bit in nibble"
                :key="bit.index"
                type="button"
                class="bit"
                :class="{ on: bit.on }"
                :title="'ビット ' + bit.index"
                @click="toggleBit(bit.index)"
              >
                <span class="bit-value">{{ bit.on ? 1 : 0 }}</span>
                <span class="bit-index">{{ bit.index }}</span>
              </button>
            </div>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<script>
/* global BigInt */
import CopyButton from '@/components/CopyButton.vue';

const PREFIXES = { 2: '0b', 8: '0o', 16: '0x' };
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

function parseInput(raw, baseSetting) {
  let s = raw.replace(/[_,\s]/g, '');
  if (s === '') return { value: null, error: null, inputBase: null };

  let negative = false;
  if (s[0] === '-' || s[0] === '+') {
    negative = s[0] === '-';
    s = s.slice(1);
  }

  let base = baseSetting === 'auto' ? 10 : Number(baseSetting);
  const head = s.slice(0, 2).toLowerCase();
  if (baseSetting === 'auto') {
    const found = Object.keys(PREFIXES).find((b) => PREFIXES[b] === head);
    if (found) {
      base = Number(found);
      s = s.slice(2);
    }
  } else if (PREFIXES[base] === head) {
    // 基数を指定していても、その基数の接頭辞は受け付ける
    s = s.slice(2);
  }

  if (s === '') {
    return { value: null, error: '数値がありません', inputBase: base };
  }

  const lower = s.toLowerCase();
  const invalid = [];
  let value = 0n;
  const bigBase = BigInt(base);
  for (let i = 0; i < lower.length; i++) {
    const d = DIGITS.indexOf(lower[i]);
    if (d < 0 || d >= base) {
      if (!invalid.includes(s[i])) invalid.push(s[i]);
    } else if (invalid.length === 0) {
      value = value * bigBase + BigInt(d);
    }
  }
  if (invalid.length > 0) {
    return {
      value: null,
      error: `${base}進数として不正な文字があります: ${invalid.join(' ')}`,
      inputBase: base,
    };
  }
  return { value: negative ? -value : value, error: null, inputBase: base };
}

// 右から size 桁ごとに sep で区切る
function groupDigits(digits, size, sep) {
  const parts = [];
  for (let end = digits.length; end > 0; end -= size) {
    parts.unshift(digits.slice(Math.max(0, end - size), end));
  }
  return parts.join(sep);
}

export default {
  name: 'BaseConverter',
  components: { CopyButton },
  data() {
    return {
      input: '255',
      inputBase: 'auto',
      upperHex: false,
      withPrefix: false,
      grouping: false,
      width: 8,
      widths: [8, 16, 32, 64],
      baseOptions: [
        { value: 'auto', label: '自動' },
        { value: '2', label: '2進数' },
        { value: '8', label: '8進数' },
        { value: '10', label: '10進数' },
        { value: '16', label: '16進数' },
      ],
    };
  },
  computed: {
    parsed() {
      return parseInput(this.input, this.inputBase);
    },
    absValue() {
      const v = this.parsed.value;
      return v < 0n ? -v : v;
    },
    bitLength() {
      return this.absValue.toString(2).length;
    },
    outputRows() {
      const v = this.parsed.value;
      const sign = v < 0n ? '-' : '';
      return [
        { label: '2進数', value: sign + this.formatDigits(this.absValue.toString(2), 2) },
        { label: '8進数', value: sign + this.formatDigits(this.absValue.toString(8), 8) },
        { label: '10進数', value: sign + this.formatDigits(this.absValue.toString(10), 10) },
        { label: '16進数', value: sign + this.formatDigits(this.absValue.toString(16), 16) },
      ];
    },
    // その幅で表せる範囲（符号付きの最小値〜符号なしの最大値）に入っていれば2の補数の値、なければ null
    twos() {
      const v = this.parsed.value;
      const w = BigInt(this.width);
      const min = -(1n << (w - 1n));
      const max = (1n << w) - 1n;
      if (v < min || v > max) return null;
      return BigInt.asUintN(this.width, v);
    },
    rangeText() {
      const w = BigInt(this.width);
      return `${(-(1n << (w - 1n))).toString()} 〜 ${((1n << w) - 1n).toString()}`;
    },
    twosRows() {
      const u = this.twos;
      return [
        { label: '2進数', value: this.formatDigits(u.toString(2).padStart(this.width, '0'), 2) },
        { label: '16進数', value: this.formatDigits(u.toString(16).padStart(this.width / 4, '0'), 16) },
      ];
    },
    bitNibbles() {
      const bits = this.twos.toString(2).padStart(this.width, '0');
      const nibbles = [];
      for (let i = 0; i < this.width; i += 4) {
        nibbles.push(
          bits
            .slice(i, i + 4)
            .split('')
            .map((c, j) => ({ index: this.width - 1 - (i + j), on: c === '1' })),
        );
      }
      return nibbles;
    },
  },
  methods: {
    formatDigits(digits, base) {
      let s = base === 16 && this.upperHex ? digits.toUpperCase() : digits;
      if (this.grouping) {
        if (base === 2 || base === 16) s = groupDigits(s, 4, ' ');
        else if (base === 10) s = groupDigits(s, 3, ',');
      }
      return this.withPrefix && PREFIXES[base] ? PREFIXES[base] + s : s;
    },
    toggleBit(index) {
      const flipped = this.twos ^ (1n << BigInt(index));
      // 元の値が負なら符号付き、そうでなければ符号なしとして解釈する
      const next = this.parsed.value < 0n ? BigInt.asIntN(this.width, flipped) : flipped;
      const base = this.parsed.inputBase;
      const abs = next < 0n ? -next : next;
      const prefix = this.inputBase === 'auto' && PREFIXES[base] ? PREFIXES[base] : '';
      this.input = (next < 0n ? '-' : '') + prefix + abs.toString(base);
    },
  },
};
</script>

<style scoped>
.outputs th,
.outputs td {
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
  vertical-align: middle;
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

.error {
  color: #b91c1c;
}

.bits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.nibble {
  display: flex;
  gap: 0.15rem;
}

.bit {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 1.75rem;
  padding: 0.2rem 0;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  background: #fff;
  cursor: pointer;
}

.bit.on {
  background: var(--tb-main);
  border-color: var(--tb-main);
  color: #fff;
}

.bit-value {
  font-size: 1rem;
  font-weight: bold;
}

.bit-index {
  font-size: 0.6rem;
  opacity: 0.7;
}
</style>
