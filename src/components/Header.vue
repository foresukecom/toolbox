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

      if (route.path !== '/') {
        items.push({ text: '現在のページ' });
      }

      return items;
    });

    return {
      breadcrumbItems,
    };
  },
};
</script>
