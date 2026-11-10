<template>
  <div class="dev-tool cat-dev flex flex-col space-y-4">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span class="font-bold">方式:</span>
      <label v-for="m in methods" :key="m.value" class="inline-flex items-center gap-1 cursor-pointer">
        <input type="radio" name="encode-method" :value="m.value" v-model="method" class="accent-radio" />
        {{ m.label }}
      </label>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span class="font-bold">方向:</span>
      <label class="inline-flex items-center gap-1 cursor-pointer">
        <input type="radio" name="encode-direction" value="encode" v-model="direction" class="accent-radio" />
        エンコード
      </label>
      <label class="inline-flex items-center gap-1 cursor-pointer">
        <input type="radio" name="encode-direction" value="decode" v-model="direction" class="accent-radio" />
        デコード
      </label>
      <button
        type="button"
        class="swap-button text-white font-bold py-1 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!canSwap"
        @click="swap"
      >
        ⇅ 入れ替え
      </button>
    </div>

    <div>
      <label class="block font-bold mb-1" for="encode-input">入力</label>
      <textarea
        id="encode-input"
        v-model="input"
        class="border rounded-md p-3 w-full h-32 font-mono"
        :placeholder="direction === 'encode' ? 'エンコードするテキスト' : 'デコードするテキスト'"
      ></textarea>
      <p v-if="result.error" class="text-red-600 mt-1">{{ result.error }}</p>
    </div>

    <div>
      <div class="flex items-center gap-2 mb-1">
        <label class="font-bold" for="encode-output">出力</label>
        <copy-button :text-to-copy="result.output" />
      </div>
      <textarea
        id="encode-output"
        :value="result.output"
        readonly
        class="border rounded-md p-3 w-full h-32 font-mono bg-gray-50"
      ></textarea>
    </div>

    <div v-if="result.hexDump">
      <div class="flex items-center gap-2 mb-1">
        <span class="font-bold">16進ダンプ</span>
        <copy-button :text-to-copy="result.hexDump" />
      </div>
      <pre class="border rounded-md p-3 w-full overflow-x-auto font-mono text-sm bg-gray-50">{{ result.hexDump }}</pre>
    </div>

    <div class="pt-4 border-t">
      <h2 class="section-heading font-bold text-lg mb-2">画像 → Data URI</h2>
      <input type="file" accept="image/*" @change="onFileChange" />
      <p v-if="imageWarning" class="text-yellow-700 mt-1">{{ imageWarning }}</p>
      <p v-if="imageError" class="text-red-600 mt-1">{{ imageError }}</p>
      <div v-if="dataUri" class="mt-2 space-y-2">
        <img :src="dataUri" alt="プレビュー" class="max-w-xs max-h-48 border rounded" />
        <div class="flex items-center gap-2">
          <span class="font-bold">Data URI</span>
          <span class="text-sm text-gray-600">({{ dataUri.length.toLocaleString() }} 文字)</span>
          <copy-button :text-to-copy="dataUri" />
        </div>
        <textarea :value="dataUri" readonly class="border rounded-md p-3 w-full h-24 font-mono text-sm bg-gray-50"></textarea>
      </div>
    </div>
  </div>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue';

const IMAGE_WARN_BYTES = 2 * 1024 * 1024;

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hexDump(bytes) {
  const lines = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const row = bytes.subarray(offset, offset + 16);
    const hex = Array.from(row, (b) => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(row, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex.padEnd(47, ' ')}  ${ascii}`);
  }
  return lines.join('\n');
}

const HTML_ENCODE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function codePointToString(cp) {
  if (!Number.isFinite(cp) || cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) {
    return '�';
  }
  return String.fromCodePoint(cp);
}

let entityParser = null;
function decodeNamedEntity(entity) {
  // entity は "&name;" 形式（英数字のみ）なので、マークアップとして解釈される余地はない
  if (!entityParser) entityParser = new DOMParser();
  const doc = entityParser.parseFromString(`<!doctype html><body>${entity}`, 'text/html');
  return doc.body.textContent;
}

export default {
  name: 'EncodeDecode',
  components: {
    CopyButton,
  },
  data() {
    return {
      methods: [
        { value: 'base64', label: 'Base64' },
        { value: 'base64url', label: 'Base64URL' },
        { value: 'uriComponent', label: 'URL(Component)' },
        { value: 'uri', label: 'URL(全体)' },
        { value: 'html', label: 'HTML' },
      ],
      method: 'base64',
      direction: 'encode',
      input: '',
      dataUri: '',
      imageWarning: '',
      imageError: '',
    };
  },
  computed: {
    result() {
      if (this.input === '') return { output: '', error: '', hexDump: '' };
      try {
        return { output: this.convert(this.input), error: '', hexDump: '' };
      } catch (e) {
        return { output: '', error: e.message || String(e), hexDump: e.hexDump || '' };
      }
    },
    canSwap() {
      return !this.result.error && this.result.output !== '';
    },
  },
  methods: {
    convert(text) {
      const encode = this.direction === 'encode';
      switch (this.method) {
        case 'base64':
          return encode ? this.encodeBase64(text) : this.decodeBase64(text);
        case 'base64url':
          return encode
            ? this.encodeBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
            : this.decodeBase64(this.base64UrlToBase64(text));
        case 'uriComponent':
          return encode ? this.wrapUri(encodeURIComponent, text) : this.wrapUri(decodeURIComponent, text);
        case 'uri':
          return encode ? this.wrapUri(encodeURI, text) : this.wrapUri(decodeURI, text);
        case 'html':
          return encode ? this.encodeHtml(text) : this.decodeHtml(text);
        default:
          return '';
      }
    },
    encodeBase64(text) {
      return bytesToBase64(new TextEncoder().encode(text));
    },
    decodeBase64(text) {
      const cleaned = text.replace(/\s+/g, '');
      let bytes;
      try {
        bytes = base64ToBytes(cleaned);
      } catch (e) {
        throw new Error('不正な Base64 文字列です');
      }
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch (e) {
        const err = new Error('UTF-8 として解釈できません（バイナリデータの可能性があります。16進ダンプを表示します）');
        err.hexDump = hexDump(bytes);
        throw err;
      }
    },
    base64UrlToBase64(text) {
      const cleaned = text.replace(/\s+/g, '');
      if (/[+/]/.test(cleaned)) {
        throw new Error('不正な Base64URL 文字列です（"+" や "/" は使えません）');
      }
      const b64 = cleaned.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
      if (b64.length % 4 === 1) {
        throw new Error('不正な Base64URL 文字列です');
      }
      return b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    },
    wrapUri(fn, text) {
      try {
        return fn(text);
      } catch (e) {
        if (e instanceof URIError) {
          throw new Error(
            this.direction === 'encode'
              ? 'エンコードできない文字（対になっていないサロゲート）が含まれています'
              : '不正な % シーケンスが含まれています',
          );
        }
        throw e;
      }
    },
    encodeHtml(text) {
      return text.replace(/[&<>"']/g, (c) => HTML_ENCODE_MAP[c]);
    },
    decodeHtml(text) {
      return text.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
        if (body[0] === '#') {
          const isHex = body[1] === 'x' || body[1] === 'X';
          return codePointToString(parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10));
        }
        return decodeNamedEntity(match);
      });
    },
    swap() {
      if (!this.canSwap) return;
      this.input = this.result.output;
      this.direction = this.direction === 'encode' ? 'decode' : 'encode';
    },
    onFileChange(event) {
      const file = event.target.files && event.target.files[0];
      this.dataUri = '';
      this.imageWarning = '';
      this.imageError = '';
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        this.imageError = '画像ファイルを選択してください';
        return;
      }
      if (file.size > IMAGE_WARN_BYTES) {
        this.imageWarning = `ファイルサイズが 2MB を超えています（${(file.size / 1024 / 1024).toFixed(2)} MB）。Data URI が非常に長くなります。`;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.dataUri = reader.result;
      };
      reader.onerror = () => {
        this.imageError = 'ファイルの読み込みに失敗しました';
      };
      reader.readAsDataURL(file);
    },
  },
};
</script>

<style scoped>
.accent-radio {
  accent-color: var(--tb-main);
}
.swap-button {
  background-color: var(--tb-main);
}
.swap-button:not(:disabled):hover {
  background-color: var(--tb-main-hover);
}
.section-heading {
  color: var(--tb-main);
}
</style>
