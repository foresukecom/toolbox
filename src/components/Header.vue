<template>
  <div class="w-full bg-gray-50 mx-auto px-4">
    <nav class="flex items-center justify-between py-2">
      <ol class="flex mb-0 space-x-4">
        <li v-for="(item, index) in breadcrumbItems" :key="index"
            class="text-sm"
            :class="{ 'font-semibold': index === breadcrumbItems.length - 1 }">
          <router-link v-if="index !== breadcrumbItems.length - 1" :to="item.href" class="text-blue-600">{{ item.text }}</router-link>
          <span v-else>{{ item.text }}</span>
        </li>
      </ol>
      <router-link to="/about" class="text-blue-600">About</router-link>
    </nav>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export default {
  name: 'AppHeader',
  setup() {
    const route = useRoute();

    const breadcrumbItems = computed(() => {
      const items = [
        { text: '🏠 ホーム', href: '/' },
      ];

      const pages = [
        { path: '/about', text: 'About' },
        { path: '/client-info', text: 'クライアント情報' },
        { path: '/text-hash', text: 'テキストハッシュ' },
        { path: '/video-to-gif', text: 'ビデオからGIFへ' },
        { path: '/json-formatter', text: 'JSON整形' },
        { path: '/xml-formatter', text: 'XML整形' },
        { path: '/text-case-converter', text: 'テキストケース変換' },
        { path: '/countdown-to-holidays', text: '祝日タイマー' },
        { path: '/world-timezone', text: '世界時計' },
        { path: '/timezone-converter', text: 'タイムゾーン変換' },
        { path: '/japanese-era', text: '和暦' },
        { path: '/time-issues', text: 'コンピュータ時刻問題' },
        { path: '/time-progress', text: '時間進捗バー' },
        { path: '/escape-sequence-interpreter', text: '制御文字展開' },
        { path: '/regex-tester', text: '正規表現テスター' },
        { path: '/template-base-random-generator', text: 'ランダム文字列生成' },
        { path: '/uuid-generator', text: 'UUID生成' },
        { path: '/text-counter', text: '文字数カウンター' },
        { path: '/unix-time-converter', text: 'UNIXTIME変換' },
        { path: '/birthdate-info', text: '誕生日情報' }
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
