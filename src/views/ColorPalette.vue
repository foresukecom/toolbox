<template>
  <div class="dev-tool cat-image">
    <section class="mb-8">
      <label
        for="palette-file"
        class="dropzone"
        :class="{ 'is-dragover': isDragOver }"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleDrop"
      >
        <span class="font-bold">画像を選択 / ドラッグ&ドロップ / 貼り付け（Ctrl+V）</span>
        <span class="hint mt-1">PNG・JPEG・WebP・GIF など。画像はブラウザ内で処理し、外部には送信しません。</span>
        <input id="palette-file" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
      </label>
      <p v-if="error" class="error mt-2">{{ error }}</p>
    </section>

    <section v-if="imageUrl" class="mb-8">
      <div class="result-layout">
        <div class="preview-wrap">
          <img :src="imageUrl" alt="選択した画像のプレビュー" class="preview" />
          <p class="hint mt-1 break-all">{{ fileName }}（{{ imageSize.width }} × {{ imageSize.height }}）</p>
        </div>

        <div class="min-w-0">
          <label class="block font-bold mb-1" for="color-count">色数: {{ colorCount }}</label>
          <input
            id="color-count"
            v-model.number="colorCount"
            type="range"
            min="3"
            max="12"
            step="1"
            class="w-full max-w-xs"
          />
          <p class="hint mt-1">
            抽出時間: {{ elapsed.toFixed(1) }} ms（{{ sampleSize.width }} × {{ sampleSize.height }} に縮小して計算）
          </p>
          <p v-if="palette.length && palette.length < colorCount" class="hint">
            画像に含まれる色が少ないため {{ palette.length }} 色になりました。
          </p>

          <div v-if="palette.length" class="band mt-4" aria-label="パレットの横帯">
            <div
              v-for="(c, i) in palette"
              :key="i"
              class="band-item"
              :style="{ backgroundColor: c.hex, flexGrow: c.ratio }"
              :title="`${c.hex}（${formatRatio(c.ratio)}）`"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="palette.length" class="mb-8">
      <h2 class="section-title">抽出した色</h2>
      <p class="hint mb-3">色をクリックすると HEX をコピーします。</p>
      <ul class="swatches">
        <li v-for="(c, i) in swatches" :key="i">
          <button type="button" class="swatch-card" @click="copyHex(c.hex)">
            <span class="swatch" :style="{ backgroundColor: c.hex }">
              <span v-if="copiedHex === c.hex" class="copied" :style="{ color: c.textColor }">コピーしました</span>
            </span>
            <span class="swatch-info">
              <span class="flex justify-between gap-2">
                <span class="font-mono font-bold">{{ c.hex }}</span>
                <span class="ratio">{{ formatRatio(c.ratio) }}</span>
              </span>
              <span class="font-mono text-sm block">{{ c.rgb }}</span>
              <span class="font-mono text-sm block">{{ c.hsl }}</span>
              <span class="hint block">--color-{{ i + 1 }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <section v-if="palette.length">
      <h2 class="section-title">コピー用テキスト</h2>
      <div v-for="out in outputs" :key="out.label" class="mb-4">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-bold">{{ out.label }}</span>
          <CopyButton :textToCopy="out.value" />
        </div>
        <pre class="code">{{ out.value }}</pre>
      </div>
    </section>
  </div>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue';
import {
  extractPalette,
  fitSize,
  rgbToHsl,
  toCssVariables,
  toJson,
  toTailwindConfig,
} from '@/utilities/colorPalette';

// 抽出前に縮小する長辺のピクセル数（数 ms で終わる大きさ）
const SAMPLE_MAX_SIDE = 200;

export default {
  name: 'ColorPalette',
  components: {
    CopyButton,
  },
  data() {
    return {
      isDragOver: false,
      imageUrl: null,
      fileName: '',
      imageSize: { width: 0, height: 0 },
      sampleSize: { width: 0, height: 0 },
      colorCount: 6,
      palette: [],
      elapsed: 0,
      error: '',
      copiedHex: '',
    };
  },
  computed: {
    swatches() {
      return this.palette.map((c) => {
        const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
        // 明るい色の上は黒文字、暗い色の上は白文字
        const luma = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
        return {
          ...c,
          rgb: `rgb(${c.r}, ${c.g}, ${c.b})`,
          hsl: `hsl(${h}, ${s}%, ${l}%)`,
          textColor: luma > 150 ? '#111827' : '#ffffff',
        };
      });
    },
    outputs() {
      return [
        { label: 'CSS 変数', value: toCssVariables(this.palette) },
        { label: 'JSON 配列', value: toJson(this.palette) },
        { label: 'Tailwind config', value: toTailwindConfig(this.palette) },
      ];
    },
  },
  watch: {
    colorCount() {
      this.runExtraction();
    },
  },
  created() {
    // 縮小済みのピクセルと各種タイマーはリアクティブにしない
    this.pixels = null;
    this.copyTimer = null;
    this.loadToken = 0;
  },
  mounted() {
    window.addEventListener('paste', this.handlePaste);
  },
  beforeUnmount() {
    window.removeEventListener('paste', this.handlePaste);
    clearTimeout(this.copyTimer);
    this.revokeImageUrl();
  },
  methods: {
    handleFileChange(event) {
      const file = event.target.files && event.target.files[0];
      if (file) this.loadFile(file);
      // 同じファイルを選び直しても change が発生するようにする
      event.target.value = '';
    },
    handleDrop(event) {
      this.isDragOver = false;
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) this.loadFile(file);
    },
    handlePaste(event) {
      const items = event.clipboardData ? Array.from(event.clipboardData.items) : [];
      const item = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'));
      if (!item) return;
      event.preventDefault();
      this.loadFile(item.getAsFile());
    },
    revokeImageUrl() {
      if (this.imageUrl) {
        URL.revokeObjectURL(this.imageUrl);
        this.imageUrl = null;
      }
    },
    loadFile(file) {
      this.error = '';
      if (!file || !file.type.startsWith('image/')) {
        this.error = '画像ファイルを選択してください。';
        return;
      }
      const token = ++this.loadToken;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        // 読み込み中に別の画像が選ばれた場合は捨てる
        if (token !== this.loadToken) {
          URL.revokeObjectURL(url);
          return;
        }
        this.revokeImageUrl();
        this.imageUrl = url;
        this.fileName = file.name || '貼り付けた画像';
        this.imageSize = { width: img.naturalWidth, height: img.naturalHeight };
        this.samplePixels(img);
        this.runExtraction();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        if (token === this.loadToken) this.error = '画像を読み込めませんでした。';
      };
      img.src = url;
    },
    // 縮小した画像を canvas に描いてピクセルを取り出す
    samplePixels(img) {
      const size = fitSize(img.naturalWidth, img.naturalHeight, SAMPLE_MAX_SIDE);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size.width, size.height);
      this.pixels = ctx.getImageData(0, 0, size.width, size.height).data;
      this.sampleSize = size;
    },
    runExtraction() {
      if (!this.pixels) return;
      const start = performance.now();
      this.palette = extractPalette(this.pixels, this.colorCount);
      this.elapsed = performance.now() - start;
      if (this.palette.length === 0) {
        this.error = '不透明なピクセルがないため、色を抽出できませんでした。';
      }
    },
    formatRatio(ratio) {
      return `${(ratio * 100).toFixed(1)}%`;
    },
    copyHex(hex) {
      navigator.clipboard.writeText(hex).then(
        () => {
          this.copiedHex = hex;
          clearTimeout(this.copyTimer);
          this.copyTimer = setTimeout(() => {
            this.copiedHex = '';
          }, 1000);
        },
        (error) => {
          console.error('Failed to copy text:', error);
        },
      );
    },
  },
};
</script>

<style scoped>
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 9rem;
  padding: 1rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  background: #f9fafb;
  cursor: pointer;
}

.dropzone:hover,
.dropzone.is-dragover {
  border-color: var(--tb-main);
  background: #f0fdf4;
}

.result-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .result-layout {
    grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
  }
}

.preview {
  max-width: 100%;
  max-height: 18rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  /* 透明部分が分かるように市松模様を敷く */
  background-image: linear-gradient(45deg, #ddd 25%, transparent 25%),
    linear-gradient(-45deg, #ddd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ddd 75%),
    linear-gradient(-45deg, transparent 75%, #ddd 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.band {
  display: flex;
  height: 4rem;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.band-item {
  flex-basis: 0;
  min-width: 4px;
}

.swatches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.swatch-card {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #fff;
}

.swatch-card:hover {
  border-color: var(--tb-main);
}

.swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 5rem;
}

.copied {
  font-size: 0.8rem;
  font-weight: bold;
}

.swatch-info {
  display: block;
  padding: 0.5rem 0.6rem;
}

.ratio {
  color: var(--tb-main);
  font-weight: bold;
}

.code {
  background: #f3f4f6;
  border-radius: 0.375rem;
  padding: 0.75rem;
  font-size: 0.85rem;
  overflow-x: auto;
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
</style>
