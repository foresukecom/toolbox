<template>
  <div class="w-full bg-gray-50 mx-auto px-4">
    <nav class="flex items-center justify-between py-2">
      <div>
        <div class="flex items-center"> 
          <img src="@/assets/logo.png" alt="ロゴ" class="h-8">
          <h1 class="text-2xl">開発の友</h1>
        </div>
        <ol class="flex mb-0 space-x-4 mt-2">
          <li v-for="(item, index) in breadcrumbItems" :key="index"
              class="text-sm"
              :class="{ 'font-semibold': index === breadcrumbItems.length - 1 }">
            <router-link v-if="index !== breadcrumbItems.length - 1" :to="item.href" class="text-blue-600">{{ item.text }}</router-link>
            <span v-else>{{ item.text }}</span>
          </li>
        </ol>
      </div>
      <router-link to="/about" class="text-blue-600">About</router-link>
    </nav>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import pageTitles from '@/router/pageTitles'; // pageTitles.js のインポート

export default {
  name: 'AppHeader',
  setup() {
    const route = useRoute();

    const breadcrumbItems = computed(() => {
      const items = [
        { text: '🏠 ホーム', href: '/' },
      ];

      // pageTitles を使用してページのタイトルを定義
      const pages = [
        { path: '/about', text: pageTitles.about },
        { path: '/client-info', text: pageTitles.clientInfo },
        { path: '/text-hash', text: pageTitles.textHash },
        { path: '/video-to-gif', text: pageTitles.videoToGif },
        { path: '/json-formatter', text: pageTitles.jsonFormatter },
        { path: '/xml-formatter', text: pageTitles.xmlFormatter },
        { path: '/text-case-converter', text: pageTitles.textCaseConverter },
        { path: '/countdown-to-holidays', text: pageTitles.countdownToHolidays },
        { path: '/world-timezone', text: pageTitles.worldTimezone },
        { path: '/timezone-converter', text: pageTitles.timezoneConverter },
        { path: '/japanese-era', text: pageTitles.japaneseEra },
        { path: '/time-issues', text: pageTitles.timeIssues },
        { path: '/time-progress', text: pageTitles.timeProgress },
        { path: '/escape-sequence-interpreter', text: pageTitles.escapeSequenceInterpreter },
        { path: '/regex-tester', text: pageTitles.regexTester },
        { path: '/template-base-random-generator', text: pageTitles.templateBaseRandomGenerator },
        { path: '/uuid-generator', text: pageTitles.uuidGenerator },
        { path: '/text-counter', text: pageTitles.textCounter },
        { path: '/unix-time-converter', text: pageTitles.unixTimeConverter },
        { path: '/birthdate-info', text: pageTitles.birthdateInfo },
        { path: '/ruby-generator', text: pageTitles.rubyGenerator },
        { path: '/length-converter', text: pageTitles.lengthConverter },
        { path: '/text-styler', text: pageTitles.textStyler },
        { path: '/image-metadata', text: pageTitles.imageMetadata },
      ];

      const currentPage = pages.find(page => page.path === route.path);

      if (currentPage) {
        items.push({ text: currentPage.text, href: currentPage.path });
      }

      return items;
    });

    return {
      breadcrumbItems,
    };
  },
};
</script>