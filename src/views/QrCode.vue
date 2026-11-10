<template>
  <div class="dev-tool cat-image">
    <div class="qr-tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.value"
        type="button"
        role="tab"
        :aria-selected="tab === t.value"
        :class="['qr-tab', { 'qr-tab-active': tab === t.value }]"
        @click="switchTab(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 生成 -->
    <div v-if="tab === 'generate'" class="qr-panel">
      <div class="flex flex-wrap gap-4 mb-3">
        <label class="inline-flex items-center gap-1">
          <input v-model="inputMode" type="radio" value="text" />
          テキスト / URL
        </label>
        <label class="inline-flex items-center gap-1">
          <input v-model="inputMode" type="radio" value="wifi" />
          Wi-Fi 接続
        </label>
      </div>

      <div class="qr-generate">
        <div class="qr-form">
          <template v-if="inputMode === 'text'">
            <label for="qr-text" class="qr-label">内容</label>
            <textarea
              id="qr-text"
              v-model="text"
              class="qr-textarea"
              spellcheck="false"
              placeholder="https://example.com/"
            ></textarea>
            <p class="hint mt-1">{{ textLength }} 文字（UTF-8 で {{ byteLength }} バイト）</p>
          </template>

          <template v-else>
            <label for="qr-ssid" class="qr-label">SSID（ネットワーク名）</label>
            <input id="qr-ssid" v-model="wifi.ssid" type="text" class="qr-input" autocomplete="off" spellcheck="false" />
            <label for="qr-enc" class="qr-label mt-3">暗号化方式</label>
            <select id="qr-enc" v-model="wifi.encryption" class="qr-input">
              <option value="WPA">WPA / WPA2 / WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">なし</option>
            </select>
            <template v-if="wifi.encryption !== 'nopass'">
              <label for="qr-pass" class="qr-label mt-3">パスワード</label>
              <input id="qr-pass" v-model="wifi.password" type="text" class="qr-input" autocomplete="off" spellcheck="false" />
            </template>
            <label class="inline-flex items-center gap-1 mt-3">
              <input v-model="wifi.hidden" type="checkbox" />
              ステルス（SSID 非公開）のネットワーク
            </label>
            <p class="qr-label mt-3">生成される文字列</p>
            <p class="qr-code-text font-mono break-all">{{ qrText }}</p>
          </template>

          <div class="qr-options mt-4">
            <label>
              <span class="qr-label">誤り訂正レベル</span>
              <select v-model="errorCorrectionLevel" class="qr-input">
                <option v-for="l in levels" :key="l.value" :value="l.value">{{ l.label }}</option>
              </select>
            </label>
            <label>
              <span class="qr-label">サイズ（px）</span>
              <input v-model.number="size" type="number" min="64" max="2048" step="16" class="qr-input" />
            </label>
            <label>
              <span class="qr-label">余白（セル数）</span>
              <input v-model.number="margin" type="number" min="0" max="16" class="qr-input" />
            </label>
            <label>
              <span class="qr-label">前景色</span>
              <input v-model="foreground" type="color" class="qr-color" />
            </label>
            <label>
              <span class="qr-label">背景色</span>
              <input v-model="background" type="color" class="qr-color" />
            </label>
          </div>
        </div>

        <div class="qr-preview">
          <p v-if="generateError" class="error">{{ generateError }}</p>
          <p v-else-if="!qrText" class="hint">内容を入力すると QR コードが表示されます。</p>
          <template v-else-if="pngUrl">
            <img :src="pngUrl" alt="生成した QR コード" class="qr-image" />
            <p class="hint mt-1">{{ moduleCount }} × {{ moduleCount }} セル（バージョン {{ version }}）</p>
            <div class="flex flex-wrap gap-2 mt-3">
              <a :href="pngUrl" download="qrcode.png" class="qr-button">PNG をダウンロード</a>
              <a :href="svgUrl" download="qrcode.svg" class="qr-button">SVG をダウンロード</a>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 読み取り -->
    <div v-else class="qr-panel">
      <label
        :class="['qr-drop', { 'qr-drop-over': dragOver }]"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <span class="font-bold">画像ファイルを選択</span>
        <span class="hint mt-1">ここにドラッグ&ドロップ、または Ctrl+V / ⌘+V で貼り付けもできます</span>
        <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
      </label>

      <div v-if="cameraSupported" class="mt-3">
        <button v-if="!cameraActive" type="button" class="qr-button" @click="startCamera">カメラで読み取る</button>
        <button v-else type="button" class="qr-button" @click="stopCamera">カメラを停止</button>
        <p v-if="cameraError" class="error mt-2">{{ cameraError }}</p>
        <video v-show="cameraActive" ref="video" class="qr-video mt-3" playsinline muted></video>
      </div>

      <p v-if="readStatus" class="hint mt-3">{{ readStatus }}</p>
      <p v-if="readError" class="error mt-3">{{ readError }}</p>

      <div v-if="readResult !== null" class="qr-result mt-4">
        <div class="flex items-center justify-between gap-2 mb-2">
          <h2 class="section-title mb-0">読み取り結果</h2>
          <CopyButton :textToCopy="readResult" />
        </div>
        <p class="qr-code-text font-mono break-all whitespace-pre-wrap">
          <a v-if="resultIsUrl" :href="readResult" target="_blank" rel="noopener noreferrer" class="qr-link">{{ readResult }}</a>
          <template v-else>{{ readResult }}</template>
        </p>
        <table v-if="resultWifi" class="qr-wifi mt-3">
          <tbody>
            <tr><th>SSID</th><td class="font-mono break-all">{{ resultWifi.ssid }}</td><td><CopyButton :textToCopy="resultWifi.ssid" /></td></tr>
            <tr><th>暗号化</th><td>{{ resultWifi.encryption }}</td><td></td></tr>
            <tr v-if="resultWifi.password"><th>パスワード</th><td class="font-mono break-all">{{ resultWifi.password }}</td><td><CopyButton :textToCopy="resultWifi.password" /></td></tr>
            <tr v-if="resultWifi.hidden"><th>ステルス</th><td>はい</td><td></td></tr>
          </tbody>
        </table>
      </div>

      <img v-if="previewUrl" :src="previewUrl" alt="読み取った画像" class="qr-source mt-4" />
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import CopyButton from '@/components/CopyButton.vue';
import { buildWifiString, parseWifiString, isHttpUrl, decodeQrBytes, fitSize } from '@/utilities/qrCode.js';

// 画像読み取り時に試す長辺のサイズ（大きい順）
const SCAN_SIDES = [1200, 600];
// カメラ読み取りの間隔（ミリ秒）と解析サイズ
const CAMERA_INTERVAL = 200;
const CAMERA_SIDE = 640;

export default {
  name: 'QrCode',
  components: { CopyButton },
  data() {
    return {
      tab: 'generate',
      tabs: [
        { value: 'generate', label: '生成' },
        { value: 'read', label: '読み取り' },
      ],
      // 生成
      inputMode: 'text',
      text: 'https://example.com/',
      wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
      errorCorrectionLevel: 'M',
      levels: [
        { value: 'L', label: 'L（約7%）' },
        { value: 'M', label: 'M（約15%）' },
        { value: 'Q', label: 'Q（約25%）' },
        { value: 'H', label: 'H（約30%）' },
      ],
      size: 256,
      margin: 4,
      foreground: '#000000',
      background: '#ffffff',
      pngUrl: '',
      svgUrl: '',
      moduleCount: 0,
      version: 0,
      generateError: '',
      // 読み取り
      dragOver: false,
      previewUrl: '',
      readResult: null,
      readError: '',
      readStatus: '',
      cameraActive: false,
      cameraError: '',
    };
  },
  computed: {
    qrText() {
      if (this.inputMode === 'wifi') {
        return this.wifi.ssid ? buildWifiString(this.wifi) : '';
      }
      return this.text;
    },
    textLength() {
      return [...this.text].length;
    },
    byteLength() {
      return new TextEncoder().encode(this.text).length;
    },
    genOptions() {
      const size = Math.min(2048, Math.max(64, Number(this.size) || 256));
      const margin = Math.min(16, Math.max(0, Math.floor(Number(this.margin) || 0)));
      return {
        errorCorrectionLevel: this.errorCorrectionLevel,
        width: size,
        margin,
        color: { dark: this.foreground, light: this.background },
      };
    },
    resultIsUrl() {
      return this.readResult !== null && isHttpUrl(this.readResult);
    },
    resultWifi() {
      return this.readResult !== null ? parseWifiString(this.readResult) : null;
    },
    cameraSupported() {
      return typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },
  },
  watch: {
    qrText: 'generate',
    genOptions: 'generate',
  },
  created() {
    // リアクティブにしないもの
    this.genSeq = 0;
    this.stream = null;
    this.rafId = null;
    this.lastScan = 0;
    this.scanCanvas = null;
  },
  mounted() {
    window.addEventListener('paste', this.onPaste);
    this.generate();
  },
  beforeUnmount() {
    window.removeEventListener('paste', this.onPaste);
    this.stopCamera();
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  },
  methods: {
    switchTab(value) {
      if (value !== 'read') this.stopCamera();
      this.tab = value;
    },

    // ---- 生成 ----
    async generate() {
      const seq = ++this.genSeq;
      const text = this.qrText;
      if (!text) {
        this.pngUrl = '';
        this.svgUrl = '';
        this.generateError = '';
        return;
      }
      const options = this.genOptions;
      try {
        const qr = QRCode.create(text, { errorCorrectionLevel: options.errorCorrectionLevel });
        const [png, svg] = await Promise.all([
          QRCode.toDataURL(text, options),
          QRCode.toString(text, { ...options, type: 'svg' }),
        ]);
        // 入力が連続で変わったときは古い結果を捨てる
        if (seq !== this.genSeq) return;
        this.pngUrl = png;
        this.svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        this.moduleCount = qr.modules.size;
        this.version = qr.version;
        this.generateError = '';
      } catch (e) {
        if (seq !== this.genSeq) return;
        this.pngUrl = '';
        this.svgUrl = '';
        this.generateError = /too big/i.test(e.message)
          ? `文字数が多すぎて QR コードにできません（誤り訂正レベル ${options.errorCorrectionLevel}）。内容を減らすか、誤り訂正レベルを下げてください。`
          : `QR コードを生成できませんでした: ${e.message}`;
      }
    },

    // ---- 読み取り ----
    onFileChange(event) {
      const file = event.target.files && event.target.files[0];
      if (file) this.readFile(file);
      event.target.value = '';
    },
    onDrop(event) {
      this.dragOver = false;
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) this.readFile(file);
    },
    onPaste(event) {
      const items = event.clipboardData ? [...event.clipboardData.items] : [];
      const item = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
      if (!item) return;
      event.preventDefault();
      this.switchTab('read');
      this.readFile(item.getAsFile());
    },
    async readFile(file) {
      if (!file.type.startsWith('image/')) {
        this.readError = '画像ファイルを選択してください。';
        return;
      }
      this.stopCamera();
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = URL.createObjectURL(file);
      this.readResult = null;
      this.readError = '';
      this.readStatus = '読み取り中…';
      try {
        const img = await this.loadImage(this.previewUrl);
        // 描画を先に反映させてから解析する
        await new Promise((resolve) => setTimeout(resolve, 0));
        let code = null;
        for (const side of SCAN_SIDES) {
          code = this.scan(img, img.naturalWidth, img.naturalHeight, side);
          if (code) break;
        }
        this.readStatus = '';
        if (code) this.setResult(code);
        else this.readError = 'QR コードが見つかりませんでした。';
      } catch (e) {
        this.readStatus = '';
        this.readError = '画像を読み込めませんでした。';
      }
    },
    loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    },
    // source（画像・動画）を縮小して描画し、jsQR で解析する
    scan(source, width, height, maxSide) {
      const fit = fitSize(width, height, maxSide);
      if (!this.scanCanvas) this.scanCanvas = document.createElement('canvas');
      const canvas = this.scanCanvas;
      canvas.width = fit.width;
      canvas.height = fit.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, fit.width, fit.height);
      const data = ctx.getImageData(0, 0, fit.width, fit.height);
      return jsQR(data.data, fit.width, fit.height, { inversionAttempts: 'attemptBoth' });
    },
    setResult(code) {
      this.readResult = decodeQrBytes(code.binaryData, code.data);
      this.readError = '';
    },

    // ---- カメラ ----
    async startCamera() {
      this.cameraError = '';
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      } catch (e) {
        this.cameraError = 'カメラを使用できませんでした（許可されていないか、カメラがありません）。';
        return;
      }
      // 起動待ちの間にタブを切り替えた・画面を離れた場合
      if (this.tab !== 'read' || !this.$refs.video) {
        this.stopCamera();
        return;
      }
      this.cameraActive = true;
      this.readResult = null;
      this.readError = '';
      const video = this.$refs.video;
      video.srcObject = this.stream;
      try {
        await video.play();
      } catch (e) {
        // 再生できなくてもフレームが来れば解析できる
      }
      this.rafId = requestAnimationFrame(this.cameraLoop);
    },
    cameraLoop(now) {
      this.rafId = requestAnimationFrame(this.cameraLoop);
      const video = this.$refs.video;
      if (!video || video.readyState < 2 || now - this.lastScan < CAMERA_INTERVAL) return;
      this.lastScan = now;
      const code = this.scan(video, video.videoWidth, video.videoHeight, CAMERA_SIDE);
      if (code && code.data !== undefined) {
        this.setResult(code);
        this.stopCamera();
      }
    },
    stopCamera() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.$refs.video) this.$refs.video.srcObject = null;
      this.cameraActive = false;
    },
  },
};
</script>

<style scoped>
.qr-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid #d1d5db;
}

.qr-tab {
  padding: 0.375rem 1rem;
  color: #4b5563;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
  margin-bottom: -1px;
}

.qr-tab-active {
  color: var(--tb-main);
  font-weight: 700;
  border-color: #d1d5db;
  background-color: #fff;
}

.qr-panel {
  padding-top: 1rem;
}

.qr-generate {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .qr-generate {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

.qr-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.25rem;
}

.qr-input,
.qr-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
}

.qr-textarea {
  min-height: 8rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.qr-input:focus,
.qr-textarea:focus {
  outline: none;
  border-color: var(--tb-main);
  box-shadow: 0 0 0 1px var(--tb-main);
}

.qr-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 0.75rem;
}

.qr-color {
  width: 100%;
  height: 2.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.125rem;
  background: #fff;
  cursor: pointer;
}

.qr-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
}

.qr-image {
  max-width: 100%;
  height: auto;
  border: 1px solid #e5e7eb;
  image-rendering: pixelated;
}

.qr-code-text {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: #f9fafb;
  font-size: 0.875rem;
}

.qr-button {
  display: inline-block;
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: none;
}

.qr-button:hover {
  background-color: var(--tb-main);
  color: #fff;
}

.qr-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 9rem;
  padding: 1rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  background-color: #f9fafb;
  cursor: pointer;
}

.qr-drop:hover,
.qr-drop-over {
  border-color: var(--tb-main);
  background-color: #f0fdf4;
}

.qr-video,
.qr-source {
  display: block;
  max-width: 100%;
  max-height: 20rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.qr-link {
  color: var(--tb-main);
  text-decoration: underline;
}

.qr-wifi th,
.qr-wifi td {
  padding: 0.25rem 0.5rem 0.25rem 0;
  text-align: left;
  vertical-align: middle;
}

.qr-wifi th {
  white-space: nowrap;
}

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

.error {
  color: #b91c1c;
}
</style>
