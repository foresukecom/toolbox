<template>
  <v-app>
    <app-header></app-header>
    <v-main>
      <router-view></router-view>
    </v-main>
    <app-footer></app-footer>
  </v-app>
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
