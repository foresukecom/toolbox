<template>
  <div class="dev-tool cat-image image-converter">
    <section class="mb-6">
      <label
        for="ic-file"
        class="dropzone"
        :class="{ dragover: isDragOver }"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleDrop"
      >
        <span class="dropzone-title">画像ファイルを選択するか、ここにドラッグ・アンド・ドロップ</span>
        <span class="hint">複数選択できます。画像はブラウザ内で処理され、外部には送信されません。</span>
        <input id="ic-file" ref="fileInput" type="file" class="hidden" accept="image/*" multiple @change="handleFileChange" />
      </label>
    </section>

    <section class="mb-6">
      <h2 class="section-title">変換設定</h2>
      <div class="settings">
        <div class="setting-row">
          <span class="setting-label">出力形式</span>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <label v-for="f in formats" :key="f.mime" class="inline-flex items-center gap-1">
              <input v-model="outputMime" type="radio" :value="f.mime" />
              {{ f.label }}
            </label>
          </div>
        </div>

        <div v-if="currentFormat.lossy" class="setting-row">
          <label class="setting-label" for="ic-quality">品質</label>
          <div class="flex items-center gap-2 grow">
            <input id="ic-quality" v-model.number="quality" type="range" min="1" max="100" class="quality-range" />
            <span class="font-mono w-10 text-right">{{ quality }}</span>
          </div>
        </div>
        <p v-else class="hint setting-note">PNG は可逆圧縮のため品質の指定はありません。</p>

        <div class="setting-row">
          <span class="setting-label">リサイズ</span>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <label v-for="m in resizeModes" :key="m.value" class="inline-flex items-center gap-1">
              <input v-model="resizeMode" type="radio" :value="m.value" />
              {{ m.label }}
            </label>
          </div>
        </div>

        <div v-if="resizeMode === 'size'" class="setting-row">
          <span class="setting-label"></span>
          <div class="flex flex-wrap items-center gap-2">
            <label class="inline-flex items-center gap-1">
              幅
              <input v-model.number="targetWidth" type="number" min="1" class="num-input" placeholder="自動" />
            </label>
            <span>×</span>
            <label class="inline-flex items-center gap-1">
              高さ
              <input v-model.number="targetHeight" type="number" min="1" class="num-input" placeholder="自動" />
            </label>
            <span>px</span>
            <label class="inline-flex items-center gap-1 ml-2">
              <input v-model="keepAspect" type="checkbox" />
              縦横比を維持
            </label>
          </div>
        </div>
        <p v-if="resizeMode === 'size'" class="hint setting-note">
          {{ keepAspect ? '縦横比を維持する場合、両方指定するとその枠内に収まるように縮小します。片方だけでも指定できます。' : '縦横比を維持しない場合、未指定の辺は元のままです。' }}
        </p>

        <div v-if="resizeMode === 'longEdge'" class="setting-row">
          <span class="setting-label"></span>
          <label class="inline-flex items-center gap-1">
            長辺を
            <input v-model.number="longEdge" type="number" min="1" class="num-input" />
            px 以下にする
          </label>
        </div>

        <div v-if="resizeMode === 'scale'" class="setting-row">
          <span class="setting-label"></span>
          <label class="inline-flex items-center gap-1">
            <input v-model.number="scale" type="number" min="1" max="1000" class="num-input" />
            %
          </label>
        </div>

        <div v-if="resizeMode !== 'none'" class="setting-row">
          <span class="setting-label"></span>
          <label class="inline-flex items-center gap-1">
            <input v-model="noUpscale" type="checkbox" />
            元より大きくしない
          </label>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 mt-4">
        <button type="button" class="tb-button primary" :disabled="!items.length || processing" @click="convertAll">
          {{ hasStale ? 'この設定で再変換' : '変換する' }}
        </button>
        <button type="button" class="tb-button" :disabled="!doneItems.length || processing || downloadingAll" @click="downloadAll">
          まとめてダウンロード（{{ doneItems.length }}件）
        </button>
        <button type="button" class="tb-button" :disabled="!items.length" @click="clearAll">クリア</button>
      </div>
      <p v-if="hasStale && !processing" class="notice mt-2">設定が変更されました。「この設定で再変換」を押すと反映されます。</p>
      <p v-if="doneItems.length > 1" class="hint mt-2">まとめてダウンロードは1件ずつ連続でダウンロードします。ブラウザから複数ダウンロードの許可を求められた場合は許可してください。</p>
    </section>

    <section v-if="processing || progressTotal" class="mb-6" aria-live="polite">
      <div class="progress-text">
        <span v-if="processing">処理中… {{ progressDone }} / {{ progressTotal }} 枚</span>
        <span v-else>完了 {{ progressDone }} / {{ progressTotal }} 枚</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" :style="{ width: progressPercent + '%' }"></div></div>
    </section>

    <section v-if="items.length" class="mb-6">
      <h2 class="section-title">結果</h2>
      <div v-if="doneItems.length" class="totals mb-3">
        合計: {{ formatBytes(totalBefore) }} → {{ formatBytes(totalAfter) }}
        <span :class="rateClass(totalRate)">（{{ rateText(totalRate) }}）</span>
      </div>
      <ul class="result-list">
        <li
          v-for="item in items"
          :key="item.id"
          class="result-item"
          :class="{ selected: item.id === selectedId }"
        >
          <button type="button" class="thumb" :title="'プレビューを表示: ' + item.file.name" @click="selectedId = item.id">
            <img v-if="item.result" :src="item.result.url" alt="" />
            <img v-else-if="item.srcUrl" :src="item.srcUrl" alt="" />
          </button>
          <div class="result-body">
            <div class="file-name" :title="item.file.name">{{ item.file.name }}</div>
            <table class="size-table">
              <tbody>
                <tr>
                  <th>変換前</th>
                  <td>{{ typeLabel(item.file.type) }}</td>
                  <td class="font-mono">{{ item.srcWidth ? item.srcWidth + '×' + item.srcHeight : '-' }}</td>
                  <td class="font-mono text-right">{{ formatBytes(item.file.size) }}</td>
                </tr>
                <tr>
                  <th>変換後</th>
                  <template v-if="item.result">
                    <td>{{ item.result.label }}</td>
                    <td class="font-mono">{{ item.result.width }}×{{ item.result.height }}</td>
                    <td class="font-mono text-right">{{ formatBytes(item.result.size) }}</td>
                  </template>
                  <td v-else colspan="3" class="hint">{{ statusText(item) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="item.result" class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span :class="rateClass(item.result.rate)">{{ rateText(item.result.rate) }}</span>
              <button type="button" class="tb-button small" @click="download(item)">ダウンロード</button>
              <span v-if="item.stale" class="notice text-sm">設定変更前の結果</span>
            </div>
            <p v-if="item.result && item.result.warning" class="notice text-sm mt-1">{{ item.result.warning }}</p>
            <p v-if="item.error" class="error text-sm mt-1">{{ item.error }}</p>
          </div>
          <button type="button" class="remove" title="一覧から外す" aria-label="一覧から外す" :disabled="processing" @click="removeItem(item)">×</button>
        </li>
      </ul>
    </section>

    <section v-if="selectedItem" class="mb-6">
      <h2 class="section-title">プレビュー（前後比較）</h2>
      <p class="hint mb-2">{{ selectedItem.file.name }}（一覧のサムネイルをクリックすると切り替わります）</p>
      <div class="compare">
        <figure>
          <figcaption>変換前（{{ selectedItem.srcWidth ? selectedItem.srcWidth + '×' + selectedItem.srcHeight : '-' }}, {{ formatBytes(selectedItem.file.size) }}）</figcaption>
          <div class="compare-box"><img v-if="selectedItem.srcUrl" :src="selectedItem.srcUrl" alt="変換前" /></div>
        </figure>
        <figure>
          <figcaption>
            変換後
            <template v-if="selectedItem.result">（{{ selectedItem.result.width }}×{{ selectedItem.result.height }}, {{ formatBytes(selectedItem.result.size) }}）</template>
          </figcaption>
          <div class="compare-box">
            <img v-if="selectedItem.result" :src="selectedItem.result.url" alt="変換後" />
            <span v-else class="hint">{{ statusText(selectedItem) }}</span>
          </div>
        </figure>
      </div>
      <p class="hint mt-2">プレビューは枠に合わせて縮小表示しています。画質の違いは画像を拡大して確認してください。</p>
    </section>
  </div>
</template>

<script>
import {
  OUTPUT_FORMATS,
  formatByMime,
  computeTargetSize,
  outputFileName,
  reductionRate,
  formatBytes,
} from '@/utilities/imageResize';

// canvas で安全に扱える出力サイズの上限
const MAX_EDGE = 16384;
const MAX_AREA = 100000000;

// 元画像の形式名（表示用）
const TYPE_LABELS = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'image/bmp': 'BMP',
  'image/svg+xml': 'SVG',
  'image/avif': 'AVIF',
  'image/heic': 'HEIC',
  'image/tiff': 'TIFF',
};

let nextId = 1;

export default {
  name: 'ImageConverter',
  data() {
    return {
      formats: OUTPUT_FORMATS,
      resizeModes: [
        { value: 'none', label: 'しない' },
        { value: 'size', label: '幅・高さ' },
        { value: 'longEdge', label: '長辺の最大値' },
        { value: 'scale', label: '拡大縮小率' },
      ],
      outputMime: 'image/jpeg',
      quality: 80,
      resizeMode: 'none',
      targetWidth: 1280,
      targetHeight: null,
      keepAspect: true,
      longEdge: 1920,
      scale: 50,
      noUpscale: true,
      // { id, file, srcUrl, srcWidth, srcHeight, status: 'pending'|'processing'|'done'|'error', result, error, stale, settingsKey }
      items: [],
      selectedId: null,
      isDragOver: false,
      processing: false,
      downloadingAll: false,
      progressDone: 0,
      progressTotal: 0,
    };
  },
  computed: {
    currentFormat() {
      return formatByMime(this.outputMime);
    },
    resizeOptions() {
      return {
        mode: this.resizeMode,
        width: this.targetWidth,
        height: this.targetHeight,
        keepAspect: this.keepAspect,
        longEdge: this.longEdge,
        scale: this.scale,
        noUpscale: this.noUpscale,
      };
    },
    // 変換結果に影響する設定をまとめた文字列（設定変更の検知用）
    settingsKey() {
      return JSON.stringify({
        mime: this.outputMime,
        quality: this.currentFormat.lossy ? this.quality : null,
        resize: this.resizeOptions,
      });
    },
    doneItems() {
      return this.items.filter((it) => it.result);
    },
    hasStale() {
      return this.items.some((it) => it.result && it.settingsKey !== this.settingsKey);
    },
    selectedItem() {
      return this.items.find((it) => it.id === this.selectedId) || null;
    },
    progressPercent() {
      return this.progressTotal ? (this.progressDone / this.progressTotal) * 100 : 0;
    },
    totalBefore() {
      return this.doneItems.reduce((s, it) => s + it.file.size, 0);
    },
    totalAfter() {
      return this.doneItems.reduce((s, it) => s + it.result.size, 0);
    },
    totalRate() {
      return reductionRate(this.totalBefore, this.totalAfter);
    },
  },
  watch: {
    settingsKey(key) {
      this.items.forEach((it) => {
        it.stale = !!it.result && it.settingsKey !== key;
      });
    },
  },
  created() {
    // 処理の世代番号。クリアやアンマウントで進行中の処理を打ち切るのに使う
    this.generation = 0;
    this.downloadTimer = null;
  },
  beforeUnmount() {
    this.generation++;
    if (this.downloadTimer) clearTimeout(this.downloadTimer);
    this.items.forEach((it) => this.revokeItem(it));
  },
  methods: {
    formatBytes,
    typeLabel(mime) {
      return TYPE_LABELS[mime] || mime || '不明';
    },
    rateText(rate) {
      if (Math.abs(rate) < 0.05) return '変化なし';
      return rate > 0 ? `${rate.toFixed(1)}% 削減` : `${(-rate).toFixed(1)}% 増加`;
    },
    rateClass(rate) {
      return rate >= 0 ? 'rate-down' : 'rate-up';
    },
    statusText(item) {
      if (item.status === 'processing') return '変換中…';
      if (item.status === 'error') return '変換できませんでした';
      return '待機中';
    },
    handleDrop(e) {
      this.isDragOver = false;
      this.addFiles(e.dataTransfer.files);
    },
    handleFileChange(e) {
      this.addFiles(e.target.files);
      // 同じファイルを続けて選べるように値を空にする
      e.target.value = '';
    },
    addFiles(fileList) {
      const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;
      const added = files.map((file) => ({
        id: nextId++,
        file,
        srcUrl: URL.createObjectURL(file),
        srcWidth: 0,
        srcHeight: 0,
        status: 'pending',
        result: null,
        error: null,
        stale: false,
        settingsKey: null,
      }));
      this.items.push(...added);
      if (this.selectedId === null) this.selectedId = added[0].id;
      // 追加分は現在の設定ですぐ変換する（リアクティブな要素を渡す）
      if (!this.processing) this.runQueue(this.items.slice(-added.length));
    },
    convertAll() {
      if (this.processing) return;
      this.runQueue(this.items.slice());
    },
    // 1 枚ずつ順に変換する。各枚の間で描画の機会を与えてフリーズを防ぐ
    async runQueue(targets) {
      const gen = ++this.generation;
      this.processing = true;
      this.progressDone = 0;
      this.progressTotal = targets.length;
      for (const item of targets) {
        if (gen !== this.generation) return;
        if (!this.items.includes(item)) {
          this.progressDone++;
          continue;
        }
        item.status = 'processing';
        await new Promise((resolve) => setTimeout(resolve, 0));
        // 変換中に設定が変わっても混ざらないよう、開始時点の設定で処理する
        const key = this.settingsKey;
        const settings = {
          format: this.currentFormat,
          quality: this.quality,
          resize: { ...this.resizeOptions },
        };
        try {
          const result = await this.convertOne(item.file, settings);
          if (gen !== this.generation) {
            URL.revokeObjectURL(result.url);
            return;
          }
          if (item.result) URL.revokeObjectURL(item.result.url);
          item.srcWidth = result.srcWidth;
          item.srcHeight = result.srcHeight;
          item.result = result;
          item.error = null;
          item.status = 'done';
          item.settingsKey = key;
          item.stale = key !== this.settingsKey;
        } catch (e) {
          if (gen !== this.generation) return;
          if (item.result) URL.revokeObjectURL(item.result.url);
          item.result = null;
          item.status = 'error';
          item.error = e.message || String(e);
        }
        this.progressDone++;
      }
      if (gen === this.generation) this.processing = false;
    },
    // EXIF の向きを反映して画像をデコードする
    async decode(file) {
      if (typeof createImageBitmap === 'function') {
        try {
          return await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch (e) {
          // オプション未対応や SVG などは <img> での読み込みにフォールバック
        }
      }
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        await img.decode();
        // <img> は既定で EXIF の向きを反映する（image-orientation: from-image）
        return img;
      } catch (e) {
        throw new Error('この画像はブラウザで読み込めませんでした（未対応の形式の可能性があります）');
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    async convertOne(file, settings) {
      const source = await this.decode(file);
      const srcWidth = source.naturalWidth || source.width;
      const srcHeight = source.naturalHeight || source.height;
      try {
        if (!srcWidth || !srcHeight) throw new Error('画像の寸法を取得できませんでした');
        const { width, height } = computeTargetSize(srcWidth, srcHeight, settings.resize);
        if (width > MAX_EDGE || height > MAX_EDGE || width * height > MAX_AREA) {
          throw new Error(`出力サイズ ${width}×${height} が大きすぎます（1辺 ${MAX_EDGE}px、1億ピクセルまで）`);
        }
        const fmt = settings.format;
        const canvas = this.drawResized(source, srcWidth, srcHeight, width, height, fmt.mime === 'image/jpeg');
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, fmt.mime, fmt.lossy ? settings.quality / 100 : undefined);
        });
        // メモリを早めに解放する
        canvas.width = 0;
        canvas.height = 0;
        if (!blob) throw new Error('画像の書き出しに失敗しました');

        // 未対応の形式を指定すると PNG で返ってくるので、実際の形式で扱う
        const actual = formatByMime(blob.type) || formatByMime('image/png');
        const warning = blob.type !== fmt.mime
          ? `このブラウザは ${fmt.label} の書き出しに対応していないため、${actual.label} で出力しました。`
          : null;
        return {
          url: URL.createObjectURL(blob),
          blob,
          size: blob.size,
          width,
          height,
          srcWidth,
          srcHeight,
          label: actual.label,
          fileName: outputFileName(file.name, width, height, actual.ext),
          rate: reductionRate(file.size, blob.size),
          warning,
        };
      } finally {
        if (source.close) source.close();
      }
    },
    // 大きく縮小する場合は半分ずつ段階的に縮めて、ジャギーやモアレを抑える
    drawResized(source, srcW, srcH, width, height, fillWhite) {
      let current = source;
      let cw = srcW;
      let ch = srcH;
      while (cw / 2 >= width && ch / 2 >= height) {
        const step = document.createElement('canvas');
        step.width = Math.round(cw / 2);
        step.height = Math.round(ch / 2);
        const sctx = step.getContext('2d');
        sctx.imageSmoothingQuality = 'high';
        sctx.drawImage(current, 0, 0, cw, ch, 0, 0, step.width, step.height);
        if (current !== source) {
          current.width = 0;
          current.height = 0;
        }
        current = step;
        cw = step.width;
        ch = step.height;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (fillWhite) {
        // JPEG は透過を持てないので白で塗ってから描く
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(current, 0, 0, cw, ch, 0, 0, width, height);
      if (current !== source) {
        current.width = 0;
        current.height = 0;
      }
      return canvas;
    },
    download(item) {
      if (!item.result) return;
      const link = document.createElement('a');
      link.href = item.result.url;
      link.download = item.result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    // 連続でクリックするとブラウザに間引かれることがあるので、間隔をあけて 1 件ずつ落とす
    downloadAll() {
      const queue = this.doneItems.slice();
      if (!queue.length) return;
      this.downloadingAll = true;
      const next = () => {
        const item = queue.shift();
        if (!item) {
          this.downloadTimer = null;
          this.downloadingAll = false;
          return;
        }
        this.download(item);
        this.downloadTimer = setTimeout(next, 400);
      };
      next();
    },
    revokeItem(item) {
      if (item.srcUrl) URL.revokeObjectURL(item.srcUrl);
      if (item.result) URL.revokeObjectURL(item.result.url);
    },
    removeItem(item) {
      this.revokeItem(item);
      this.items = this.items.filter((it) => it !== item);
      if (this.selectedId === item.id) {
        this.selectedId = this.items.length ? this.items[0].id : null;
      }
    },
    clearAll() {
      // 進行中の変換は打ち切る
      this.generation++;
      if (this.downloadTimer) {
        clearTimeout(this.downloadTimer);
        this.downloadTimer = null;
      }
      this.items.forEach((it) => this.revokeItem(it));
      this.items = [];
      this.selectedId = null;
      this.processing = false;
      this.downloadingAll = false;
      this.progressDone = 0;
      this.progressTotal = 0;
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

.error {
  color: #b91c1c;
}

.notice {
  color: #b45309;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 9rem;
  padding: 1rem;
  text-align: center;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  background: #f9fafb;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.dropzone:hover,
.dropzone.dragover {
  background: #f0f7f3;
  border-color: var(--tb-main);
}

.dropzone-title {
  font-weight: bold;
}

.settings {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.setting-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 1rem;
}

.setting-label {
  width: 5rem;
  flex-shrink: 0;
  font-weight: bold;
}

.setting-note {
  padding-left: 6rem;
}

.quality-range {
  flex: 1;
  max-width: 20rem;
  min-width: 8rem;
  accent-color: var(--tb-main);
}

.num-input {
  width: 6rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
}

.tb-button {
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  background: #fff;
  border-radius: 0.375rem;
  padding: 0.45rem 1rem;
  font-size: 0.9rem;
}

.tb-button:hover:not(:disabled) {
  background: var(--tb-main-hover);
  border-color: var(--tb-main-hover);
  color: #fff;
}

.tb-button.primary {
  background: var(--tb-main);
  color: #fff;
}

.tb-button.small {
  padding: 0.15rem 0.6rem;
  font-size: 0.8rem;
}

.tb-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.progress-text {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.progress-bar {
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--tb-main);
  transition: width 0.2s ease;
}

.totals {
  font-weight: bold;
}

.rate-down {
  color: var(--tb-main);
  font-weight: bold;
}

.rate-up {
  color: #b91c1c;
  font-weight: bold;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-item {
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 2rem 0.75rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.result-item.selected {
  border-color: var(--tb-main);
  box-shadow: 0 0 0 1px var(--tb-main);
}

.thumb {
  flex-shrink: 0;
  width: 5.5rem;
  height: 5.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  overflow: hidden;
  /* 透過部分が分かるように市松模様にする */
  background: repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 16px 16px;
  cursor: pointer;
}

.thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.result-body {
  min-width: 0;
  flex: 1;
}

.file-name {
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.size-table {
  font-size: 0.875rem;
  border-collapse: collapse;
}

.size-table th,
.size-table td {
  padding: 0.1rem 0.75rem 0.1rem 0;
  text-align: left;
  white-space: nowrap;
}

.size-table td.text-right {
  text-align: right;
}

.remove {
  position: absolute;
  top: 0.4rem;
  right: 0.5rem;
  width: 1.5rem;
  height: 1.5rem;
  line-height: 1.5rem;
  color: #6b7280;
  border-radius: 9999px;
}

.remove:hover:not(:disabled) {
  background: #f3f4f6;
  color: #111827;
}

.remove:disabled {
  opacity: 0.3;
}

.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.compare figure {
  min-width: 0;
  margin: 0;
}

.compare figcaption {
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
  overflow-wrap: anywhere;
}

.compare-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 16px 16px;
  overflow: hidden;
}

.compare-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

@media (max-width: 640px) {
  .setting-note {
    padding-left: 0;
  }

  .compare {
    grid-template-columns: 1fr;
  }

  .compare-box {
    height: 14rem;
  }

  .thumb {
    width: 4rem;
    height: 4rem;
  }

  .size-table th,
  .size-table td {
    padding-right: 0.5rem;
  }
}
</style>
