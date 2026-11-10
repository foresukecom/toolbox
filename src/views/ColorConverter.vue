<template>
  <div class="dev-tool cat-dev">
    <section class="mb-8">
      <label class="block font-bold mb-2" for="color-input">色を入力</label>
      <div class="flex items-center gap-3">
        <input
          id="color-input"
          v-model="input"
          type="text"
          class="border rounded-md p-2 w-full max-w-md font-mono"
          placeholder="#16a085 / rgb(22 160 133) / hsl(168 76% 36%) / oklch(...)"
          spellcheck="false"
          autocomplete="off"
        />
        <input
          type="color"
          class="color-picker"
          :value="pickerValue"
          aria-label="カラーピッカー"
          @input="input = $event.target.value"
        />
      </div>
      <p v-if="parsed.error" class="error mt-2">{{ parsed.error }}</p>
      <p v-else-if="parsed.clipped" class="warning mt-2">
        sRGB の範囲外の色です。表示と出力は範囲内にクリップしています。
      </p>
    </section>

    <section v-if="parsed.color" class="mb-8">
      <div class="flex flex-wrap gap-6 items-start">
        <div class="swatch-wrap">
          <div class="swatch" :style="{ backgroundColor: outputs.rgb }"></div>
        </div>
        <table class="outputs">
          <tbody>
            <tr v-for="row in outputRows" :key="row.label">
              <th class="pr-4 text-left">{{ row.label }}</th>
              <td class="font-mono pr-2">{{ row.value }}</td>
              <td><CopyButton :textToCopy="row.value" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2 class="section-title">コントラスト比チェッカー</h2>
      <div class="flex flex-wrap gap-6 mb-4">
        <div>
          <label class="block font-bold mb-1" for="fg-input">文字色</label>
          <div class="flex items-center gap-2">
            <input
              id="fg-input"
              v-model="fgInput"
              type="text"
              class="border rounded-md p-2 font-mono"
              spellcheck="false"
              autocomplete="off"
            />
            <input
              type="color"
              class="color-picker"
              :value="fgParsed.color ? toHex(fgParsed.color, false) : '#000000'"
              aria-label="文字色のカラーピッカー"
              @input="fgInput = $event.target.value"
            />
          </div>
          <p v-if="fgParsed.error" class="error mt-1">{{ fgParsed.error }}</p>
        </div>
        <div>
          <label class="block font-bold mb-1" for="bg-input">背景色</label>
          <div class="flex items-center gap-2">
            <input
              id="bg-input"
              v-model="bgInput"
              type="text"
              class="border rounded-md p-2 font-mono"
              spellcheck="false"
              autocomplete="off"
            />
            <input
              type="color"
              class="color-picker"
              :value="bgParsed.color ? toHex(bgParsed.color, false) : '#ffffff'"
              aria-label="背景色のカラーピッカー"
              @input="bgInput = $event.target.value"
            />
          </div>
          <p v-if="bgParsed.error" class="error mt-1">{{ bgParsed.error }}</p>
        </div>
      </div>

      <div v-if="contrast">
        <div class="flex items-center gap-2 mb-3">
          <span class="ratio font-mono">{{ contrast.text }}</span>
          <CopyButton :textToCopy="contrast.text" />
        </div>
        <table class="judge mb-4">
          <thead>
            <tr>
              <th class="text-left pr-6">基準</th>
              <th class="text-left pr-6">必要な比率</th>
              <th class="text-left">判定</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="level in contrast.levels" :key="level.label">
              <td class="pr-6">{{ level.label }}</td>
              <td class="pr-6 font-mono">{{ level.min.toFixed(1) }} : 1</td>
              <td :class="level.pass ? 'pass' : 'fail'">{{ level.pass ? '✓' : '✗' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="sample" :style="sampleStyle">
          <p class="sample-large">大きな文字のサンプル Large Text</p>
          <p>通常の文字のサンプルです。The quick brown fox jumps over the lazy dog.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue';

const EPS = 1e-4;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function round(v, digits) {
  const f = 10 ** digits;
  const r = Math.round(v * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

function normalizeHue(h) {
  return ((h % 360) + 360) % 360;
}

// Björn Ottosson, https://bottosson.github.io/posts/oklab/
function linearSrgbToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinearSrgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < EPS) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [normalizeHue(h * 60), s, l];
}

// 数値トークンの解釈。percentBase は "100%" に対応する値
function parseNumber(token, percentBase, name) {
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%)?$/i.exec(token);
  if (!m) throw new Error(`${name} の値「${token}」を数値として解釈できません`);
  const v = parseFloat(m[1]);
  return m[2] ? (v / 100) * percentBase : v;
}

function parseHue(token) {
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|rad|grad|turn)?$/i.exec(token);
  if (!m) throw new Error(`色相の値「${token}」を解釈できません`);
  const v = parseFloat(m[1]);
  const unit = (m[2] || 'deg').toLowerCase();
  const factor = { deg: 1, rad: 180 / Math.PI, grad: 0.9, turn: 360 }[unit];
  return v * factor;
}

function parseAlpha(token) {
  if (token === undefined) return 1;
  return clamp(parseNumber(token, 1, 'アルファ'), 0, 1);
}

function parseHex(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || ![3, 4, 6, 8].includes(hex.length)) {
    throw new Error('HEX は #rgb / #rgba / #rrggbb / #rrggbbaa の形式で入力してください');
  }
  const full = hex.length <= 4 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = (i) => parseInt(full.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: full.length === 8 ? n(6) : 1 };
}

let namedColorCtx = null;
function resolveNamedColor(name) {
  if (typeof document === 'undefined') return null;
  if (!namedColorCtx) namedColorCtx = document.createElement('canvas').getContext('2d');
  if (!namedColorCtx) return null;
  // 不正な値を代入しても fillStyle は変わらないので、2種類の初期値で確認する
  namedColorCtx.fillStyle = '#000000';
  namedColorCtx.fillStyle = name;
  const a = namedColorCtx.fillStyle;
  namedColorCtx.fillStyle = '#ffffff';
  namedColorCtx.fillStyle = name;
  const b = namedColorCtx.fillStyle;
  if (a !== b || !/^#[0-9a-f]{6}$/i.test(a)) return null;
  return a;
}

// 文字列を { r, g, b, a }（sRGB 0〜1、範囲外も含む）に変換する
function parseColorString(str) {
  const s = str.trim().toLowerCase();
  if (!s) throw new Error('色を入力してください');

  if (s.startsWith('#')) return parseHex(s.slice(1));
  if (/^[0-9a-f]{3,8}$/.test(s) && [3, 4, 6, 8].includes(s.length)) return parseHex(s);

  const fn = /^(rgba?|hsla?|oklch)\((.*)\)$/.exec(s);
  if (fn) {
    const kind = fn[1];
    const tokens = fn[2].split(/[\s,/]+/).filter((t) => t !== '');
    if (tokens.length < 3 || tokens.length > 4) {
      throw new Error(`${kind}() には 3 つの値（とアルファ）を指定してください`);
    }
    const a = parseAlpha(tokens[3]);

    if (kind.startsWith('rgb')) {
      const [r, g, b] = tokens.slice(0, 3).map((t, i) => parseNumber(t, 255, 'RGB'[i]) / 255);
      return { r, g, b, a };
    }
    if (kind.startsWith('hsl')) {
      const h = normalizeHue(parseHue(tokens[0]));
      const sat = clamp(parseNumber(tokens[1], 100, '彩度') / 100, 0, 1);
      const lig = clamp(parseNumber(tokens[2], 100, '明度') / 100, 0, 1);
      const [r, g, b] = hslToRgb(h, sat, lig);
      return { r, g, b, a };
    }
    // oklch: L は % または 0〜1、C は 100% = 0.4
    const L = parseNumber(tokens[0], 1, 'L');
    const C = Math.max(0, parseNumber(tokens[1], 0.4, 'C'));
    const H = parseHue(tokens[2]) * (Math.PI / 180);
    const [lr, lg, lb] = oklabToLinearSrgb(clamp(L, 0, 1), C * Math.cos(H), C * Math.sin(H));
    const [r, g, b] = [lr, lg, lb].map((c) => (c < 0 ? -linearToSrgb(-c) : linearToSrgb(c)));
    return { r, g, b, a };
  }

  if (/^[a-z]+$/.test(s)) {
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const hex = resolveNamedColor(s);
    if (hex) return parseHex(hex.slice(1));
  }

  throw new Error(`「${str.trim()}」を色として解釈できません（HEX / rgb() / hsl() / oklch() / 色名に対応）`);
}

// 結果を { color, clipped, error } で返す。例外は外に出さない
function parseColor(str) {
  try {
    const raw = parseColorString(str);
    const clipped = ['r', 'g', 'b'].some((k) => raw[k] < -EPS || raw[k] > 1 + EPS);
    const color = {
      r: clamp(raw.r, 0, 1),
      g: clamp(raw.g, 0, 1),
      b: clamp(raw.b, 0, 1),
      a: raw.a,
    };
    return { color, clipped, error: '' };
  } catch (e) {
    return { color: null, clipped: false, error: e.message };
  }
}

function relativeLuminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

// 半透明の色を下地の上に合成する（sRGB 空間でのアルファ合成）
function composite(top, bottom) {
  const mix = (k) => top[k] * top.a + bottom[k] * (1 - top.a);
  return { r: mix('r'), g: mix('g'), b: mix('b'), a: 1 };
}

const WHITE = { r: 1, g: 1, b: 1, a: 1 };

export default {
  name: 'ColorConverter',
  components: {
    CopyButton,
  },
  data() {
    return {
      input: '#16a085',
      fgInput: '#16a085',
      bgInput: '#ffffff',
      lastPickerValue: '#16a085',
    };
  },
  computed: {
    parsed() {
      return parseColor(this.input);
    },
    pickerValue() {
      return this.parsed.color ? this.toHex(this.parsed.color, false) : this.lastPickerValue;
    },
    outputs() {
      const c = this.parsed.color;
      if (!c) return null;
      return {
        hex: this.toHex(c, true),
        rgb: this.toRgb(c),
        hsl: this.toHsl(c),
        oklch: this.toOklch(c),
      };
    },
    outputRows() {
      if (!this.outputs) return [];
      return [
        { label: 'HEX', value: this.outputs.hex },
        { label: 'RGB', value: this.outputs.rgb },
        { label: 'HSL', value: this.outputs.hsl },
        { label: 'OKLCH', value: this.outputs.oklch },
      ];
    },
    fgParsed() {
      return parseColor(this.fgInput);
    },
    bgParsed() {
      return parseColor(this.bgInput);
    },
    contrastColors() {
      if (!this.fgParsed.color || !this.bgParsed.color) return null;
      const bg = composite(this.bgParsed.color, WHITE);
      const fg = composite(this.fgParsed.color, bg);
      return { fg, bg };
    },
    contrast() {
      if (!this.contrastColors) return null;
      const l1 = relativeLuminance(this.contrastColors.fg);
      const l2 = relativeLuminance(this.contrastColors.bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const levels = [
        { label: 'AA 通常文字', min: 4.5 },
        { label: 'AA 大きな文字', min: 3.0 },
        { label: 'AAA 通常文字', min: 7.0 },
        { label: 'AAA 大きな文字', min: 4.5 },
      ].map((lv) => ({ ...lv, pass: ratio >= lv.min }));
      return { ratio, text: `${ratio.toFixed(2)} : 1`, levels };
    },
    sampleStyle() {
      if (!this.contrastColors) return {};
      return {
        color: this.toHex(this.contrastColors.fg, false),
        backgroundColor: this.toHex(this.contrastColors.bg, false),
      };
    },
  },
  watch: {
    parsed(value) {
      if (!value.color) return;
      this.lastPickerValue = this.toHex(value.color, false);
      this.fgInput = this.toHex(value.color, true);
    },
  },
  methods: {
    toHex(c, withAlpha) {
      const h = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
      const base = `#${h(c.r)}${h(c.g)}${h(c.b)}`;
      return withAlpha && c.a < 1 ? base + h(c.a) : base;
    },
    alphaSuffix(c) {
      return c.a < 1 ? ` / ${round(c.a, 3)}` : '';
    },
    toRgb(c) {
      const v = (x) => Math.round(x * 255);
      return `rgb(${v(c.r)} ${v(c.g)} ${v(c.b)}${this.alphaSuffix(c)})`;
    },
    toHsl(c) {
      const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
      const hue = round(h, 1) === 360 ? 0 : round(h, 1);
      return `hsl(${hue} ${round(s * 100, 1)}% ${round(l * 100, 1)}%${this.alphaSuffix(c)})`;
    },
    toOklch(c) {
      const [L, a, b] = linearSrgbToOklab(srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b));
      const C = Math.sqrt(a * a + b * b);
      let H = C < 2e-4 ? 0 : normalizeHue((Math.atan2(b, a) * 180) / Math.PI);
      if (round(H, 2) === 360) H = 0;
      const chroma = C < 2e-4 ? 0 : C;
      return `oklch(${(L * 100).toFixed(1)}% ${chroma.toFixed(4)} ${round(H, 2)}${this.alphaSuffix(c)})`;
    },
  },
};
</script>

<style scoped>
.color-picker {
  width: 3rem;
  height: 2.5rem;
  padding: 0;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  cursor: pointer;
  background: none;
}

.swatch-wrap {
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #ccc;
  /* 半透明の色が分かるように市松模様を敷く */
  background-image: linear-gradient(45deg, #ddd 25%, transparent 25%),
    linear-gradient(-45deg, #ddd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ddd 75%),
    linear-gradient(-45deg, transparent 75%, #ddd 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.swatch {
  width: 8rem;
  height: 8rem;
}

.outputs th,
.outputs td,
.judge th,
.judge td {
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

.ratio {
  font-size: 1.75rem;
  font-weight: bold;
  color: var(--tb-main);
}

.pass {
  color: #15803d;
  font-weight: bold;
}

.fail {
  color: #b91c1c;
  font-weight: bold;
}

.sample {
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
}

.sample-large {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.error {
  color: #b91c1c;
}

.warning {
  color: #b45309;
}
</style>
