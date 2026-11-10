<template>
  <div class="dev-tool cat-text">
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <button type="button" class="md-button" @click="copyHtml">{{ copied ? 'コピーしました' : 'HTMLをコピー' }}</button>
      <button type="button" class="md-button" @click="download('html')">.html をダウンロード</button>
      <button type="button" class="md-button" @click="download('md')">.md をダウンロード</button>
      <button type="button" class="md-button" @click="resetSample">サンプルに戻す</button>
      <span class="text-sm text-gray-600 ml-auto">{{ charCount }}文字 / {{ lineCount }}行</span>
    </div>

    <!-- スマホ幅ではタブで編集とプレビューを切り替える -->
    <div class="md-tabs" role="tablist">
      <button v-for="t in tabs" :key="t.value" type="button" role="tab" :aria-selected="tab === t.value"
        :class="['md-tab', { 'md-tab-active': tab === t.value }]" @click="tab = t.value">{{ t.label }}</button>
    </div>

    <div class="md-panes">
      <textarea v-model="input" :class="['md-editor', { 'md-hidden': tab !== 'edit' }]" spellcheck="false"
        aria-label="Markdown入力"></textarea>
      <div :class="['md-preview', { 'md-hidden': tab !== 'preview' }]" v-html="html"></div>
    </div>
    <p class="text-sm text-gray-600 mt-2">入力内容はこのブラウザに自動保存されます。表示する HTML はサニタイズ済みです。</p>
  </div>
</template>

<script>
import { renderMarkdown } from '@/utilities/markdownRender';

const STORAGE_KEY = 'markdown-preview-input';
const SAMPLE = `# Markdownプレビュー

**太字**、*斜体*、~~取り消し線~~、\`インラインコード\`。
https://example.com のような URL は自動でリンクになります。

## タスクリスト
- [x] 表に対応
- [ ] ダウンロードを試す

## 表
| ツール | 説明 |
| --- | :---: |
| marked | Markdown を HTML に変換 |
| DOMPurify | HTML をサニタイズ |

> 引用はこのように表示されます。

\`\`\`js
function hello(name) {
  return \`こんにちは、\${name}\`;
}
\`\`\`
`;

export default {
  name: 'MarkdownPreview',
  data() {
    return {
      input: this.loadInput(),
      tab: 'edit',
      tabs: [
        { value: 'edit', label: '編集' },
        { value: 'preview', label: 'プレビュー' },
      ],
      copied: false,
      copiedTimer: null,
    };
  },
  computed: {
    html() {
      return renderMarkdown(this.input);
    },
    charCount() {
      return Array.from(this.input).length;
    },
    lineCount() {
      return this.input === '' ? 0 : this.input.split('\n').length;
    },
  },
  watch: {
    input(value) {
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch (e) {
        // 保存できなくても動作は続ける
      }
    },
  },
  beforeUnmount() {
    clearTimeout(this.copiedTimer);
  },
  methods: {
    loadInput() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) return saved;
      } catch (e) {
        // localStorage が使えない環境ではサンプルを表示
      }
      return SAMPLE;
    },
    resetSample() {
      this.input = SAMPLE;
    },
    async copyHtml() {
      try {
        await navigator.clipboard.writeText(this.html);
        this.copied = true;
        clearTimeout(this.copiedTimer);
        this.copiedTimer = setTimeout(() => (this.copied = false), 1500);
      } catch (e) {
        alert('コピーできませんでした');
      }
    },
    download(kind) {
      const content = kind === 'html'
        ? `<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<title>document</title>\n</head>\n<body>\n${this.html}\n</body>\n</html>\n`
        : this.input;
      const type = kind === 'html' ? 'text/html' : 'text/markdown';
      const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `document.${kind}`;
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.md-button {
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  border-radius: 0.375rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.md-button:hover {
  background-color: var(--tb-main);
  color: #fff;
}

.md-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.md-tab {
  padding: 0.25rem 1rem;
  border-bottom: 2px solid transparent;
  font-size: 0.875rem;
}

.md-tab-active {
  border-bottom-color: var(--tb-main);
  font-weight: bold;
}

.md-panes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

.md-editor,
.md-preview {
  min-height: 28rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.md-editor {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.md-editor:focus {
  outline: none;
  border-color: var(--tb-main);
  box-shadow: 0 0 0 1px var(--tb-main);
}

.md-preview {
  overflow: auto;
  overflow-wrap: anywhere;
  line-height: 1.7;
}

.md-hidden {
  display: none;
}

/* PC 幅では 2 ペインを並べ、タブは隠す */
@media (min-width: 768px) {
  .md-tabs {
    display: none;
  }

  .md-panes {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .md-hidden {
    display: block;
  }
}

.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3) {
  font-weight: bold;
  margin: 1rem 0 0.5rem;
}

.md-preview :deep(h1) {
  font-size: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.md-preview :deep(h2) {
  font-size: 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.md-preview :deep(h3) {
  font-size: 1.1rem;
}

.md-preview :deep(p),
.md-preview :deep(ul),
.md-preview :deep(ol),
.md-preview :deep(table),
.md-preview :deep(blockquote),
.md-preview :deep(pre) {
  margin: 0.5rem 0;
}

.md-preview :deep(ul) {
  list-style: disc;
  padding-left: 1.5rem;
}

.md-preview :deep(ol) {
  list-style: decimal;
  padding-left: 1.5rem;
}

.md-preview :deep(li:has(> input[type='checkbox'])) {
  list-style: none;
  margin-left: -1.25rem;
}

.md-preview :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.md-preview :deep(blockquote) {
  border-left: 4px solid #d1d5db;
  padding-left: 0.75rem;
  color: #4b5563;
}

.md-preview :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.md-preview :deep(th),
.md-preview :deep(td) {
  border: 1px solid #d1d5db;
  padding: 0.25rem 0.5rem;
}

.md-preview :deep(th) {
  background: #f3f4f6;
}

.md-preview :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
  background: #f3f4f6;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}

.md-preview :deep(pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 0.75rem;
  border-radius: 0.375rem;
  overflow-x: auto;
}

.md-preview :deep(pre code) {
  background: none;
  padding: 0;
}

/* highlight.js のトークン色 */
.md-preview :deep(.hljs-keyword),
.md-preview :deep(.hljs-built_in) {
  color: #f472b6;
}

.md-preview :deep(.hljs-string) {
  color: #86efac;
}

.md-preview :deep(.hljs-number),
.md-preview :deep(.hljs-literal) {
  color: #fdba74;
}

.md-preview :deep(.hljs-comment) {
  color: #9ca3af;
}

.md-preview :deep(.hljs-title),
.md-preview :deep(.hljs-function) {
  color: #93c5fd;
}
</style>
