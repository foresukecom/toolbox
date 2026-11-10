<template>
  <div class="dev-tool cat-web">
    <form class="mb-4" @submit.prevent="fetchMeta">
      <label for="ogp-url" class="block mb-1 font-semibold">Web ページの URL</label>
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          id="ogp-url"
          v-model="url"
          type="url"
          class="flex-1 min-w-0 border rounded-md p-2 font-mono text-sm"
          placeholder="https://example.com/"
          spellcheck="false"
        />
        <button type="submit" class="action-button" :disabled="loading || !url.trim()">
          {{ loading ? '取得中…' : '取得' }}
        </button>
      </div>
      <p class="mt-1 text-xs text-gray-600">
        入力した URL のページは、このサイトのサーバー（Netlify Functions）から取得します。
        og:image は寸法を調べるため先頭 128KB だけを読み取ります。
      </p>
      <p v-if="loading" class="mt-2 text-sm text-gray-700">ページを取得しています…</p>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </form>

    <template v-if="result">
      <!-- 概要 -->
      <section class="mb-6">
        <h2 class="section-title mb-2">概要</h2>
        <div class="summary-box">
          <div class="flex items-start gap-2 min-w-0">
            <img
              v-if="showImages && safeHref(display.favicon)"
              :src="safeHref(display.favicon)"
              alt=""
              class="favicon mt-1"
              referrerpolicy="no-referrer"
              @error="hideImage"
            />
            <div class="min-w-0">
              <p class="font-semibold break-all">{{ result.basic.title || '(タイトルなし)' }}</p>
              <a
                v-if="safeHref(result.page)"
                :href="safeHref(result.page)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm link break-all"
              >{{ result.page }}</a>
            </div>
          </div>
          <dl class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div class="stat stat-error">
              <dt>エラー</dt>
              <dd>{{ countOf('error') }}</dd>
            </div>
            <div class="stat stat-warn">
              <dt>警告</dt>
              <dd>{{ countOf('warn') }}</dd>
            </div>
            <div class="stat">
              <dt>画像サイズ</dt>
              <dd class="text-base">{{ dimensionText }}</dd>
            </div>
            <div class="stat">
              <dt>theme-color</dt>
              <dd class="text-base flex items-center gap-1">
                <span v-if="display.themeColor" class="swatch" :style="{ backgroundColor: display.themeColor }"></span>
                <span class="font-mono break-all">{{ display.themeColor || 'なし' }}</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- プレビュー -->
      <section class="mb-6">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 class="section-title">プレビュー</h2>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="showImages" type="checkbox" />
            画像を表示
          </label>
        </div>
        <p class="mb-3 text-xs text-gray-600">
          各サービスの表示を汎用的な見た目で再現した目安です（実際の表示とは異なる場合があります）。
          <template v-if="showImages">画像は、お使いのブラウザから画像の取得先へ直接アクセスして読み込みます。</template>
        </p>

        <div class="grid gap-6 md:grid-cols-2">
          <!-- X 風: 大きい画像カード -->
          <div class="preview-block">
            <h3 class="preview-title">
              X 風（大きい画像カード）
              <span v-if="display.twitter.card === 'summary_large_image'" class="tag tag-ok">このページで使われる表示</span>
            </h3>
            <div class="x-large">
              <div class="x-large-image">
                <img
                  v-if="showImages && safeHref(display.twitter.image)"
                  :src="safeHref(display.twitter.image)"
                  alt=""
                  referrerpolicy="no-referrer"
                  @error="hideImage"
                />
                <span v-else class="no-image">画像なし</span>
                <span class="x-large-label">{{ truncate(display.twitter.title, 70) }}</span>
              </div>
            </div>
            <p class="x-from">{{ display.host }} から</p>
          </div>

          <!-- X 風: 小さいカード -->
          <div class="preview-block">
            <h3 class="preview-title">
              X 風（小さいカード）
              <span v-if="display.twitter.card === 'summary'" class="tag tag-ok">このページで使われる表示</span>
            </h3>
            <div class="x-small">
              <div class="x-small-image">
                <img
                  v-if="showImages && safeHref(display.twitter.image)"
                  :src="safeHref(display.twitter.image)"
                  alt=""
                  referrerpolicy="no-referrer"
                  @error="hideImage"
                />
                <span v-else class="no-image">画像なし</span>
              </div>
              <div class="x-small-body">
                <p class="x-small-host">{{ display.host }}</p>
                <p class="x-small-title clamp-1">{{ display.twitter.title || display.host }}</p>
                <p class="x-small-desc clamp-2">{{ display.twitter.description }}</p>
              </div>
            </div>
          </div>

          <!-- Facebook 風 -->
          <div class="preview-block">
            <h3 class="preview-title">Facebook 風</h3>
            <div class="fb-card">
              <div class="fb-image">
                <img
                  v-if="showImages && safeHref(display.og.image)"
                  :src="safeHref(display.og.image)"
                  alt=""
                  referrerpolicy="no-referrer"
                  @error="hideImage"
                />
                <span v-else class="no-image">画像なし</span>
              </div>
              <div class="fb-body">
                <p class="fb-host">{{ display.host.toUpperCase() }}</p>
                <p class="fb-title clamp-2">{{ display.og.title || display.host }}</p>
                <p class="fb-desc clamp-1">{{ display.og.description }}</p>
              </div>
            </div>
          </div>

          <!-- Slack 風 -->
          <div class="preview-block">
            <h3 class="preview-title">Slack 風</h3>
            <div class="slack-card">
              <p class="slack-site">
                <img
                  v-if="showImages && safeHref(display.favicon)"
                  :src="safeHref(display.favicon)"
                  alt=""
                  class="favicon-sm"
                  referrerpolicy="no-referrer"
                  @error="hideImage"
                />
                {{ display.siteName }}
              </p>
              <p class="slack-title">{{ display.og.title || display.host }}</p>
              <p class="slack-desc clamp-3">{{ display.og.description }}</p>
              <div v-if="display.og.image" class="slack-image">
                <img
                  v-if="showImages && safeHref(display.og.image)"
                  :src="safeHref(display.og.image)"
                  alt=""
                  referrerpolicy="no-referrer"
                  @error="hideImage"
                />
                <span v-else class="no-image">画像</span>
              </div>
            </div>
          </div>

          <!-- Discord 風 -->
          <div class="preview-block">
            <h3 class="preview-title">Discord 風</h3>
            <div class="discord-wrap">
              <div class="discord-card" :style="{ borderLeftColor: display.themeColor || '#1e1f22' }">
                <p class="discord-site">{{ display.siteName }}</p>
                <p class="discord-title">{{ display.og.title || display.host }}</p>
                <p class="discord-desc clamp-3">{{ display.og.description }}</p>
                <div v-if="display.og.image" class="discord-image">
                  <img
                    v-if="showImages && safeHref(display.og.image)"
                    :src="safeHref(display.og.image)"
                    alt=""
                    referrerpolicy="no-referrer"
                    @error="hideImage"
                  />
                  <span v-else class="no-image">画像</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- チェック結果 -->
      <section class="mb-6">
        <h2 class="section-title mb-2">チェック結果</h2>
        <ul class="grid gap-2">
          <li v-for="(c, i) in checks" :key="i" class="check-item" :class="`check-${c.level}`">
            <span class="check-badge">{{ levelLabels[c.level] }}</span>
            <div class="min-w-0">
              <p class="font-semibold text-sm">{{ c.label }}</p>
              <p class="text-sm text-gray-700 break-all">{{ c.detail }}</p>
            </div>
          </li>
        </ul>
      </section>

      <!-- 主な値 -->
      <section class="mb-6">
        <h2 class="section-title mb-2">主な値</h2>
        <table class="w-full text-sm border main-table table-fixed">
          <tbody>
            <tr v-for="row in mainRows" :key="row.key">
              <th class="border px-2 py-1 text-left font-normal bg-gray-50 font-mono break-all">{{ row.key }}</th>
              <td class="border px-2 py-1 break-all" :class="{ 'text-gray-400': !row.value }">
                {{ row.value || '(なし)' }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 全メタタグ -->
      <section class="mb-6">
        <h2 class="section-title mb-2">すべてのメタタグ（{{ result.metaTags.length }} 件）</h2>
        <p v-if="result.metaTags.length === 0" class="text-sm text-gray-600">meta タグはありませんでした。</p>
        <table v-else class="w-full text-sm border meta-table table-fixed">
          <thead>
            <tr class="bg-gray-50">
              <th class="border px-2 py-1 text-left">属性</th>
              <th class="border px-2 py-1 text-left">キー</th>
              <th class="border px-2 py-1 text-left">content</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(tag, i) in result.metaTags" :key="i">
              <td class="border px-2 py-1 font-mono text-xs text-gray-600 break-all">{{ tag.attr }}</td>
              <td class="border px-2 py-1 font-mono break-all">{{ tag.key }}</td>
              <td class="border px-2 py-1 break-all">{{ tag.content }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<script>
import { runChecks, resolveDisplay, imageDimensions, truncate } from '@/utilities/ogpChecks';

const ERROR_MESSAGES = {
  missing_url: 'URL を入力してください。',
  invalid_url: 'URL の形式が正しくありません。',
  blocked_url: 'この URL は取得できません（http / https、ポート 80 / 443 のみ対応）。',
  blocked_address: 'この接続先（内部ネットワークなど）は取得できません。',
  not_html: '取得先が HTML ページではありません。',
  http_status: '取得先がエラーを返しました。',
  timeout: '取得先の応答がタイムアウトしました。',
  network: '取得先に接続できませんでした。',
  not_found: 'ホスト名を解決できませんでした。',
  too_large: '取得先のデータが大きすぎます。',
  too_many_redirects: 'リダイレクトが多すぎます。',
  internal: 'サーバーでエラーが発生しました。',
  request_failed: 'サーバーに接続できませんでした。時間をおいて再度お試しください。',
};

export default {
  name: 'OgpPreview',
  data() {
    return {
      url: '',
      loading: false,
      error: '',
      result: null,
      showImages: true,
      levelLabels: { error: 'エラー', warn: '警告', info: '情報', ok: 'OK' },
    };
  },
  computed: {
    display() {
      return resolveDisplay(this.result);
    },
    checks() {
      return runChecks(this.result);
    },
    dimensionText() {
      const dim = imageDimensions(this.result);
      return dim ? `${dim.width}×${dim.height}` : '不明';
    },
    mainRows() {
      const { og, twitter, basic } = this.result;
      return [
        ['og:title', og.title],
        ['og:description', og.description],
        ['og:image', og.image],
        ['og:url', og.url],
        ['og:site_name', og.site_name],
        ['og:type', og.type],
        ['twitter:card', twitter.card],
        ['twitter:title', twitter.title],
        ['twitter:description', twitter.description],
        ['twitter:image', twitter.image],
        ['<title>', basic.title],
        ['meta description', basic.description],
        ['canonical', basic.canonical],
        ['favicon', basic.favicon + (basic.faviconFallback ? '（指定なし・既定の場所）' : '')],
        ['theme-color', basic.themeColor],
      ].map(([key, value]) => ({ key, value }));
    },
  },
  methods: {
    async fetchMeta() {
      const target = this.url.trim();
      if (!target || this.loading) return;
      this.loading = true;
      this.error = '';
      this.result = null;
      const endpoint = `${process.env.VUE_APP_NETLIFY_FUNCTION_DOMAIN}/.netlify/functions/ogp-preview`;
      try {
        const response = await fetch(`${endpoint}?url=${encodeURIComponent(target)}`);
        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          data = null;
        }
        if (!response.ok || !data || data.error || !data.og || !Array.isArray(data.metaTags)) {
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
    countOf(level) {
      return this.checks.filter((c) => c.level === level).length;
    },
    truncate,
    // http: / https: の URL だけをリンク・画像に使う
    safeHref(value) {
      try {
        const u = new URL(value);
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
      } catch (e) {
        return null;
      }
    },
    // 読み込めなかった画像は、CORS 付きで 1 回だけ再試行する
    // （COEP: require-corp の環境でも、取得先が CORS を許可していれば表示できる）。それも失敗したら隠す
    hideImage(event) {
      const img = event.target;
      if (!img.crossOrigin) {
        img.crossOrigin = 'anonymous';
        img.src = img.getAttribute('src');
        return;
      }
      // favicon は詰めて消し、カードの画像は枠を残す
      if (img.classList.contains('favicon') || img.classList.contains('favicon-sm')) img.style.display = 'none';
      else img.style.visibility = 'hidden';
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
  min-width: 0;
}

.stat dt {
  font-size: 0.75rem;
  color: #6b7280;
}

.stat dd {
  font-size: 1.25rem;
  font-weight: 700;
}

.stat-error dd {
  color: #b91c1c;
}

.stat-warn dd {
  color: #b45309;
}

.swatch {
  display: inline-block;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
}

.link {
  color: var(--tb-main);
  text-decoration: underline;
}

.favicon {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.favicon-sm {
  display: inline-block;
  width: 16px;
  height: 16px;
  object-fit: contain;
  vertical-align: -3px;
  margin-right: 4px;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 400;
  vertical-align: 1px;
}

.tag-ok {
  background-color: var(--tb-main);
  color: #fff;
}

.preview-block {
  min-width: 0;
}

.preview-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.no-image {
  color: #9ca3af;
  font-size: 0.75rem;
}

.clamp-1,
.clamp-2,
.clamp-3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.clamp-1 {
  -webkit-line-clamp: 1;
}

.clamp-2 {
  -webkit-line-clamp: 2;
}

.clamp-3 {
  -webkit-line-clamp: 3;
}

/* X 風: 大きい画像カード */
.x-large {
  border: 1px solid #cfd9de;
  border-radius: 16px;
  overflow: hidden;
}

.x-large-image {
  position: relative;
  aspect-ratio: 1.91 / 1;
  background-color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.x-large-image img,
.x-small-image img,
.fb-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.x-large-label {
  position: absolute;
  left: 12px;
  bottom: 12px;
  max-width: calc(100% - 24px);
  padding: 0 4px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.77);
  color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.x-from {
  margin-top: 4px;
  font-size: 13px;
  color: #536471;
}

/* X 風: 小さいカード */
.x-small {
  display: flex;
  border: 1px solid #cfd9de;
  border-radius: 16px;
  overflow: hidden;
  min-height: 110px;
}

.x-small-image {
  position: relative;
  flex: 0 0 110px;
  background-color: #e5e7eb;
  border-right: 1px solid #cfd9de;
  display: flex;
  align-items: center;
  justify-content: center;
}

.x-small-body {
  min-width: 0;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 14px;
  line-height: 1.3;
}

.x-small-host,
.x-small-desc {
  color: #536471;
}

.x-small-title {
  color: #0f1419;
}

/* Facebook 風 */
.fb-card {
  border: 1px solid #dadde1;
  overflow: hidden;
}

.fb-image {
  position: relative;
  aspect-ratio: 1.91 / 1;
  background-color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #dadde1;
}

.fb-body {
  background-color: #f0f2f5;
  padding: 10px 12px;
}

.fb-host {
  font-size: 12px;
  color: #65676b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fb-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #050505;
  margin: 2px 0;
}

.fb-desc {
  font-size: 14px;
  color: #65676b;
}

/* Slack 風 */
.slack-card {
  border-left: 4px solid #dddddd;
  padding: 2px 0 2px 12px;
  font-size: 15px;
  line-height: 1.45;
  color: #1d1c1d;
}

.slack-site {
  font-weight: 700;
  word-break: break-word;
}

.slack-title {
  font-weight: 700;
  color: #1264a3;
  word-break: break-word;
}

.slack-image,
.discord-image {
  position: relative;
  margin-top: 8px;
  max-width: 360px;
  aspect-ratio: 1.91 / 1;
  border-radius: 8px;
  overflow: hidden;
  background-color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slack-image img,
.discord-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Discord 風（チャット画面に合わせて暗い背景で再現する） */
.discord-wrap {
  background-color: #313338;
  padding: 12px;
  border-radius: 6px;
}

.discord-card {
  background-color: #2b2d31;
  border-left: 4px solid #1e1f22;
  border-radius: 4px;
  padding: 10px 14px 14px 12px;
  max-width: 432px;
  font-size: 14px;
  line-height: 1.375;
}

.discord-site {
  font-size: 12px;
  color: #b5bac1;
  margin-bottom: 4px;
  word-break: break-word;
}

.discord-title {
  font-size: 16px;
  font-weight: 600;
  color: #00a8fc;
  margin-bottom: 6px;
  word-break: break-word;
}

.discord-desc {
  color: #dbdee1;
}

.discord-image {
  background-color: #1e1f22;
}

/* チェック結果 */
.check-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-left-width: 4px;
  border-radius: 4px;
  background-color: #fff;
}

.check-badge {
  flex: 0 0 auto;
  min-width: 3.2rem;
  text-align: center;
  padding: 1px 6px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
}

.check-error {
  border-left-color: #dc2626;
}

.check-error .check-badge {
  background-color: #dc2626;
}

.check-warn {
  border-left-color: #d97706;
}

.check-warn .check-badge {
  background-color: #d97706;
}

.check-info {
  border-left-color: #6b7280;
}

.check-info .check-badge {
  background-color: #6b7280;
}

.check-ok {
  border-left-color: #16a34a;
}

.check-ok .check-badge {
  background-color: #16a34a;
}

.main-table th {
  width: 11rem;
}

.meta-table thead th:nth-child(1) {
  width: 5.5rem;
}

.meta-table thead th:nth-child(2) {
  width: 32%;
}

@media (max-width: 480px) {
  .main-table th {
    width: 7.5rem;
  }

  .meta-table thead th:nth-child(1) {
    width: 4.5rem;
  }
}
</style>
