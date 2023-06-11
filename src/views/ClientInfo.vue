<template>
  <div>
    <h2 class="text-2xl font-bold mt-4 mb-2">ネットワーク情報</h2>
    <div class="flex flex-wrap -mx-2">
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'IPアドレス'" :text="ipAddress" />
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'ISP'" :text="isp" />
    </div>

    <h2 class="text-2xl font-bold mt-4 mb-2">ブラウザ情報</h2>
    <div class="flex flex-wrap -mx-2">
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'OS'" :text="os" />
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'ブラウザ'" :text="browser" />
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'ユーザーエージェント'" :text="userAgent" />
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'言語設定'" :text="language" />
    </div>

    <h2 class="text-2xl font-bold mt-4 mb-2">画面情報</h2>
    <div class="flex flex-wrap -mx-2">
      <InfoCard class="w-full sm:w-1/2 md:w-1/3 px-2 mb-4" :title="'画面サイズ'" :text="displaySize" />
      <InfoCard class="w-full sm:w-1/2 md:w-1/3 px-2 mb-4" :title="'ウインドウサイズ(内側)'" :text="innerWindowSize" />
      <InfoCard class="w-full sm:w-1/2 md:w-1/3 px-2 mb-4" :title="'ウインドウサイズ(外側)'" :text="outerWindowSize" />
    </div>

    <h2 class="text-2xl font-bold mt-4 mb-2">地域情報</h2>
    <div class="flex flex-wrap -mx-2">
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'国'" :text="country" />
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'都道府県'" :text="region" />
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'市町村'" :text="city" />
      <InfoCard class="w-full sm:w-1/2 md:w-1/4 px-2 mb-4" :title="'タイムゾーン'" :text="timezone" />
    </div>
  </div>
</template>

<script>
import InfoCard from '@/components/InfoCard.vue';
export default {
  components: {
    InfoCard,
  },
  data() {
    return {
      ipAddress: '',
      userAgent: navigator.userAgent,
      language: '',
      displaySize: '',
      outerWindowSize: '',
      innerWindowSize: '',
      screenWidth: 0,
      screenHeight: 0,
      viewportWidth: 0,
      viewportHeight: 0,
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

      // ブラウザの判定
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

      // OSの判定
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
      const apiEndpoint = "/.netlify/functions/ip-info";

      try {
        const response = await fetch(`${baseURL}${apiEndpoint}?ip=${ipAddress}`);
        const ipInfo = await response.json();
        return ipInfo;
      } catch (error) {
        console.error("Error fetching IP details:", error);
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
