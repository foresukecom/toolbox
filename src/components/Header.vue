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
        { path: '/ip-address', text: 'IPアドレス' },
        { path: '/text-hash', text: 'テキストハッシュ' },
        { path: '/video-to-gif', text: 'ビデオからGIFへ' },
        { path: '/json-formatter', text: 'JSON整形' },
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
