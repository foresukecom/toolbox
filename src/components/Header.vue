<template>
  <v-app-bar app>
    <v-spacer></v-spacer>
    <v-breadcrumbs :items="breadcrumbItems"></v-breadcrumbs>
  </v-app-bar>
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
        { path: '/timezone-converter', text: 'タイムゾーン変換'}
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
