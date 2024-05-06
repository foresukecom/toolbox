<template>
  <div id="app" class="flex flex-col min-h-screen font-mono flex-col min-h-screen">
    <app-header class="fixed top-0 w-full z-50"></app-header>
    <div class="flex-grow mt-20 pb-16">
      <router-view></router-view>
    </div>
    <app-footer class="fixed bottom-0 w-full"></app-footer>
  </div>
</template>

<script>
import AppHeader from './components/Header.vue';
import AppFooter from './components/Footer.vue';

export default {
  components: {
    AppHeader,
    AppFooter,
  },
};
</script>
