<template>
  <div id="app" class="blog-shell">
    <div class="blog-content">
      <app-header></app-header>
      <main>
        <router-view></router-view>
      </main>
      <app-footer></app-footer>
    </div>
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
