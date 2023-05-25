<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <ol class="breadcrumb mb-0">
        <li v-for="(item, index) in breadcrumbItems" :key="index" class="breadcrumb-item"
          :class="{ active: index === breadcrumbItems.length - 1 }">
          <router-link v-if="index !== breadcrumbItems.length - 1" :to="item.href">{{ item.text }}</router-link>
          <span v-else>{{ item.text }}</span>
        </li>
      </ol>
    </div>
  </nav>
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
        { text: 'ホーム', href: '/' },
      ];

      const pages = [
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
        { path: '/uuid-generator', text: 'UUID生成' }
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
