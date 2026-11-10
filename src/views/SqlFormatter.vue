<template>
  <div class="dev-tool cat-dev">
    <div class="sql-modes mb-4" role="tablist">
      <button
        v-for="m in modes"
        :key="m.value"
        type="button"
        role="tab"
        :aria-selected="mode === m.value"
        :class="['sql-mode', { 'sql-mode-active': mode === m.value }]"
        @click="mode = m.value"
      >
        {{ m.label }}
      </button>
    </div>

    <div class="sql-options mb-4">
      <div>
        <label for="sql-language" class="sql-label">方言</label>
        <select id="sql-language" v-model="language" class="sql-select">
          <option v-for="d in dialects" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>

      <template v-if="mode === 'format'">
        <div>
          <label for="sql-indent" class="sql-label">インデント</label>
          <select id="sql-indent" v-model="indent" class="sql-select">
            <option value="2">スペース 2</option>
            <option value="4">スペース 4</option>
            <option value="tab">タブ</option>
          </select>
        </div>
        <div>
          <label for="sql-keyword-case" class="sql-label">キーワード</label>
          <select id="sql-keyword-case" v-model="keywordCase" class="sql-select">
            <option v-for="c in caseOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div>
          <label for="sql-function-case" class="sql-label">関数名</label>
          <select id="sql-function-case" v-model="functionCase" class="sql-select">
            <option v-for="c in caseOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div>
          <label for="sql-datatype-case" class="sql-label">データ型</label>
          <select id="sql-datatype-case" v-model="dataTypeCase" class="sql-select">
            <option v-for="c in caseOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div>
          <label for="sql-indent-style" class="sql-label">揃え方</label>
          <select id="sql-indent-style" v-model="indentStyle" class="sql-select">
            <option value="standard">標準</option>
            <option value="tabularLeft">表形式（左寄せ）</option>
            <option value="tabularRight">表形式（右寄せ）</option>
          </select>
        </div>
        <div>
          <label for="sql-logical" class="sql-label">AND / OR の改行</label>
          <select id="sql-logical" v-model="logicalOperatorNewline" class="sql-select">
            <option value="before">演算子の前で改行</option>
            <option value="after">演算子の後で改行</option>
          </select>
        </div>
        <div>
          <label for="sql-width" class="sql-label">括弧内を 1 行にする最大幅</label>
          <input id="sql-width" v-model.number="expressionWidth" type="number" min="1" max="500" class="sql-select sql-number" />
        </div>
        <div>
          <label for="sql-lines" class="sql-label">文と文の間の空行</label>
          <input id="sql-lines" v-model.number="linesBetweenQueries" type="number" min="0" max="5" class="sql-select sql-number" />
        </div>
      </template>
    </div>

    <div class="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-sm text-gray-700">
      <template v-if="mode === 'format'">
        <label class="inline-flex items-center gap-1">
          <input v-model="denseOperators" type="checkbox" />
          演算子の前後に空白を入れない
        </label>
        <label class="inline-flex items-center gap-1">
          <input v-model="newlineBeforeSemicolon" type="checkbox" />
          セミコロンの前で改行
        </label>
      </template>
      <label v-else class="inline-flex items-center gap-1">
        <input v-model="keepComments" type="checkbox" />
        コメントを残す（-- コメントは /* */ に変換）
      </label>
    </div>

    <div class="flex items-center justify-between mb-1">
      <label for="sql-input" class="sql-label mb-0">SQL</label>
      <div class="flex gap-2">
        <button type="button" class="sql-button" @click="loadSample">サンプル</button>
        <button type="button" class="sql-button" :disabled="!input" @click="input = ''">クリア</button>
      </div>
    </div>
    <textarea
      id="sql-input"
      v-model="input"
      class="sql-textarea"
      spellcheck="false"
      placeholder="SELECT * FROM users WHERE id = 1"
    ></textarea>

    <div v-if="result.error" class="sql-error" role="alert">
      <p class="font-bold">{{ result.error.title }}</p>
      <p v-if="result.error.position">{{ result.error.position }}</p>
      <pre v-if="result.error.snippet" class="sql-error-snippet">{{ result.error.snippet }}</pre>
      <p v-if="result.error.hint" class="mt-1">{{ result.error.hint }}</p>
      <details v-if="result.error.detail" class="mt-1">
        <summary class="cursor-pointer">詳細（英語）</summary>
        <pre class="sql-error-detail">{{ result.error.detail }}</pre>
      </details>
    </div>

    <div v-else-if="result.output" class="mt-4">
      <div class="flex items-center justify-between mb-1">
        <span class="sql-label mb-0">{{ mode === 'format' ? '整形結果' : '圧縮結果' }}</span>
        <span class="text-sm text-gray-600">{{ outputStats }}</span>
      </div>
      <div class="relative">
        <pre :class="['sql-output hljs', { 'sql-output-wrap': mode === 'minify' }]"><code v-html="highlighted"></code></pre>
        <div class="absolute top-2 right-2">
          <CopyButton :textToCopy="result.output" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import "highlight.js/styles/monokai.css";
import hljs from 'highlight.js/lib/core';
import sqlLanguage from 'highlight.js/lib/languages/sql';
import { format } from 'sql-formatter';
import CopyButton from '@/components/CopyButton.vue';
import { minifySql } from '@/utilities/sqlMinify';

hljs.registerLanguage('sql', sqlLanguage);

const STORAGE_KEY = 'sqlFormatter.options';

// 保存・復元する設定項目
const OPTION_KEYS = [
  'mode', 'language', 'indent', 'keywordCase', 'functionCase', 'dataTypeCase', 'indentStyle',
  'logicalOperatorNewline', 'expressionWidth', 'linesBetweenQueries', 'denseOperators',
  'newlineBeforeSemicolon', 'keepComments',
];

const DIALECTS = [
  { value: 'sql', label: '標準 SQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mariadb', label: 'MariaDB' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 'transactsql', label: 'SQL Server (T-SQL)' },
  { value: 'plsql', label: 'Oracle PL/SQL' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'redshift', label: 'Amazon Redshift' },
  { value: 'spark', label: 'Spark SQL' },
  { value: 'hive', label: 'Hive' },
  { value: 'trino', label: 'Trino / Presto' },
  { value: 'duckdb', label: 'DuckDB' },
  { value: 'clickhouse', label: 'ClickHouse' },
  { value: 'db2', label: 'Db2' },
  { value: 'db2i', label: 'Db2 for i' },
  { value: 'tidb', label: 'TiDB' },
  { value: 'singlestoredb', label: 'SingleStoreDB' },
  { value: 'n1ql', label: 'N1QL (Couchbase)' },
];

const SAMPLE_SQL = `-- 直近の注文が多いユーザー
with recent_orders as (select user_id, count(*) as order_count, sum(amount) as total from orders where created_at >= '2024-01-01' group by user_id)
select u.id, u.name, r.order_count, r.total /* 合計金額 */ from users u inner join recent_orders r on r.user_id = u.id left join bans b on b.user_id = u.id where b.user_id is null and u.status in ('active', 'trial') and u.id not in (select user_id from test_accounts) order by r.total desc limit 10;
insert into audit_log (user_id, action, created_at) values (1, 'login', now()), (2, 'logout', now());`;

// sql-formatter のエラーメッセージを日本語の表示用に変換する
function describeError(error, sql) {
  const message = String((error && error.message) || error);
  const pos = /at line (\d+) column (\d+)/.exec(message);
  const result = { title: 'SQL を解析できませんでした', position: '', snippet: '', hint: '', detail: message };

  if (/^Parse error: Unexpected "/.test(message)) {
    result.title = '解釈できない文字があります';
    result.hint = '閉じられていない文字列や、この方言では使えない記号がないか確認してください。方言を変えると解釈できることがあります。';
  } else if (/«EOF»/.test(message)) {
    result.title = 'SQL が途中で終わっています';
    result.hint = '括弧の閉じ忘れや、文の書きかけがないか確認してください。';
  } else if (/^Parse error at token/.test(message)) {
    result.title = '構文を解釈できない箇所があります';
    result.hint = '方言を変えると解釈できることがあります。';
  } else if (!pos) {
    // 圧縮時のエラー（日本語のメッセージ）など
    result.title = message;
    result.detail = '';
  }

  if (pos) {
    const line = Number(pos[1]);
    const column = Number(pos[2]);
    result.position = `${line} 行目 ${column} 文字目付近`;
    const text = sql.split('\n')[line - 1];
    if (text !== undefined) {
      // 長い行はエラー位置の前後だけを切り出す
      const from = Math.max(0, column - 40);
      const shown = text.slice(from, column + 40);
      const prefix = from > 0 ? '…' : '';
      result.snippet = `${prefix}${shown}\n${' '.repeat(prefix.length + column - 1 - from)}^`;
    }
  }
  return result;
}

export default {
  name: 'SqlFormatter',
  components: { CopyButton },
  data() {
    return {
      input: SAMPLE_SQL,
      // 入力の反映を少し遅らせる（大きな SQL を貼ったときに 1 文字ごとに整形しない）
      debouncedInput: SAMPLE_SQL,
      debounceTimer: null,
      mode: 'format',
      language: 'sql',
      indent: '2',
      keywordCase: 'upper',
      functionCase: 'preserve',
      dataTypeCase: 'preserve',
      indentStyle: 'standard',
      logicalOperatorNewline: 'before',
      expressionWidth: 50,
      linesBetweenQueries: 1,
      denseOperators: false,
      newlineBeforeSemicolon: false,
      keepComments: false,
      modes: [
        { value: 'format', label: '整形' },
        { value: 'minify', label: '1 行に圧縮' },
      ],
      dialects: DIALECTS,
      caseOptions: [
        { value: 'upper', label: '大文字' },
        { value: 'lower', label: '小文字' },
        { value: 'preserve', label: 'そのまま' },
      ],
    };
  },
  computed: {
    formatOptions() {
      return {
        language: this.language,
        tabWidth: this.indent === 'tab' ? 2 : Number(this.indent),
        useTabs: this.indent === 'tab',
        keywordCase: this.keywordCase,
        functionCase: this.functionCase,
        dataTypeCase: this.dataTypeCase,
        indentStyle: this.indentStyle,
        logicalOperatorNewline: this.logicalOperatorNewline,
        expressionWidth: this.clampInt(this.expressionWidth, 1, 500, 50),
        linesBetweenQueries: this.clampInt(this.linesBetweenQueries, 0, 5, 1),
        denseOperators: this.denseOperators,
        newlineBeforeSemicolon: this.newlineBeforeSemicolon,
      };
    },
    result() {
      const sql = this.debouncedInput;
      if (!sql.trim()) return { output: '', error: null };
      try {
        const output = this.mode === 'format'
          ? format(sql, this.formatOptions)
          : minifySql(sql, { language: this.language, keepComments: this.keepComments });
        return { output, error: null };
      } catch (e) {
        return { output: '', error: describeError(e, sql) };
      }
    },
    highlighted() {
      return hljs.highlight(this.result.output, { language: 'sql' }).value;
    },
    outputStats() {
      const out = this.result.output;
      const lines = out.split('\n').length;
      return `${lines.toLocaleString()} 行 / ${out.length.toLocaleString()} 文字（入力 ${this.debouncedInput.length.toLocaleString()} 文字）`;
    },
  },
  watch: {
    input(value) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.debouncedInput = value;
      }, 200);
    },
  },
  created() {
    this.loadOptions();
    // 設定が変わったら保存する
    this.$watch(
      () => OPTION_KEYS.map((key) => this[key]),
      () => this.saveOptions(),
    );
  },
  beforeUnmount() {
    clearTimeout(this.debounceTimer);
  },
  methods: {
    clampInt(value, min, max, fallback) {
      const n = Math.round(Number(value));
      if (!Number.isFinite(n) || value === '') return fallback;
      return Math.min(max, Math.max(min, n));
    },
    loadSample() {
      this.input = SAMPLE_SQL;
    },
    loadOptions() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        for (const key of OPTION_KEYS) {
          // 型が同じ値だけ復元する
          if (key in saved && typeof saved[key] === typeof this[key]) this[key] = saved[key];
        }
        if (!DIALECTS.some((d) => d.value === this.language)) this.language = 'sql';
      } catch (e) {
        // localStorage が使えない・壊れている場合は初期値のまま
      }
    },
    saveOptions() {
      try {
        const options = {};
        for (const key of OPTION_KEYS) options[key] = this[key];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
      } catch (e) {
        // 保存できなくても動作には影響しない
      }
    },
  },
};
</script>

<style scoped>
.sql-modes {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid #d1d5db;
}

.sql-mode {
  padding: 0.375rem 0.875rem;
  font-size: 0.9375rem;
  color: #4b5563;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
  margin-bottom: -1px;
}

.sql-mode-active {
  color: var(--tb-main);
  font-weight: 700;
  border-color: #d1d5db;
  background-color: #fff;
}

.sql-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(10.5rem, 100%), 1fr));
  gap: 0.75rem 1rem;
}

.sql-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.25rem;
}

.sql-select {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.375rem 2rem 0.375rem 0.5rem;
  font-size: 0.875rem;
}

.sql-number {
  padding-right: 0.5rem;
}

.sql-select:focus,
.sql-textarea:focus {
  outline: none;
  border-color: var(--tb-main);
  box-shadow: 0 0 0 1px var(--tb-main);
}

.sql-textarea {
  display: block;
  width: 100%;
  min-height: 12rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.sql-button {
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  border-radius: 0.375rem;
  padding: 0.125rem 0.625rem;
  font-size: 0.8125rem;
}

.sql-button:hover:not(:disabled) {
  background-color: var(--tb-main);
  color: #fff;
}

.sql-button:disabled {
  opacity: 0.4;
  cursor: default;
}

.sql-output {
  margin: 0;
  padding: 1rem 3rem 1rem 1rem;
  border-radius: 0.375rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  /* 整形結果はインデントが崩れないよう折り返さずに横スクロール */
  white-space: pre;
  max-height: 40rem;
  overflow: auto;
}

.sql-output-wrap {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.sql-error {
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #f87171;
  border-radius: 0.375rem;
  background-color: #fef2f2;
  color: #b91c1c;
  font-size: 0.875rem;
  word-break: break-word;
}

.sql-error-snippet,
.sql-error-detail {
  margin-top: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  overflow-x: auto;
}

.sql-error-snippet {
  padding: 0.25rem 0.5rem;
  background-color: #fff;
  border-radius: 0.25rem;
  color: #7f1d1d;
}

.sql-error-detail {
  white-space: pre-wrap;
  color: #6b7280;
}
</style>
