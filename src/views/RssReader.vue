<template>
  <div class="dev-tool cat-web">
    <form class="mb-4" @submit.prevent="load()">
      <label for="rss-url" class="block mb-1 font-semibold">サイトまたはフィードの URL</label>
      <div class="flex flex-wrap gap-2">
        <input
          id="rss-url"
          v-model="input"
          type="url"
          inputmode="url"
          class="flex-1 min-w-0 border rounded-md p-2 font-mono text-sm"
          placeholder="https://example.com/"
          spellcheck="false"
          autocomplete="off"
        />
        <button
          type="submit"
          class="fetch-button text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading || !input.trim()"
        >
          {{ loading ? '取得中…' : '取得' }}
        </button>
      </div>
      <p class="mt-1 text-xs text-gray-600">
        入力した URL は、取得のためにこのサイトのサーバー（Netlify Functions）から取得先にアクセスします
      </p>
      <p v-if="loading" class="mt-2 text-sm text-gray-700">取得しています…</p>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </form>

    <section v-if="discovered.length >= 2" class="mb-6">
      <h2 class="section-title mb-1">見つかったフィード（{{ discovered.length }}件）</h2>
      <ul class="space-y-1">
        <li v-for="candidate in discovered" :key="candidate.url">
          <button
            type="button"
            class="candidate w-full text-left border rounded-md px-3 py-2 text-sm"
            :class="{ 'candidate-active': feed && feed.url === candidate.url }"
            :disabled="loading"
            @click="load(candidate.url, true)"
          >
            <span class="font-semibold">{{ candidate.title || '(タイトルなし)' }}</span>
            <span class="type-label ml-2">{{ typeLabel(candidate.type) }}</span>
            <span class="block font-mono text-xs text-gray-600 break-all">{{ candidate.url }}</span>
          </button>
        </li>
      </ul>
    </section>

    <template v-if="feed">
      <section class="mb-6">
        <h2 class="section-title mb-1">フィード情報</h2>
        <dl class="feed-info text-sm">
          <dt>タイトル</dt>
          <dd>{{ feed.title || '—' }}</dd>
          <dt>サイト</dt>
          <dd>
            <a v-if="safeUrl(feed.siteUrl)" :href="safeUrl(feed.siteUrl)" target="_blank" rel="noopener noreferrer" class="link break-all">{{ feed.siteUrl }}</a>
            <span v-else>—</span>
          </dd>
          <dt>フィード URL</dt>
          <dd class="flex items-start gap-2">
            <span class="font-mono break-all">{{ feed.url }}</span>
            <CopyButton :textToCopy="feed.url" />
          </dd>
          <dt>形式</dt>
          <dd>{{ typeLabel(feed.type) }}</dd>
          <dt>更新日時</dt>
          <dd>{{ formatDate(feed.updated) }}</dd>
          <dt>記事数</dt>
          <dd>{{ feed.items.length }}件</dd>
          <template v-if="feed.description">
            <dt>説明</dt>
            <dd>{{ feed.description }}</dd>
          </template>
        </dl>
      </section>

      <section class="mb-6">
        <h2 class="section-title mb-2">記事一覧</h2>
        <p v-if="!feed.items.length" class="text-sm text-gray-600">記事がありません</p>
        <ul class="space-y-3">
          <li v-for="(item, index) in feed.items" :key="index" class="item">
            <a
              v-if="safeUrl(item.link)"
              :href="safeUrl(item.link)"
              target="_blank"
              rel="noopener noreferrer"
              class="link font-semibold"
            >{{ item.title || item.link }}</a>
            <span v-else class="font-semibold">{{ item.title || '(タイトルなし)' }}</span>
            <div class="text-xs text-gray-600 mt-1">
              <span>{{ formatDate(item.published) }}</span>
              <span v-if="item.author" class="ml-3">{{ item.author }}</span>
            </div>
            <p v-if="item.summary" class="text-sm mt-1 break-words">{{ item.summary }}</p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue';

const ERROR_MESSAGES = {
  missing_url: 'URL を入力してください',
  invalid_url: 'URL の形式が正しくありません',
  blocked_url: 'この URL は取得できません',
  blocked_address: 'この接続先は取得できません',
  not_found: 'ホスト名を解決できません',
  not_feed: 'フィードが見つかりませんでした',
  timeout: '取得先の応答がタイムアウトしました',
  too_large: '取得先のデータが大きすぎます',
  too_many_redirects: 'リダイレクトが多すぎます',
  http_status: '取得先がエラーを返しました',
  network: '取得先に接続できませんでした',
  internal: '取得中にエラーが発生しました',
};

const TYPE_LABELS = { rss: 'RSS 2.0', rdf: 'RSS 1.0 (RDF)', atom: 'Atom' };

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export default {
  name: 'RssReader',
  components: { CopyButton },
  data() {
    return {
      input: '',
      loading: false,
      error: '',
      discovered: [],
      feed: null,
      requestId: 0,
    };
  },
  methods: {
    // keepCandidates: 候補一覧から選んだときは、一覧を残したまま取得し直す
    async load(url, keepCandidates = false) {
      const target = (url || this.input).trim();
      if (!target) return;
      const id = ++this.requestId;
      this.loading = true;
      this.error = '';
      if (!keepCandidates) {
        this.discovered = [];
        this.feed = null;
      }
      try {
        const baseURL = process.env.VUE_APP_NETLIFY_FUNCTION_DOMAIN || '';
        const endpoint = `${baseURL}/.netlify/functions/rss-feed?url=${encodeURIComponent(target)}`;
        const response = await fetch(endpoint);
        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          data = null;
        }
        if (id !== this.requestId) return;
        if (!response.ok || !data) {
          this.error = this.errorMessage(data, response.status);
          return;
        }
        if (!keepCandidates) this.discovered = Array.isArray(data.discovered) ? data.discovered : [];
        this.feed = data.feed && Array.isArray(data.feed.items) ? data.feed : null;
        if (!this.feed) this.error = this.errorMessage(data.feedError || { error: 'not_feed' });
      } catch (e) {
        if (id !== this.requestId) return;
        this.error = '取得用サーバーに接続できませんでした';
      } finally {
        if (id === this.requestId) this.loading = false;
      }
    },
    errorMessage(data, status) {
      const code = data && data.error;
      if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
      return status ? `取得に失敗しました（HTTP ${status}）` : '取得に失敗しました';
    },
    // http: / https: 以外のリンクは作らない
    safeUrl(value) {
      if (typeof value !== 'string') return null;
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
      } catch (e) {
        return null;
      }
    },
    formatDate(value) {
      if (!value) return '日時不明';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '日時不明';
      return `${dateFormatter.format(date)} JST`;
    },
    typeLabel(type) {
      return TYPE_LABELS[type] || type || '';
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

.fetch-button {
  background-color: var(--tb-main);
}

.fetch-button:hover:not(:disabled) {
  background-color: var(--tb-main-hover);
}

.candidate:hover:not(:disabled) {
  background-color: #f6f8fa;
}

.candidate-active {
  border-left: 4px solid var(--tb-main);
  background-color: #f6f8fa;
}

.type-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.feed-info {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
}

.feed-info dt {
  font-weight: 600;
  color: #4b5563;
}

.feed-info dd {
  margin: 0;
  min-width: 0;
}

.item {
  border-left: 4px solid var(--tb-main);
  padding: 4px 0 4px 12px;
}

.link {
  color: var(--tb-main);
  text-decoration: underline;
}

.link:hover {
  color: var(--tb-main-hover);
}
</style>
