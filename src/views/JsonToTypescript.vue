<template>
  <div class="dev-tool cat-dev">
    <div class="flex flex-wrap items-end gap-x-6 gap-y-3 mb-4">
      <div>
        <label for="j2t-root-name" class="j2t-label">ルート型名</label>
        <input
          id="j2t-root-name"
          v-model="rootName"
          type="text"
          class="j2t-input font-mono"
          placeholder="Root"
          spellcheck="false"
          autocomplete="off"
        />
      </div>

      <div>
        <span class="j2t-label">宣言の形式</span>
        <div class="flex gap-4 pb-1">
          <label v-for="d in declarations" :key="d.value" class="inline-flex items-center gap-1 text-sm">
            <input v-model="declaration" type="radio" :value="d.value" />
            <span class="font-mono">{{ d.label }}</span>
          </label>
        </div>
      </div>

      <div>
        <label for="j2t-optional" class="j2t-label">一部にしかないキー</label>
        <select id="j2t-optional" v-model="optional" class="j2t-select">
          <option v-for="o in optionalModes" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <div class="flex flex-wrap gap-x-4 gap-y-1 pb-1">
        <label class="inline-flex items-center gap-1 text-sm">
          <input v-model="exportTypes" type="checkbox" />
          <span><span class="font-mono">export</span> を付ける</span>
        </label>
        <label class="inline-flex items-center gap-1 text-sm">
          <input v-model="readonly" type="checkbox" />
          <span>すべて <span class="font-mono">readonly</span></span>
        </label>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
      <label for="j2t-input" class="j2t-label">JSON</label>
      <div class="flex gap-2">
        <button type="button" class="j2t-button" @click="loadSample">サンプルを入れる</button>
        <button type="button" class="j2t-button" :disabled="!input" @click="input = ''">クリア</button>
      </div>
    </div>
    <textarea
      id="j2t-input"
      v-model="input"
      class="j2t-textarea"
      spellcheck="false"
      wrap="off"
      placeholder='{"id": 1, "name": "山田", "tags": ["a", "b"]}'
    ></textarea>

    <div v-if="error" class="j2t-error" role="alert">
      <p>{{ error.line }}行目 {{ error.column }}列目: {{ error.message }}</p>
      <pre class="j2t-error-snippet">{{ errorSnippet }}</pre>
    </div>

    <template v-else-if="code">
      <h2 class="section-title mt-6">TypeScript の型定義</h2>
      <TextHighlighter :formattedText="code" highlightLanguage="typescript" class="j2t-output" />
      <p class="hint">
        ネストしたオブジェクトはキー名から型名を作って分けています（同じ名前は連番、同じ形の型は共通化）。
        配列の要素はすべて統合して型を決めます。
      </p>
    </template>

    <p v-else class="hint mt-4">JSON を貼り付けると、ここに型定義が表示されます。</p>
  </div>
</template>

<script>
import 'highlight.js/styles/monokai.css';
import TextHighlighter from '@/components/TextHighlighter.vue';
import { jsonToTypescript } from '@/utilities/jsonToTypescript';

const STORAGE_KEY = 'json-to-typescript-options';

const SAMPLE = `{
  "id": 1024,
  "name": "山田 太郎",
  "email": null,
  "is-active": true,
  "profile": {
    "age": 30,
    "address": { "zip": "100-0001", "city": "千代田区" }
  },
  "orders": [
    { "orderId": "A-1", "total": 1200, "items": [{ "sku": "x1", "qty": 2 }] },
    { "orderId": "A-2", "total": 980, "note": "置き配", "items": [] }
  ],
  "scores": [90, "欠席", null],
  "history": []
}`;

// 入力が大きいときに打鍵ごとの変換で固まらないよう、変換は少し遅らせる
const DEBOUNCE_MS = 150;

function loadOptions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export default {
  name: 'JsonToTypescript',
  components: { TextHighlighter },
  data() {
    const saved = loadOptions();
    return {
      input: SAMPLE,
      // 変換に使う入力（input を遅らせて反映したもの）
      source: SAMPLE,
      timer: null,
      rootName: typeof saved.rootName === 'string' ? saved.rootName : 'Root',
      declaration: saved.declaration === 'type' ? 'type' : 'interface',
      exportTypes: saved.exportTypes !== false,
      readonly: saved.readonly === true,
      optional: ['question', 'undefined', 'required'].includes(saved.optional) ? saved.optional : 'question',
      declarations: [
        { value: 'interface', label: 'interface' },
        { value: 'type', label: 'type' },
      ],
      optionalModes: [
        { value: 'question', label: 'key?: T（省略可能）' },
        { value: 'undefined', label: 'key: T | undefined' },
        { value: 'required', label: '区別しない（必須）' },
      ],
    };
  },
  computed: {
    options() {
      return {
        rootName: this.rootName,
        declaration: this.declaration,
        exportTypes: this.exportTypes,
        readonly: this.readonly,
        optional: this.optional,
      };
    },
    result() {
      if (this.source.trim() === '') return { code: '', error: null };
      return jsonToTypescript(this.source, this.options);
    },
    code() {
      return this.result.code;
    },
    error() {
      return this.result.error;
    },
    // エラー行とその前後を行番号付きで表示し、位置に ^ を付ける
    errorSnippet() {
      const { line, column } = this.error;
      const lines = this.source.split('\n');
      const from = Math.max(1, line - 1);
      const to = Math.min(lines.length, line + 1);
      const width = String(to).length;
      const out = [];
      for (let n = from; n <= to; n++) {
        const prefix = `${String(n).padStart(width)} | `;
        // 長い行は位置の周辺だけ切り出す
        // タブは 1 文字として数えているので、^ の位置がずれないよう空白にする
        let text = lines[n - 1].replace(/\t/g, ' ');
        let col = column;
        if (text.length > 60) {
          const start = n === line ? Math.max(0, column - 30) : 0;
          text = (start > 0 ? '…' : '') + text.slice(start, start + 60);
          if (n === line) col = column - start + (start > 0 ? 1 : 0);
        }
        out.push(prefix + text);
        if (n === line) out.push(' '.repeat(prefix.length + col - 1) + '^');
      }
      return out.join('\n');
    },
  },
  watch: {
    input(value) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.source = value;
      }, DEBOUNCE_MS);
    },
    options: {
      handler(value) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        } catch (e) {
          // 保存できなくても変換には影響しない
        }
      },
      deep: true,
    },
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
  methods: {
    loadSample() {
      this.input = SAMPLE;
    },
  },
};
</script>

<style scoped>
.j2t-label {
  display: block;
  font-size: 0.875rem;
  font-weight: bold;
  color: #374151;
  margin-bottom: 0.25rem;
}

.j2t-input,
.j2t-select {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
}

.j2t-input {
  width: 12rem;
  max-width: 100%;
}

.j2t-select {
  padding-right: 2rem;
}

.j2t-input:focus,
.j2t-select:focus,
.j2t-textarea:focus {
  outline: none;
  border-color: var(--tb-main);
  box-shadow: 0 0 0 1px var(--tb-main);
}

.j2t-textarea {
  display: block;
  width: 100%;
  min-height: 14rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  resize: vertical;
}

.j2t-button {
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  border-radius: 0.375rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.8125rem;
}

.j2t-button:hover:not(:disabled) {
  background-color: var(--tb-main);
  color: #fff;
}

.j2t-button:disabled {
  opacity: 0.4;
  cursor: default;
}

.j2t-error {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #f87171;
  border-radius: 0.375rem;
  background-color: #fef2f2;
  color: #b91c1c;
  font-size: 0.8125rem;
  word-break: break-word;
}

.j2t-error-snippet {
  margin-top: 0.375rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  color: #7f1d1d;
  overflow-x: auto;
}

/* 長い行は折り返さず横スクロールにし、コピーボタンと重ならないよう右に余白を取る */
.j2t-output :deep(pre) {
  white-space: pre;
  overflow-x: auto;
  padding-right: 3rem;
  font-size: 0.8125rem;
}

.section-title {
  font-weight: bold;
  font-size: 1.15rem;
  border-left: 4px solid var(--tb-main);
  padding-left: 0.5rem;
  margin-bottom: 0.5rem;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}
</style>
