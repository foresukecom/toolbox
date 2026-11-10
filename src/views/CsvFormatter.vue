<template>
  <div class="dev-tool cat-dev">
    <div class="flex flex-wrap items-end gap-4 mb-3">
      <div>
        <label for="csv-delimiter" class="block text-sm font-bold text-gray-700 mb-1">区切り文字</label>
        <div class="flex items-center gap-2">
          <select id="csv-delimiter" v-model="delimiter" class="csv-select">
            <option value="auto">自動判定</option>
            <option v-for="d in delimiters" :key="d.value" :value="d.value">{{ d.label }}</option>
          </select>
          <span v-if="delimiter === 'auto' && parsed.detected" class="text-sm text-gray-600">
            (判定: {{ delimiterLabel(parsed.detected) }})
          </span>
        </div>
      </div>

      <label class="flex items-center gap-1 text-sm text-gray-700 pb-2">
        <input type="checkbox" v-model="hasHeader" />
        1行目を見出しにする
      </label>

      <div class="pb-1">
        <label class="csv-file-button">
          ファイルを選択
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" class="hidden" @change="onFileChange" />
        </label>
        <span v-if="fileName" class="ml-2 text-sm text-gray-600">{{ fileName }}</span>
      </div>
    </div>

    <textarea
      v-model="input"
      class="csv-textarea"
      spellcheck="false"
      placeholder="名前,年齢,メモ&#10;山田,30,東京"
    ></textarea>
    <p v-if="fileError" class="csv-error">{{ fileError }}</p>
    <ul v-if="parsed.errors.length" class="csv-error">
      <li v-for="(e, i) in parsed.errors" :key="i">{{ e }}</li>
    </ul>

    <template v-if="parsed.columnCount">
      <p class="text-sm text-gray-700 mt-4 mb-2">
        {{ parsed.body.length }}行 × {{ parsed.columnCount }}列
        <span v-if="hasHeader">（見出し行を除く）</span>
      </p>

      <div class="csv-table-wrap">
        <table class="csv-table">
          <thead v-if="parsed.header">
            <tr>
              <th v-for="(cell, c) in parsed.header" :key="c" :style="columnStyle(c)">{{ cell }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in displayRows" :key="r">
              <td v-for="(cell, c) in row" :key="c" :style="columnStyle(c)">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="omittedRows" class="text-sm text-gray-600 mt-1">
        残り {{ omittedRows }} 行は省略（出力は全行が対象です）
      </p>

      <div class="csv-tabs mt-6" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.value"
          type="button"
          role="tab"
          :aria-selected="tab === t.value"
          :class="['csv-tab', { 'csv-tab-active': tab === t.value }]"
          @click="tab = t.value"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="csv-panel">
        <div v-if="tab === 'markdown'" class="mb-3">
          <label class="flex items-center gap-1 text-sm text-gray-700 mb-2">
            <input type="checkbox" v-model="autoRightNumeric" />
            数値だけの列は自動で右寄せ
          </label>
          <div class="flex flex-wrap gap-3">
            <div v-for="(name, c) in columnNames" :key="c" class="flex items-center gap-1 text-sm">
              <span class="font-bold" :style="columnStyle(c)">{{ name }}</span>
              <select
                :value="columnAlign[c] || 'none'"
                class="csv-select csv-select-sm"
                :aria-label="`${name} の寄せ`"
                @change="setAlign(c, $event.target.value)"
              >
                <option value="none">指定なし</option>
                <option value="left">左</option>
                <option value="center">中央</option>
                <option value="right">右</option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="tab === 'csv'" class="mb-3">
          <label for="csv-out-delimiter" class="text-sm font-bold text-gray-700 mr-2">出力の区切り文字</label>
          <select id="csv-out-delimiter" v-model="outputDelimiter" class="csv-select">
            <option v-for="d in delimiters" :key="d.value" :value="d.value">{{ d.label }}</option>
          </select>
        </div>

        <div class="relative">
          <textarea :value="output" class="csv-textarea csv-output bg-gray-50" spellcheck="false" readonly wrap="off"></textarea>
          <div class="absolute top-2 right-2">
            <CopyButton :textToCopy="output" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import Papa from 'papaparse';
import CopyButton from '@/components/CopyButton.vue';

const DELIMITERS = [
  { value: ',', label: 'カンマ (,)' },
  { value: '\t', label: 'タブ' },
  { value: ';', label: 'セミコロン (;)' },
  { value: '|', label: 'パイプ (|)' },
];

// 列ごとに循環させる文字色（白背景でコントラスト比 4.5 以上）
const COLUMN_COLORS = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#7e22ce', '#0e7490', '#be185d', '#4d7c0f'];

const DISPLAY_LIMIT = 500;

const PAPA_ERROR_MESSAGES = {
  MissingQuotes: 'クォートが閉じられていません',
  InvalidQuotes: 'クォートの位置が不正です',
};

const NUMERIC_RE = /^[+-]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?$/;

// East Asian Width が F / W の主な範囲（簡易判定）
const WIDE_RANGES = [
  [0x1100, 0x115f],
  [0x231a, 0x231b],
  [0x2329, 0x232a],
  [0x23e9, 0x23ec],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xa960, 0xa97f],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x3fffd],
];

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('ja', { granularity: 'grapheme' }) : null;

function graphemes(text) {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return Array.from(text);
}

function isWide(codePoint) {
  return WIDE_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to);
}

function displayWidth(text) {
  let width = 0;
  for (const g of graphemes(text)) {
    width += isWide(g.codePointAt(0)) || g.includes('\uFE0F') ? 2 : 1;
  }
  return width;
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r\n|\r|\n/).length;
}

function formatPapaError(error, text) {
  const message = PAPA_ERROR_MESSAGES[error.code] || error.message;
  if (typeof error.index === 'number') return `${lineOf(text, error.index)}行目: ${message}`;
  if (typeof error.row === 'number') return `${error.row + 1}件目のレコード: ${message}`;
  return message;
}

function isNumericColumn(rows, c) {
  let found = false;
  for (const row of rows) {
    const cell = row[c].trim();
    if (cell === '') continue;
    if (!NUMERIC_RE.test(cell) || !/\d/.test(cell)) return false;
    found = true;
  }
  return found;
}

function escapeMarkdown(cell) {
  return cell.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br>');
}

const ALIGN_MARKS = { none: '---', left: ':---', center: ':---:', right: '---:' };

function toMarkdown(names, rows, aligns) {
  const line = (cells) => `| ${cells.map(escapeMarkdown).join(' | ')} |`;
  return [line(names), `| ${aligns.map((a) => ALIGN_MARKS[a]).join(' | ')} |`, ...rows.map(line)].join('\n');
}

function toAlignedText(header, rows, columnCount) {
  const clean = (cell) => cell.replace(/\r\n|\r|\n/g, '\\n').replace(/\t/g, ' ');
  const all = (header ? [header, ...rows] : rows).map((row) => row.map(clean));
  const widths = new Array(columnCount).fill(0);
  for (const row of all) {
    row.forEach((cell, c) => {
      widths[c] = Math.max(widths[c], displayWidth(cell));
    });
  }
  const pad = (cell, c) => cell + ' '.repeat(widths[c] - displayWidth(cell));
  const lines = all.map((row) => row.map(pad).join('  ').trimEnd());
  if (header) lines.splice(1, 0, widths.map((w) => '-'.repeat(w)).join('  '));
  return lines.join('\n');
}

function toJson(header, rows) {
  if (!header) return JSON.stringify(rows, null, 2);
  // 見出しが重複している場合は 2 つ目以降に _2, _3 … を付ける
  const seen = {};
  const keys = header.map((name) => {
    seen[name] = (seen[name] || 0) + 1;
    return seen[name] > 1 ? `${name}_${seen[name]}` : name;
  });
  const objects = rows.map((row) => {
    const obj = {};
    keys.forEach((key, c) => {
      obj[key] = row[c];
    });
    return obj;
  });
  return JSON.stringify(objects, null, 2);
}

export default {
  name: 'CsvFormatter',
  components: {
    CopyButton,
  },
  data() {
    return {
      input: '',
      fileName: '',
      fileError: '',
      delimiter: 'auto',
      hasHeader: true,
      tab: 'markdown',
      tabs: [
        { value: 'markdown', label: 'Markdown の表' },
        { value: 'aligned', label: '整列テキスト' },
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV（正規化）' },
      ],
      delimiters: DELIMITERS,
      columnAlign: {},
      autoRightNumeric: false,
      outputDelimiter: ',',
    };
  },
  computed: {
    parsed() {
      const empty = { rows: [], header: null, body: [], columnCount: 0, errors: [], detected: '' };
      const text = this.input.replace(/^\uFEFF/, '');
      if (!text.trim()) return empty;

      let result;
      try {
        result = Papa.parse(text, {
          delimiter: this.delimiter === 'auto' ? '' : this.delimiter,
          delimitersToGuess: DELIMITERS.map((d) => d.value),
          skipEmptyLines: true,
        });
      } catch (e) {
        return { ...empty, errors: [`読み取りエラー: ${e.message}`] };
      }

      const errors = result.errors
        .filter((e) => e.code !== 'UndetectableDelimiter')
        .map((e) => formatPapaError(e, text));

      const columnCount = result.data.reduce((max, row) => Math.max(max, row.length), 0);
      const rows = result.data.map((row) =>
        row.length < columnCount ? row.concat(new Array(columnCount - row.length).fill('')) : row
      );
      const header = this.hasHeader && rows.length ? rows[0] : null;
      const body = header ? rows.slice(1) : rows;
      return { rows, header, body, columnCount, errors, detected: result.meta.delimiter };
    },
    displayRows() {
      return this.parsed.body.slice(0, DISPLAY_LIMIT);
    },
    omittedRows() {
      return Math.max(0, this.parsed.body.length - DISPLAY_LIMIT);
    },
    columnNames() {
      const { header, columnCount } = this.parsed;
      return Array.from({ length: columnCount }, (_, c) => (header && header[c]) || `列${c + 1}`);
    },
    markdownAligns() {
      return this.columnNames.map((_, c) => {
        const align = this.columnAlign[c] || 'none';
        if (align === 'none' && this.autoRightNumeric && isNumericColumn(this.parsed.body, c)) return 'right';
        return align;
      });
    },
    output() {
      const { header, body, rows, columnCount } = this.parsed;
      if (!columnCount) return '';
      switch (this.tab) {
        case 'markdown':
          return toMarkdown(this.columnNames, body, this.markdownAligns);
        case 'aligned':
          return toAlignedText(header, body, columnCount);
        case 'json':
          return toJson(header, body);
        case 'csv':
          return Papa.unparse(rows, { delimiter: this.outputDelimiter, newline: '\n' });
        default:
          return '';
      }
    },
  },
  methods: {
    delimiterLabel(value) {
      const found = DELIMITERS.find((d) => d.value === value);
      return found ? found.label : JSON.stringify(value);
    },
    columnStyle(c) {
      return { color: COLUMN_COLORS[c % COLUMN_COLORS.length] };
    },
    setAlign(c, value) {
      this.columnAlign = { ...this.columnAlign, [c]: value };
    },
    onFileChange(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) return;
      this.fileError = '';
      const reader = new FileReader();
      reader.onload = () => {
        this.input = String(reader.result || '');
        this.fileName = file.name;
      };
      reader.onerror = () => {
        this.fileError = `ファイルを読み込めませんでした: ${file.name}`;
      };
      reader.readAsText(file, 'UTF-8');
    },
  },
};
</script>

<style scoped>
.csv-select {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.375rem 2rem 0.375rem 0.5rem;
  font-size: 0.875rem;
}

.csv-select-sm {
  padding: 0.125rem 1.75rem 0.125rem 0.375rem;
}

.csv-select:focus,
.csv-textarea:focus {
  outline: none;
  border-color: var(--tb-main);
  box-shadow: 0 0 0 1px var(--tb-main);
}

.csv-textarea {
  width: 100%;
  min-height: 12rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.csv-output {
  min-height: 16rem;
  padding-right: 3rem;
}

.csv-file-button {
  display: inline-block;
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.csv-file-button:hover {
  background-color: var(--tb-main);
  color: #fff;
}

.csv-error {
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

.csv-table-wrap {
  max-height: 32rem;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.csv-table {
  border-collapse: collapse;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8125rem;
}

.csv-table th,
.csv-table td {
  border: 1px solid #e5e7eb;
  padding: 0.25rem 0.5rem;
  text-align: left;
  vertical-align: top;
  white-space: pre-wrap;
}

.csv-table th {
  position: sticky;
  top: 0;
  background-color: #f9fafb;
  font-weight: 700;
}

.csv-table tbody tr:nth-child(even) {
  background-color: #fafafa;
}

.csv-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid #d1d5db;
}

.csv-tab {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #4b5563;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
  margin-bottom: -1px;
}

.csv-tab-active {
  color: var(--tb-main);
  font-weight: 700;
  border-color: #d1d5db;
  background-color: #fff;
}

.csv-panel {
  padding-top: 0.75rem;
}
</style>
