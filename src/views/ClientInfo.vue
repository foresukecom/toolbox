<template>
  <article class="client-info cat-client">
    <section class="info-section">
      <h2 class="blog-h">ネットワーク情報</h2>
      <dl class="info-list">
        <div class="info-row">
          <dt>IPアドレス</dt>
          <dd>
            <span class="value">{{ ipAddress || '—' }}</span>
            <CopyButton v-if="ipAddress" :textToCopy="ipAddress" />
          </dd>
        </div>
        <div class="info-row">
          <dt>ISP</dt>
          <dd>
            <span class="value">{{ isp || '—' }}</span>
            <CopyButton v-if="isp" :textToCopy="isp" />
          </dd>
        </div>
      </dl>
    </section>

    <section class="info-section">
      <h2 class="blog-h">ブラウザ情報</h2>
      <dl class="info-list">
        <div class="info-row">
          <dt>OS</dt>
          <dd><span class="value">{{ os }}</span></dd>
        </div>
        <div class="info-row">
          <dt>ブラウザ</dt>
          <dd><span class="value">{{ browser }}</span></dd>
        </div>
        <div class="info-row">
          <dt>ユーザーエージェント</dt>
          <dd>
            <code class="value mono">{{ userAgent }}</code>
            <CopyButton :textToCopy="userAgent" />
          </dd>
        </div>
        <div class="info-row">
          <dt>言語設定</dt>
          <dd><span class="value">{{ language }}</span></dd>
        </div>
      </dl>
    </section>

    <section class="info-section">
      <h2 class="blog-h">画面情報</h2>
      <dl class="info-list">
        <div class="info-row">
          <dt>画面サイズ</dt>
          <dd><span class="value">{{ displaySize }}</span></dd>
        </div>
        <div class="info-row">
          <dt>ウインドウサイズ (内側)</dt>
          <dd><span class="value">{{ innerWindowSize }}</span></dd>
        </div>
        <div class="info-row">
          <dt>ウインドウサイズ (外側)</dt>
          <dd><span class="value">{{ outerWindowSize }}</span></dd>
        </div>
      </dl>
    </section>

    <section class="info-section">
      <h2 class="blog-h">地域情報</h2>
      <dl class="info-list">
        <div class="info-row">
          <dt>国</dt>
          <dd><span class="value">{{ country || '—' }}</span></dd>
        </div>
        <div class="info-row">
          <dt>都道府県</dt>
          <dd><span class="value">{{ region || '—' }}</span></dd>
        </div>
        <div class="info-row">
          <dt>市町村</dt>
          <dd><span class="value">{{ city || '—' }}</span></dd>
        </div>
        <div class="info-row">
          <dt>タイムゾーン</dt>
          <dd><span class="value">{{ timezone || '—' }}</span></dd>
        </div>
      </dl>
    </section>
  </article>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue';

export default {
  components: {
    CopyButton,
  },
  data() {
    return {
      ipAddress: '',
      userAgent: navigator.userAgent,
      browser: '',
      os: '',
      language: '',
      displaySize: '',
      outerWindowSize: '',
      innerWindowSize: '',
      isp: '',
      region: '',
      city: '',
      country: '',
      timezone: '',
    };
  },
  methods: {
    parseUserAgent() {
      const userAgent = navigator.userAgent;
      let browser = 'Unknown Browser';
      let os = 'Unknown OS';

      if (userAgent.includes('Chrome')) {
        browser = 'Google Chrome';
      } else if (userAgent.includes('Firefox')) {
        browser = 'Mozilla Firefox';
      } else if (userAgent.includes('Safari')) {
        browser = 'Apple Safari';
      } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
        browser = 'Internet Explorer';
      } else if (userAgent.includes('Edge')) {
        browser = 'Microsoft Edge';
      } else if (userAgent.includes('Opera')) {
        browser = 'Opera';
      }

      if (userAgent.includes('Win')) {
        os = 'Windows';
      } else if (userAgent.includes('Mac')) {
        os = 'macOS';
      } else if (userAgent.includes('Linux')) {
        os = 'Linux';
      } else if (userAgent.includes('Android')) {
        os = 'Android';
      } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        os = 'iOS';
      }
      return { browser, os };
    },
    async fetchIPDetails(ipAddress) {
      const baseURL = process.env.VUE_APP_NETLIFY_FUNCTION_DOMAIN;
      const apiEndpoint = '/.netlify/functions/ip-info';

      try {
        const response = await fetch(`${baseURL}${apiEndpoint}?ip=${ipAddress}`);
        const ipInfo = await response.json();
        return ipInfo;
      } catch (error) {
        console.error('Error fetching IP details:', error);
        return null;
      }
    },
  },
  async mounted() {
    this.userAgent = navigator.userAgent;
    this.language = navigator.language;
    this.displaySize = `${window.screen.width} x ${window.screen.height}`;
    this.outerWindowSize = `${window.outerWidth} x ${window.outerHeight}`;
    this.innerWindowSize = `${window.innerWidth} x ${window.innerHeight}`;
    const { browser, os } = this.parseUserAgent();
    this.browser = browser;
    this.os = os;
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.ipAddress = data.ip;
    } catch (error) {
      console.error('Error fetching IP address:', error);
    }
    const ipDetails = await this.fetchIPDetails(this.ipAddress);
    if (ipDetails) {
      this.country = ipDetails.country;
      this.region = ipDetails.region;
      this.city = ipDetails.city;
      this.timezone = ipDetails.timezone;
      this.isp = ipDetails.org;
    }
  },
};
</script>

<style scoped>
.client-info {
  max-width: 800px;
  margin: 0 auto;
}

.info-section {
  margin-bottom: 1.5em;
}

.info-list {
  margin: 0.25em 0 0;
  padding: 0;
}

.info-row {
  display: grid;
  grid-template-columns: 14em 1fr;
  gap: 0.5em 1em;
  align-items: baseline;
  padding: 0.4em 0;
  border-bottom: 1px dotted var(--tb-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row dt {
  font-family: 'Fira Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-weight: 600;
  color: var(--tb-text);
}

.info-row dt::before {
  content: '* ';
  color: var(--tb-main);
  font-weight: bold;
  margin-right: 0.2em;
}

.info-row dd {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5em;
  min-width: 0;
}

.info-row .value {
  word-break: break-all;
}

.info-row .mono {
  font-family: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background-color: var(--tb-bg-soft);
  padding: 0.15em 0.4em;
  font-size: 0.9em;
}

/* CopyButton をカテゴリのグレー基調に合わせて控えめに */
.info-row :deep(button) {
  background-color: transparent !important;
  color: var(--tb-muted) !important;
  padding: 0.15em 0.3em !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: 3px;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.info-row :deep(button:hover) {
  color: var(--tb-main) !important;
  border-color: var(--tb-main) !important;
  background-color: transparent !important;
}

.info-row :deep(button svg) {
  width: 14px;
  height: 14px;
}

@media (max-width: 600px) {
  .info-row {
    grid-template-columns: 1fr;
    gap: 0.15em;
  }
}
</style>
