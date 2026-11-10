<template>
  <div class="dev-tool cat-web">
    <section class="mb-8">
      <label class="block font-bold mb-2" for="url-input">URL を入力</label>
      <textarea
        id="url-input"
        v-model="input"
        rows="3"
        class="url-input border rounded-md p-2 w-full font-mono text-sm"
        placeholder="https://user:pass@example.com:8080/path/to?key=value&key=value2#section"
        spellcheck="false"
        autocomplete="off"
      ></textarea>
      <p class="hint mt-1">入力した URL は保存も送信もしません（ブラウザ内だけで処理します）。</p>
      <p v-if="parsed.error" class="error mt-2">{{ parsed.error }}</p>
      <div v-if="parsed.needsScheme" class="notice mt-2">
        <p>スキームがありません。<span class="font-mono break-all">{{ parsed.supplemented }}</span> として解釈しています。</p>
        <button type="button" class="action-button mt-2" @click="applyScheme">https:// を補って入力欄に反映</button>
      </div>
    </section>

    <template v-if="url">
      <section class="mb-8">
        <h2 class="section-title">構成要素</h2>
        <label class="inline-flex items-center gap-1 mb-3">
          <input v-model="showEncoded" type="checkbox" />
          エンコード済みの値も表示
        </label>
        <dl class="parts">
          <div v-for="part in parts" :key="part.label" class="part">
            <dt class="part-label">{{ part.label }}</dt>
            <dd class="part-body">
              <div class="part-line">
                <span v-if="part.value === ''" class="empty">（なし）</span>
                <span v-else class="font-mono break-all">{{ part.value }}</span>
                <span v-if="part.note" class="hint ml-2">{{ part.note }}</span>
                <CopyButton v-if="part.value" :textToCopy="part.value" class="ml-auto shrink-0" />
              </div>
              <div v-if="showEncoded && part.encoded !== undefined && part.encoded !== part.value" class="part-line encoded">
                <span class="tag">エンコード</span>
                <span class="font-mono break-all">{{ part.encoded }}</span>
              </div>
            </dd>
          </div>
        </dl>
      </section>

      <section class="mb-8">
        <h2 class="section-title">パス（セグメント）</h2>
        <ol class="segments">
          <li v-for="(seg, i) in segments" :key="i" class="segment">
            <span class="seg-index">{{ i + 1 }}</span>
            <span v-if="seg.decoded === ''" class="empty">（空）</span>
            <span v-else class="font-mono break-all">{{ seg.decoded }}</span>
            <span v-if="showEncoded && seg.encoded !== seg.decoded" class="font-mono break-all hint">{{ seg.encoded }}</span>
          </li>
        </ol>
      </section>

      <section class="mb-8">
        <h2 class="section-title">クエリパラメータ（{{ rows.length }}件）</h2>
        <div class="flex flex-wrap gap-2 mb-3">
          <button type="button" class="action-button" @click="addRow">行を追加</button>
          <button type="button" class="action-button" :disabled="rows.length < 2" @click="sortRows">キー順に並べ替え</button>
          <button type="button" class="action-button" :disabled="trackingCount === 0" @click="removeTracking">
            トラッキング系を削除（{{ trackingCount }}件）
          </button>
          <button type="button" class="action-button secondary" :disabled="!edited" @click="resetRows">元に戻す</button>
        </div>
        <p class="hint mb-2">値はデコード済みで編集します。utm_* / fbclid / gclid などをトラッキング系として扱います。</p>
        <p v-if="rows.length === 0" class="empty">クエリパラメータはありません。</p>
        <ul v-else class="query-rows">
          <li v-for="(row, i) in rows" :key="row.id" class="query-row" :class="{ tracking: isTracking(row.key) }">
            <div class="query-fields">
              <input v-model="row.key" type="text" class="query-input key" placeholder="キー" aria-label="キー" spellcheck="false" />
              <span class="eq">=</span>
              <input v-model="row.value" type="text" class="query-input" placeholder="値" aria-label="値" spellcheck="false" />
            </div>
            <div class="query-meta">
              <span v-if="keyCounts[row.key] > 1" class="badge">同名 {{ keyCounts[row.key] }}件</span>
              <span v-if="isTracking(row.key)" class="badge tracking-badge">トラッキング</span>
              <span v-if="showEncoded" class="font-mono break-all hint">{{ encodedRow(row) }}</span>
              <span class="row-buttons">
                <button type="button" class="icon-button" :disabled="i === 0" title="上へ" aria-label="上へ" @click="moveRow(i, -1)">↑</button>
                <button type="button" class="icon-button" :disabled="i === rows.length - 1" title="下へ" aria-label="下へ" @click="moveRow(i, 1)">↓</button>
                <button type="button" class="icon-button delete" title="削除" aria-label="削除" @click="removeRow(i)">×</button>
              </span>
            </div>
          </li>
        </ul>
      </section>

      <section class="mb-8">
        <h2 class="section-title">再構築した URL</h2>
        <label v-if="isIdn" class="inline-flex items-center gap-1 mb-2">
          <input v-model="unicodeHost" type="checkbox" />
          ホストを Unicode で表示（国際化ドメイン）
        </label>
        <div class="rebuilt">
          <span class="font-mono break-all">{{ rebuiltDisplay }}</span>
          <CopyButton :textToCopy="rebuiltDisplay" class="shrink-0" />
        </div>
        <p class="hint mt-1">{{ edited ? 'クエリを編集した結果です。' : '入力をそのまま正規化した結果です。' }}</p>
      </section>
    </template>
  </div>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue';
import {
  parseUrl,
  parseQuery,
  rebuildUrl,
  hasEmptyQuery,
  encodeQueryRow,
  isTrackingKey,
  safeDecode,
  pathSegments,
  hostToUnicode,
  hrefWithUnicodeHost,
  DEFAULT_PORTS,
} from '@/utilities/urlParser';

let nextId = 1;
const withId = (row) => ({ ...row, id: nextId++ });

export default {
  name: 'UrlParser',
  components: { CopyButton },
  data() {
    return {
      // 機微情報を含みうるので localStorage には保存しない
      input: 'https://user:p%40ss@例え.テスト:8443/検索/a%20b/?q=東京&tag=js&tag=vue&utm_source=x&fbclid=abc#結果',
      rows: [],
      showEncoded: true,
      unicodeHost: true,
    };
  },
  computed: {
    parsed() {
      return parseUrl(this.input);
    },
    url() {
      return this.parsed.url;
    },
    isIdn() {
      return !!this.url && hostToUnicode(this.url.hostname) !== this.url.hostname;
    },
    parts() {
      const u = this.url;
      const defaultPort = DEFAULT_PORTS[u.protocol];
      const unicode = hostToUnicode(u.hostname);
      return [
        { label: 'プロトコル', value: u.protocol.replace(/:$/, '') },
        { label: 'ユーザー名', value: safeDecode(u.username), encoded: u.username },
        { label: 'パスワード', value: safeDecode(u.password), encoded: u.password },
        {
          label: 'ホスト',
          value: unicode,
          encoded: u.hostname,
          note: unicode !== u.hostname ? '（国際化ドメイン）' : '',
        },
        {
          label: 'ポート',
          value: u.port,
          note: u.port === '' && defaultPort ? `既定: ${defaultPort}` : '',
        },
        { label: 'オリジン', value: u.origin === 'null' ? '' : hrefWithUnicodeHost(u.origin, u.hostname), encoded: u.origin === 'null' ? '' : u.origin },
        { label: 'パス', value: safeDecode(u.pathname), encoded: u.pathname },
        { label: 'クエリ', value: safeDecode(u.search.replace(/^\?/, '')), encoded: u.search.replace(/^\?/, '') },
        { label: 'フラグメント', value: safeDecode(u.hash.replace(/^#/, '')), encoded: u.hash.replace(/^#/, '') },
      ];
    },
    segments() {
      return pathSegments(this.url.pathname).map((s) => ({ encoded: s, decoded: safeDecode(s) }));
    },
    keyCounts() {
      const counts = {};
      for (const r of this.rows) counts[r.key] = (counts[r.key] || 0) + 1;
      return counts;
    },
    trackingCount() {
      return this.rows.filter((r) => isTrackingKey(r.key)).length;
    },
    rebuilt() {
      return rebuildUrl(this.url, this.rows, hasEmptyQuery(this.url));
    },
    rebuiltDisplay() {
      return this.unicodeHost && this.isIdn ? hrefWithUnicodeHost(this.rebuilt, this.url.hostname) : this.rebuilt;
    },
    edited() {
      return this.rebuilt !== this.url.href;
    },
  },
  watch: {
    // URL のクエリが変わったら編集用の行を作り直す
    'url.search': {
      handler() {
        this.resetRows();
      },
      immediate: true,
    },
  },
  methods: {
    resetRows() {
      this.rows = this.url ? parseQuery(this.url.search).map(withId) : [];
    },
    applyScheme() {
      this.input = this.parsed.supplemented;
    },
    isTracking(key) {
      return isTrackingKey(key);
    },
    encodedRow(row) {
      return encodeQueryRow(row);
    },
    addRow() {
      this.rows.push(withId({ key: '', value: '' }));
    },
    removeRow(i) {
      this.rows.splice(i, 1);
    },
    moveRow(i, delta) {
      const j = i + delta;
      const [row] = this.rows.splice(i, 1);
      this.rows.splice(j, 0, row);
    },
    sortRows() {
      // 同じキーの中の順序は保つ（安定ソート）
      this.rows = [...this.rows].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    },
    removeTracking() {
      this.rows = this.rows.filter((r) => !isTrackingKey(r.key));
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

.empty {
  color: #9ca3af;
}

.url-input {
  resize: vertical;
}

.notice {
  border: 1px solid #f59e0b;
  background: #fffbeb;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
}

.action-button {
  border: 1px solid var(--tb-main);
  background: var(--tb-main);
  color: #fff;
  border-radius: 0.375rem;
  padding: 0.3rem 0.75rem;
  font-size: 0.875rem;
}

.action-button:hover:not(:disabled) {
  background: var(--tb-main-hover);
}

.action-button.secondary {
  background: #fff;
  color: var(--tb-main);
}

.action-button:disabled,
.icon-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.parts {
  border-top: 1px solid #e5e7eb;
}

.part {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.part-label {
  font-weight: bold;
}

.part-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.part-line.encoded {
  margin-top: 0.2rem;
  color: #6b7280;
  font-size: 0.85rem;
}

.tag {
  flex-shrink: 0;
  font-size: 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  padding: 0 0.3rem;
}

.segments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.segment {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.3rem 0.6rem;
}

.seg-index {
  font-size: 0.7rem;
  color: #6b7280;
}

.query-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.query-row {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.5rem;
}

.query-row.tracking {
  background: #fef2f2;
  border-color: #fecaca;
}

.query-fields {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.query-input {
  flex: 1 1 0;
  min-width: 0;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  padding: 0.25rem 0.4rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875rem;
  background: #fff;
}

.query-input.key {
  flex-grow: 0.6;
}

.eq {
  color: #6b7280;
}

.query-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.35rem;
  min-width: 0;
}

.badge {
  font-size: 0.7rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 9999px;
  padding: 0.05rem 0.5rem;
}

.tracking-badge {
  background: #fee2e2;
  color: #991b1b;
}

.row-buttons {
  display: flex;
  gap: 0.25rem;
  margin-left: auto;
}

.icon-button {
  width: 1.8rem;
  height: 1.8rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background: #fff;
}

.icon-button.delete {
  color: #b91c1c;
}

.rebuilt {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: #f9fafb;
  padding: 0.5rem 0.75rem;
}

@media (max-width: 480px) {
  .part {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.15rem;
  }
}
</style>
