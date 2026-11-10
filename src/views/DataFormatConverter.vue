<template>
  <div class="dev-tool cat-dev">
    <div class="flex flex-wrap items-end gap-4 mb-3">
      <div>
        <label for="dfc-input-format" class="block text-sm font-bold text-gray-700 mb-1">入力</label>
        <div class="flex items-center gap-2">
          <select id="dfc-input-format" v-model="inputFormat" class="dfc-select">
            <option value="auto">自動判定</option>
            <option v-for="f in formats" :key="f" :value="f">{{ formatLabels[f] }}</option>
          </select>
          <span v-if="inputFormat === 'auto' && result.detected" class="text-sm text-gray-600">
            (判定: {{ formatLabels[result.detected] }})
          </span>
        </div>
      </div>

      <div>
        <label for="dfc-output-format" class="block text-sm font-bold text-gray-700 mb-1">出力</label>
        <select id="dfc-output-format" v-model="outputFormat" class="dfc-select">
          <option v-for="f in formats" :key="f" :value="f">{{ formatLabels[f] }}</option>
        </select>
      </div>

      <div>
        <label for="dfc-indent" class="block text-sm font-bold text-gray-700 mb-1">インデント</label>
        <select
          id="dfc-indent"
          v-model.number="indent"
          class="dfc-select"
          :disabled="outputFormat === 'toml'"
        >
          <option :value="2">2</option>
          <option :value="4">4</option>
        </select>
      </div>

      <label class="flex items-center gap-1 text-sm text-gray-700 pb-2">
        <input type="checkbox" v-model="sortKeys" />
        キーをソート
      </label>

      <button
        type="button"
        class="dfc-swap"
        title="入出力を入れ替え"
        :disabled="!canSwap"
        @click="swap"
      >
        ⇄ 入れ替え
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <textarea
          v-model="input"
          class="dfc-textarea"
          spellcheck="false"
          placeholder='{"name": "toolbox"} / name: toolbox / name = "toolbox"'
        ></textarea>
        <pre v-if="result.error" class="dfc-error">{{ result.error }}</pre>
        <p v-if="result.multiDoc" class="text-sm text-gray-600 mt-1">
          複数ドキュメントの YAML のため、配列として出力しています
        </p>
      </div>

      <div class="relative">
        <textarea
          :value="result.output"
          class="dfc-textarea bg-gray-50"
          spellcheck="false"
          readonly
        ></textarea>
        <div class="absolute top-2 right-2">
          <CopyButton :textToCopy="result.output" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import YAML from 'yaml';
import { parse as parseToml, stringify as stringifyToml, TomlError } from 'smol-toml';
import CopyButton from '@/components/CopyButton.vue';

const FORMAT_LABELS = { json: 'JSON', yaml: 'YAML', toml: 'TOML' };

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

// TOML の日時（TomlDate）を ISO 8601 文字列にする。ミリ秒が 0 なら省略する
function dateToIso(date) {
  return date.toISOString().replace(/\.000(?=Z|[+-]\d{2}:\d{2}|$)/, '');
}

// JSON / YAML 出力用に Date を文字列化する
function normalizeDates(value) {
  if (value instanceof Date) return dateToIso(value);
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value)) out[key] = normalizeDates(value[key]);
    return out;
  }
  return value;
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortObjectKeys(value[key]);
    return out;
  }
  return value;
}

function joinPath(path, key) {
  if (typeof key === 'number') return `${path}[${key}]`;
  const safe = /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
  return path ? `${path}.${safe}` : safe;
}

// null / undefined を含む最初のキーのパスを返す（なければ null）
function findNullPath(value, path = '') {
  if (value === null || value === undefined) return path || '(ルート)';
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = findNullPath(value[i], joinPath(path, i));
      if (found) return found;
    }
  } else if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      const found = findNullPath(value[key], joinPath(path, key));
      if (found) return found;
    }
  }
  return null;
}

function locationText(line, column) {
  if (!line) return '';
  return column ? `${line}行目 ${column}列目: ` : `${line}行目: `;
}

function formatJsonError(error, text) {
  const msg = error.message;
  const lineCol = msg.match(/line (\d+) column (\d+)/);
  if (lineCol) return locationText(Number(lineCol[1]), Number(lineCol[2])) + msg;
  const pos = msg.match(/position (\d+)/);
  if (pos) {
    const before = text.slice(0, Number(pos[1])).split('\n');
    return locationText(before.length, before[before.length - 1].length + 1) + msg;
  }
  return msg;
}

function detectFormat(text) {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  try {
    parseToml(text);
    return 'toml';
  } catch (e) {
    return 'yaml';
  }
}

function parseInput(text, format) {
  if (format === 'json') {
    try {
      return { value: JSON.parse(text) };
    } catch (e) {
      return { error: `JSON のパースエラー: ${formatJsonError(e, text)}` };
    }
  }
  if (format === 'toml') {
    try {
      return { value: parseToml(text) };
    } catch (e) {
      const loc = e instanceof TomlError ? locationText(e.line, e.column) : '';
      return { error: `TOML のパースエラー: ${loc}${e.message}` };
    }
  }
  // YAML（--- 区切りの複数ドキュメントは配列にする）
  try {
    const docs = YAML.parseAllDocuments(text);
    for (const doc of docs) {
      if (doc.errors.length) {
        const err = doc.errors[0];
        const pos = err.linePos && err.linePos[0];
        return { error: `YAML のパースエラー: ${pos ? locationText(pos.line, pos.col) : ''}${err.message}` };
      }
    }
    if (docs.length > 1) return { value: docs.map((d) => d.toJS()), multiDoc: true };
    return { value: docs.length ? docs[0].toJS() : null };
  } catch (e) {
    return { error: `YAML のパースエラー: ${e.message}` };
  }
}

function stringifyOutput(value, format, indent) {
  if (format === 'json') {
    return JSON.stringify(normalizeDates(value), null, indent);
  }
  if (format === 'yaml') {
    return YAML.stringify(normalizeDates(value), { indent });
  }
  if (!isPlainObject(value)) {
    throw new Error('TOML のトップレベルはテーブルである必要があります（入力が配列またはスカラーです）');
  }
  const nullPath = findNullPath(value);
  if (nullPath) {
    throw new Error(`TOML は null を表せません（キー: ${nullPath}）`);
  }
  return stringifyToml(value);
}

export default {
  name: 'DataFormatConverter',
  components: {
    CopyButton,
  },
  data() {
    return {
      input: '',
      inputFormat: 'auto',
      outputFormat: 'json',
      indent: 2,
      sortKeys: false,
      formats: ['json', 'yaml', 'toml'],
      formatLabels: FORMAT_LABELS,
    };
  },
  computed: {
    result() {
      const empty = { detected: null, output: '', error: '', multiDoc: false };
      if (!this.input.trim()) return empty;

      const format = this.inputFormat === 'auto' ? detectFormat(this.input) : this.inputFormat;
      const parsed = parseInput(this.input, format);
      if (parsed.error) return { ...empty, detected: format, error: parsed.error };

      const value = this.sortKeys ? sortObjectKeys(parsed.value) : parsed.value;
      try {
        const output = stringifyOutput(value, this.outputFormat, this.indent);
        return { ...empty, detected: format, output, multiDoc: !!parsed.multiDoc };
      } catch (e) {
        return { ...empty, detected: format, error: `${FORMAT_LABELS[this.outputFormat]} への変換エラー: ${e.message}` };
      }
    },
    canSwap() {
      return !!this.result.output && !this.result.error;
    },
  },
  methods: {
    swap() {
      if (!this.canSwap) return;
      const previousInput = this.result.detected;
      this.input = this.result.output;
      this.inputFormat = this.outputFormat;
      this.outputFormat = previousInput;
    },
  },
};
</script>

<style scoped>
.dfc-select {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.375rem 2rem 0.375rem 0.5rem;
  font-size: 0.875rem;
}

.dfc-select:focus,
.dfc-textarea:focus {
  outline: none;
  border-color: var(--tb-main);
  box-shadow: 0 0 0 1px var(--tb-main);
}

.dfc-textarea {
  width: 100%;
  min-height: 20rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.dfc-swap {
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
}

.dfc-swap:hover:not(:disabled) {
  background-color: var(--tb-main);
  color: #fff;
}

.dfc-swap:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dfc-error {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #f87171;
  border-radius: 0.375rem;
  background-color: #fef2f2;
  color: #b91c1c;
  font-size: 0.8125rem;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
