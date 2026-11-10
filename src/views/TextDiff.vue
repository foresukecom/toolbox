<template>
  <div class="dev-tool cat-dev">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="diff-old" class="block font-bold mb-1">変更前</label>
        <textarea
          id="diff-old"
          v-model="oldText"
          class="diff-input w-full h-48 border rounded p-2"
          spellcheck="false"
          placeholder="比較元のテキスト"
        ></textarea>
      </div>
      <div>
        <label for="diff-new" class="block font-bold mb-1">変更後</label>
        <textarea
          id="diff-new"
          v-model="newText"
          class="diff-input w-full h-48 border rounded p-2"
          spellcheck="false"
          placeholder="比較先のテキスト"
        ></textarea>
      </div>
    </div>

    <div class="flex justify-center my-3">
      <button type="button" class="tool-btn px-4 py-1 rounded text-white" @click="swap">
        ⇄ 左右入れ替え
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
      <div class="flex items-center gap-3">
        <span class="font-bold">単位:</span>
        <label v-for="u in units" :key="u.value" class="flex items-center gap-1">
          <input type="radio" v-model="unit" :value="u.value" />
          {{ u.label }}
        </label>
      </div>
      <label class="flex items-center gap-1">
        <input type="checkbox" v-model="ignoreWhitespace" />
        空白を無視
      </label>
      <label class="flex items-center gap-1">
        <input type="checkbox" v-model="ignoreCase" />
        大文字小文字を無視
      </label>
      <div class="flex items-center gap-3">
        <span class="font-bold">表示:</span>
        <label class="flex items-center gap-1">
          <input type="radio" v-model="viewMode" value="unified" />
          上下
        </label>
        <label class="flex items-center gap-1">
          <input type="radio" v-model="viewMode" value="split" />
          左右
        </label>
      </div>
    </div>

    <div v-if="computing" class="text-gray-500 mb-2">計算中…</div>
    <div v-else-if="errorMessage" class="text-red-600 mb-2">{{ errorMessage }}</div>

    <template v-if="changes && !errorMessage">
      <div v-if="!hasDiff" class="no-diff rounded p-3 mb-2">差分はありません</div>
      <template v-else>
        <div class="flex items-center justify-between mb-2">
          <div class="font-bold">
            <span class="text-green-700">{{ statsText.added }}</span>
            /
            <span class="text-red-700">{{ statsText.removed }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <span>{{ unit === 'line' ? 'unified diff をコピー' : '差分をコピー' }}</span>
            <CopyButton :textToCopy="copyText" />
          </div>
        </div>

        <!-- 行単位 / 上下表示 -->
        <div v-if="unit === 'line' && viewMode === 'unified'" class="diff-output border rounded">
          <div
            v-for="(row, i) in lineRows"
            :key="i"
            class="diff-row"
            :class="rowClass(row.type)"
          >
            <span class="ln">{{ row.oldNo }}</span>
            <span class="ln">{{ row.newNo }}</span>
            <span class="sign">{{ markOf(row.type) }}</span>
            <span class="txt">{{ row.text }}</span>
          </div>
        </div>

        <!-- 行単位 / 左右表示 -->
        <div v-else-if="unit === 'line'" class="diff-output border rounded">
          <div v-for="(row, i) in splitRows" :key="i" class="split-row">
            <div class="diff-row" :class="row.left ? rowClass(row.left.type) : 'row-empty'">
              <span class="ln">{{ row.left ? row.left.no : '' }}</span>
              <span class="sign">{{ row.left ? markOf(row.left.type) : '' }}</span>
              <span class="txt">{{ row.left ? row.left.text : '' }}</span>
            </div>
            <div class="diff-row" :class="row.right ? rowClass(row.right.type) : 'row-empty'">
              <span class="ln">{{ row.right ? row.right.no : '' }}</span>
              <span class="sign">{{ row.right ? markOf(row.right.type) : '' }}</span>
              <span class="txt">{{ row.right ? row.right.text : '' }}</span>
            </div>
          </div>
        </div>

        <!-- 単語・文字単位 / 上下表示 -->
        <div v-else-if="viewMode === 'unified'" class="diff-output inline-output border rounded p-2">
          <span
            v-for="(part, i) in changes"
            :key="i"
            :class="partClass(part)"
          >{{ part.value }}</span>
        </div>

        <!-- 単語・文字単位 / 左右表示 -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div class="diff-output inline-output border rounded p-2">
            <template v-for="(part, i) in changes" :key="i">
              <span v-if="!part.added" :class="partClass(part)">{{ part.value }}</span>
            </template>
          </div>
          <div class="diff-output inline-output border rounded p-2">
            <template v-for="(part, i) in changes" :key="i">
              <span v-if="!part.removed" :class="partClass(part)">{{ part.value }}</span>
            </template>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script>
import { diffLines, diffWords, diffChars } from 'diff';
import CopyButton from '@/components/CopyButton.vue';

const DEBOUNCE_MS = 300;
// まず同期で短時間だけ計算し、終わらなければ非同期モード（UI をブロックしない）で続ける
const SYNC_TIMEOUT_MS = 150;
const ASYNC_TIMEOUT_MS = 20000;
const PATCH_CONTEXT = 3;
const TOO_LARGE_MESSAGE = '差分が大きすぎます（計算を打ち切りました）';

function createWordSegmenter() {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      return new Intl.Segmenter('ja', { granularity: 'word' });
    }
  } catch (e) {
    // 未対応環境では既定の分割を使う
  }
  return null;
}

// 末尾の改行を除いて行に分割する
function splitLines(value) {
  const lines = value.split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

// 行単位の差分行から unified diff 形式のテキストを組み立てる
function buildUnifiedPatch(rows) {
  // 変更行の間隔が context*2 以下なら同じハンクにまとめる
  const ranges = [];
  rows.forEach((row, i) => {
    if (row.type === 'common') return;
    const last = ranges[ranges.length - 1];
    if (last && i - last.end <= PATCH_CONTEXT * 2 + 1) {
      last.end = i;
    } else {
      ranges.push({ start: i, end: i });
    }
  });
  const out = ['--- 変更前', '+++ 変更後'];
  ranges.forEach((r) => {
    const from = Math.max(r.start - PATCH_CONTEXT, 0);
    const to = Math.min(r.end + PATCH_CONTEXT, rows.length - 1);
    const slice = rows.slice(from, to + 1);
    const oldLines = slice.filter((row) => row.type !== 'added');
    const newLines = slice.filter((row) => row.type !== 'removed');
    // 行数 0 のときは直前の行番号を書く（GNU diff と同じ）
    const oldStart = oldLines.length ? oldLines[0].oldNo : rows.slice(0, from).filter((row) => row.type !== 'added').length;
    const newStart = newLines.length ? newLines[0].newNo : rows.slice(0, from).filter((row) => row.type !== 'removed').length;
    out.push(`@@ -${oldStart},${oldLines.length} +${newStart},${newLines.length} @@`);
    slice.forEach((row) => {
      out.push((row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' ') + row.text);
    });
  });
  return out.join('\n') + '\n';
}

export default {
  name: 'TextDiff',
  components: { CopyButton },
  data() {
    return {
      oldText: '',
      newText: '',
      unit: 'line',
      ignoreWhitespace: false,
      ignoreCase: false,
      viewMode: 'unified',
      units: [
        { value: 'line', label: '行' },
        { value: 'word', label: '単語' },
        { value: 'char', label: '文字' },
      ],
      changes: null,
      errorMessage: '',
      computing: false,
      debounceTimer: null,
      requestId: 0,
    };
  },
  computed: {
    hasDiff() {
      return !!this.changes && this.changes.some((c) => c.added || c.removed);
    },
    stats() {
      let added = 0;
      let removed = 0;
      (this.changes || []).forEach((c) => {
        if (c.added) added += c.count;
        if (c.removed) removed += c.count;
      });
      return { added, removed };
    },
    statsText() {
      if (this.unit === 'line') {
        return { added: `+${this.stats.added} 行`, removed: `-${this.stats.removed} 行` };
      }
      return { added: `追加 ${this.stats.added}`, removed: `削除 ${this.stats.removed}` };
    },
    lineRows() {
      if (this.unit !== 'line' || !this.changes) return [];
      const rows = [];
      let oldNo = 1;
      let newNo = 1;
      this.changes.forEach((c) => {
        splitLines(c.value).forEach((text) => {
          if (c.added) {
            rows.push({ type: 'added', oldNo: '', newNo: newNo++, text });
          } else if (c.removed) {
            rows.push({ type: 'removed', oldNo: oldNo++, newNo: '', text });
          } else {
            rows.push({ type: 'common', oldNo: oldNo++, newNo: newNo++, text });
          }
        });
      });
      return rows;
    },
    splitRows() {
      if (this.unit !== 'line' || !this.changes) return [];
      const rows = [];
      let oldNo = 1;
      let newNo = 1;
      let pendingRemoved = [];
      const flushRemoved = (addedLines) => {
        const n = Math.max(pendingRemoved.length, addedLines.length);
        for (let i = 0; i < n; i++) {
          rows.push({
            left: i < pendingRemoved.length ? { type: 'removed', no: oldNo++, text: pendingRemoved[i] } : null,
            right: i < addedLines.length ? { type: 'added', no: newNo++, text: addedLines[i] } : null,
          });
        }
        pendingRemoved = [];
      };
      this.changes.forEach((c) => {
        const lines = splitLines(c.value);
        if (c.removed) {
          pendingRemoved = pendingRemoved.concat(lines);
        } else if (c.added) {
          flushRemoved(lines);
        } else {
          flushRemoved([]);
          lines.forEach((text) => {
            rows.push({
              left: { type: 'common', no: oldNo++, text },
              right: { type: 'common', no: newNo++, text },
            });
          });
        }
      });
      flushRemoved([]);
      return rows;
    },
    copyText() {
      if (this.unit === 'line') return this.hasDiff ? buildUnifiedPatch(this.lineRows) : '';
      // wdiff 風の表記: [-削除-]{+追加+}
      return (this.changes || [])
        .map((c) => {
          if (c.added) return `{+${c.value}+}`;
          if (c.removed) return `[-${c.value}-]`;
          return c.value;
        })
        .join('');
    },
  },
  watch: {
    oldText: 'scheduleDiff',
    newText: 'scheduleDiff',
    unit: 'computeNow',
    ignoreWhitespace: 'computeNow',
    ignoreCase: 'computeNow',
  },
  created() {
    this.wordSegmenter = createWordSegmenter();
  },
  beforeUnmount() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    // 計算中の非同期 diff の結果を破棄させる
    this.requestId++;
  },
  methods: {
    swap() {
      const tmp = this.oldText;
      this.oldText = this.newText;
      this.newText = tmp;
    },
    scheduleDiff() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.runDiff();
      }, DEBOUNCE_MS);
    },
    computeNow() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      this.runDiff();
    },
    normalize(s) {
      let v = s;
      if (this.ignoreWhitespace) v = v.replace(/\s+/g, ' ').trim();
      if (this.ignoreCase) v = v.toLowerCase();
      return v;
    },
    // 空白だけの追加・削除を「変更なし」として扱う（単語・文字単位用）
    dropWhitespaceChanges(changes) {
      const result = [];
      changes.forEach((c) => {
        const wsOnly = (c.added || c.removed) && /^\s*$/.test(c.value);
        if (wsOnly && c.removed) return;
        const part = wsOnly ? { ...c, added: false, removed: false } : c;
        const last = result[result.length - 1];
        if (last && !last.added && !last.removed && !part.added && !part.removed) {
          result[result.length - 1] = { ...last, value: last.value + part.value, count: last.count + part.count };
        } else {
          result.push(part);
        }
      });
      return result;
    },
    buildDiffFn() {
      const unit = this.unit;
      if (unit === 'line') {
        const options = { ignoreNewlineAtEof: true };
        // オプション未指定時は既定の比較（高速）を使う
        if (this.ignoreWhitespace || this.ignoreCase) {
          options.comparator = (l, r) =>
            this.normalize(l.replace(/\r?\n$/, '')) === this.normalize(r.replace(/\r?\n$/, ''));
        }
        return (a, b, extra) => diffLines(a, b, { ...options, ...extra });
      }
      if (unit === 'word') {
        const options = { ignoreCase: this.ignoreCase };
        if (this.wordSegmenter) options.intlSegmenter = this.wordSegmenter;
        return (a, b, extra) => diffWords(a, b, { ...options, ...extra });
      }
      return (a, b, extra) => diffChars(a, b, { ignoreCase: this.ignoreCase, ...extra });
    },
    runDiff() {
      const id = ++this.requestId;
      const oldText = this.oldText;
      const newText = this.newText;
      const postProcess = this.unit !== 'line' && this.ignoreWhitespace;

      if (oldText === '' && newText === '') {
        this.changes = null;
        this.errorMessage = '';
        this.computing = false;
        return;
      }

      const done = (changes) => {
        if (id !== this.requestId) return;
        this.computing = false;
        if (!changes) {
          this.changes = null;
          this.errorMessage = TOO_LARGE_MESSAGE;
          return;
        }
        this.errorMessage = '';
        this.changes = postProcess ? this.dropWhitespaceChanges(changes) : changes;
      };

      try {
        const diffFn = this.buildDiffFn();
        const quick = diffFn(oldText, newText, { timeout: SYNC_TIMEOUT_MS });
        if (quick) {
          done(quick);
          return;
        }
        this.computing = true;
        diffFn(oldText, newText, { timeout: ASYNC_TIMEOUT_MS, callback: done });
      } catch (e) {
        if (id !== this.requestId) return;
        this.computing = false;
        this.changes = null;
        this.errorMessage = `差分の計算に失敗しました: ${e.message}`;
      }
    },
    rowClass(type) {
      return { 'row-added': type === 'added', 'row-removed': type === 'removed' };
    },
    markOf(type) {
      if (type === 'added') return '+';
      if (type === 'removed') return '-';
      return ' ';
    },
    partClass(part) {
      return { 'part-added': part.added, 'part-removed': part.removed };
    },
  },
};
</script>

<style scoped>
.diff-input,
.diff-output {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
}
.diff-input:focus {
  outline: 2px solid var(--tb-main);
  outline-offset: -1px;
}
.tool-btn {
  background-color: var(--tb-main);
}
.tool-btn:hover {
  background-color: var(--tb-main-hover);
}
input[type='radio'],
input[type='checkbox'] {
  accent-color: var(--tb-main);
}
.diff-output {
  max-height: 60vh;
  overflow: auto;
}
.inline-output {
  white-space: pre-wrap;
  word-break: break-all;
}
.diff-row {
  display: flex;
  white-space: pre;
  min-height: 1.4em;
}
.split-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.split-row > .diff-row:first-child {
  border-right: 1px solid #e5e7eb;
}
.ln {
  flex: 0 0 3.5em;
  padding-right: 0.5em;
  text-align: right;
  color: #9ca3af;
  user-select: none;
}
.sign {
  flex: 0 0 1.5em;
  text-align: center;
  user-select: none;
}
.txt {
  flex: 1 1 auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.row-added {
  background-color: #dcfce7;
}
.row-removed {
  background-color: #fee2e2;
}
.row-removed .txt {
  text-decoration: line-through;
}
.row-empty {
  background-color: #f9fafb;
}
.part-added {
  background-color: #bbf7d0;
}
.part-removed {
  background-color: #fecaca;
  text-decoration: line-through;
}
.no-diff {
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
}
</style>
