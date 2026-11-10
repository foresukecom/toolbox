<template>
  <div class="dev-tool cat-web">
    <div class="mb-4">
      <label for="page-url" class="block mb-1 font-semibold">Web ページの URL</label>
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          id="page-url"
          v-model="url"
          type="url"
          class="flex-1 border rounded-md p-2 font-mono text-sm"
          placeholder="https://example.com/"
          spellcheck="false"
          @keydown.enter.prevent="fetchImages"
        />
        <button
          type="button"
          class="action-button"
          :disabled="loading || !url.trim()"
          @click="fetchImages"
        >
          {{ loading ? '取得中…' : '取得' }}
        </button>
      </div>
      <p class="mt-1 text-xs text-gray-600">
        入力した URL と画像は、このサイトのサーバー（Netlify Functions）から取得します。
        調べるのはページ内の画像のうち最大20件で、各画像は先頭 256KB だけを読み取ります。
      </p>
      <p v-if="loading" class="mt-2 text-sm text-gray-700">ページと画像を取得しています（最大で10秒ほどかかります）…</p>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </div>

    <template v-if="result">
      <section class="mb-6">
        <h2 class="section-title mb-2">概要</h2>
        <div class="summary-box">
          <p class="mb-2 break-all">
            <span class="font-semibold">{{ result.title || '(タイトルなし)' }}</span>
            <br />
            <a
              v-if="safeHref(result.page)"
              :href="safeHref(result.page)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm link"
            >{{ result.page }}</a>
          </p>
          <dl class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
            <div class="stat">
              <dt>見つかった画像</dt>
              <dd>{{ result.found }}</dd>
            </div>
            <div class="stat">
              <dt>調べた数</dt>
              <dd>{{ checkedCount }}</dd>
            </div>
            <div class="stat">
              <dt>スキップ</dt>
              <dd>{{ result.skipped || 0 }}</dd>
            </div>
            <div class="stat">
              <dt>メタデータあり</dt>
              <dd>{{ metadataCount }}</dd>
            </div>
            <div class="stat" :class="{ 'stat-danger': gpsCount > 0 }">
              <dt>位置情報あり</dt>
              <dd>{{ gpsCount }}</dd>
            </div>
          </dl>
          <p v-if="gpsCount > 0" class="mt-3 text-sm font-semibold gps-warning">
            ⚠ 位置情報（GPS）を含む画像が {{ gpsCount }} 件あります。撮影場所が公開されている可能性があります。
          </p>
          <p v-if="result.dataUriCount" class="mt-2 text-xs text-gray-600">
            data: URI の画像 {{ result.dataUriCount }} 件は対象外です。
          </p>
          <p v-if="result.skipped" class="mt-1 text-xs text-gray-600">
            件数の上限（20件）または処理時間の上限により、{{ result.skipped }} 件は調べていません。
          </p>
        </div>
      </section>

      <section v-if="result.images.length" class="mb-6">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div class="flex gap-1" role="group" aria-label="フィルター">
            <button
              v-for="f in filters"
              :key="f.value"
              type="button"
              class="filter-button"
              :class="{ active: filter === f.value }"
              @click="filter = f.value"
            >
              {{ f.label }}
            </button>
          </div>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="showThumbnails" type="checkbox" />
            サムネイルを表示
          </label>
        </div>
        <p v-if="showThumbnails" class="mb-3 text-xs text-gray-600">
          サムネイルは、お使いのブラウザから画像の取得先へ直接アクセスして読み込みます。
        </p>

        <p v-if="filteredImages.length === 0" class="text-sm text-gray-600">該当する画像はありません。</p>

        <div class="grid gap-3">
          <article
            v-for="image in filteredImages"
            :key="image.url"
            class="image-card"
            :class="{ 'image-card-gps': image.hasGps }"
          >
            <div class="flex gap-3">
              <div v-if="showThumbnails && safeHref(image.url)" class="thumb">
                <img
                  :src="safeHref(image.url)"
                  :alt="image.alt"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm break-all">
                  <a
                    v-if="safeHref(image.url)"
                    :href="safeHref(image.url)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link font-mono"
                  >{{ image.url }}</a>
                  <span v-else class="font-mono">{{ image.url }}</span>
                </p>
                <div class="flex flex-wrap gap-2 mt-1 text-xs">
                  <span v-if="image.contentType" class="tag">{{ image.contentType }}</span>
                  <span v-if="image.bytesRead" class="tag">
                    {{ formatBytes(image.bytesRead) }}{{ image.truncated ? '（先頭のみ）' : '' }}
                  </span>
                  <span v-if="image.hasGps" class="tag tag-danger">位置情報あり</span>
                  <span v-else-if="image.metadata" class="tag tag-ok">メタデータあり</span>
                  <span v-if="image.skipped" class="tag tag-warn">スキップ</span>
                  <span v-if="image.error" class="tag tag-warn">取得失敗</span>
                </div>
                <p v-if="image.alt" class="mt-1 text-sm text-gray-700 break-all">alt: {{ image.alt }}</p>

                <p v-if="image.error" class="mt-2 text-sm text-red-600">
                  {{ errorText(image.error) }}
                </p>
                <p v-else-if="image.note" class="mt-2 text-sm text-gray-600">{{ image.note }}</p>

                <table v-if="image.metadata" class="mt-2 w-full text-sm border meta-table">
                  <tbody>
                    <tr v-for="row in metadataRows(image.metadata)" :key="row.key">
                      <th class="border px-2 py-1 text-left font-normal bg-gray-50">{{ row.label }}</th>
                      <td class="border px-2 py-1 font-mono break-all">{{ row.value }}</td>
                    </tr>
                    <tr>
                      <th class="border px-2 py-1 text-left font-normal bg-gray-50">位置情報</th>
                      <td class="border px-2 py-1 font-mono" :class="{ 'gps-warning font-semibold': image.hasGps }">
                        {{ image.hasGps ? formatCoords(image.metadata) : 'なし' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </div>
      </section>
      <p v-else class="text-sm text-gray-600">このページには調べられる画像が見つかりませんでした。</p>
    </template>
  </div>
</template>

<script>
const ERROR_MESSAGES = {
  missing_url: 'URL を入力してください。',
  invalid_url: 'URL の形式が正しくありません。',
  blocked_url: 'この URL は取得できません（http / https、ポート 80 / 443 のみ対応）。',
  blocked_address: 'この接続先（内部ネットワークなど）は取得できません。',
  not_html: '取得先が HTML ページではありません。画像ではなく、画像が載っているページの URL を入力してください。',
  http_status: '取得先がエラーを返しました。',
  timeout: '取得先の応答がタイムアウトしました。',
  network: '取得先に接続できませんでした。',
  not_found: 'ホスト名を解決できませんでした。',
  too_large: '取得先のデータが大きすぎます。',
  too_many_redirects: 'リダイレクトが多すぎます。',
  internal: 'サーバーでエラーが発生しました。',
  request_failed: 'サーバーに接続できませんでした。時間をおいて再度お試しください。',
};

const METADATA_LABELS = [
  ['Make', 'メーカー'],
  ['Model', '機種'],
  ['LensModel', 'レンズ'],
  ['DateTimeOriginal', '撮影日時'],
  ['Software', 'ソフトウェア'],
  ['Artist', '作者'],
  ['Copyright', '著作権'],
];

export default {
  name: 'PageImageMetadata',
  data() {
    return {
      url: '',
      loading: false,
      error: '',
      result: null,
      filter: 'all',
      showThumbnails: false,
      filters: [
        { value: 'all', label: 'すべて' },
        { value: 'metadata', label: 'メタデータあり' },
        { value: 'gps', label: '位置情報あり' },
      ],
    };
  },
  computed: {
    images() {
      return (this.result && this.result.images) || [];
    },
    checkedCount() {
      if (typeof this.result.checked === 'number') return this.result.checked;
      return this.images.filter((img) => !img.skipped).length;
    },
    metadataCount() {
      return this.images.filter((img) => img.metadata).length;
    },
    gpsCount() {
      return this.images.filter((img) => img.hasGps).length;
    },
    filteredImages() {
      if (this.filter === 'metadata') return this.images.filter((img) => img.metadata);
      if (this.filter === 'gps') return this.images.filter((img) => img.hasGps);
      return this.images;
    },
  },
  methods: {
    async fetchImages() {
      const target = this.url.trim();
      if (!target || this.loading) return;
      this.loading = true;
      this.error = '';
      this.result = null;
      this.filter = 'all';
      const endpoint = `${process.env.VUE_APP_NETLIFY_FUNCTION_DOMAIN}/.netlify/functions/page-images`;
      try {
        const response = await fetch(`${endpoint}?url=${encodeURIComponent(target)}`);
        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          data = null;
        }
        if (!response.ok || !data || data.error || !Array.isArray(data.images)) {
          this.error = this.errorText((data && data.error) || 'internal', data && data.message);
          return;
        }
        this.result = data;
      } catch (e) {
        this.error = this.errorText('request_failed');
      } finally {
        this.loading = false;
      }
    },
    errorText(code, message) {
      const text = ERROR_MESSAGES[code];
      if (code === 'http_status' && message) return `${text}（${message}）`;
      return text || message || ERROR_MESSAGES.internal;
    },
    // http: / https: の URL だけをリンク・画像に使う
    safeHref(value) {
      try {
        const u = new URL(value);
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
      } catch (e) {
        return null;
      }
    },
    metadataRows(metadata) {
      const rows = METADATA_LABELS
        .filter(([key]) => metadata[key] !== undefined && metadata[key] !== null)
        .map(([key, label]) => ({ key, label, value: this.formatValue(key, metadata[key]) }));
      if (metadata.ImageWidth || metadata.ImageHeight) {
        rows.push({
          key: 'size',
          label: 'サイズ',
          value: `${metadata.ImageWidth || '?'} × ${metadata.ImageHeight || '?'}`,
        });
      }
      return rows;
    },
    formatValue(key, value) {
      if (key === 'DateTimeOriginal') {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) {
          // EXIF の撮影日時はタイムゾーンを持たないことが多いため、記録された値をそのまま表示する
          return d.toISOString().replace('T', ' ').replace(/\.000Z$|Z$/, '');
        }
      }
      return String(value);
    },
    formatCoords(metadata) {
      const lat = Number(metadata.latitude);
      const lon = Number(metadata.longitude);
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    },
    formatBytes(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      return `${(bytes / 1024).toFixed(1)} KB`;
    },
  },
};
</script>

<style scoped>
.section-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--tb-main);
}

.action-button {
  background-color: var(--tb-main);
  color: #fff;
  font-weight: 600;
  padding: 8px 20px;
  border-radius: 6px;
  white-space: nowrap;
}

.action-button:hover:not(:disabled) {
  background-color: var(--tb-main-hover);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.summary-box {
  border: 1px solid #e5e7eb;
  border-left: 4px solid var(--tb-main);
  border-radius: 4px;
  padding: 12px;
  background-color: #f9fafb;
}

.stat {
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 6px 8px;
}

.stat dt {
  font-size: 0.75rem;
  color: #6b7280;
}

.stat dd {
  font-size: 1.25rem;
  font-weight: 700;
}

.stat-danger {
  background-color: #fef2f2;
  border-color: #dc2626;
  color: #b91c1c;
}

.stat-danger dt {
  color: #b91c1c;
}

.gps-warning {
  color: #b91c1c;
}

.link {
  color: var(--tb-main);
  text-decoration: underline;
}

.filter-button {
  padding: 4px 12px;
  border: 1px solid var(--tb-main);
  border-radius: 9999px;
  font-size: 0.875rem;
  color: var(--tb-main);
  background-color: #fff;
}

.filter-button.active {
  background-color: var(--tb-main);
  color: #fff;
}

.image-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background-color: #fff;
}

.image-card-gps {
  border-color: #dc2626;
  box-shadow: inset 4px 0 0 #dc2626;
}

.thumb {
  flex: 0 0 96px;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 9999px;
  background-color: #f3f4f6;
  color: #374151;
}

.tag-ok {
  background-color: var(--tb-main);
  color: #fff;
}

.tag-warn {
  background-color: #d97706;
  color: #fff;
}

.tag-danger {
  background-color: #dc2626;
  color: #fff;
}

.meta-table th {
  width: 8rem;
}
</style>
