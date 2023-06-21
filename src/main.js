import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/css/main.css';
import VueGtag from 'vue-gtag'; // 追加

console.log(
  `App author: ${process.env.VUE_APP_AUTHOR}, Git commit hash: ${process.env.VUE_APP_GIT_COMMIT_HASH}`
);

console.log(`Google Analytics ID: ${process.env.VUE_APP_GA_TRACKING_ID}`);

const app = createApp(App);

app.use(router);

// Google Analytics の設定を追加
app.use(VueGtag, {
  config: { id: process.env.VUE_APP_GA_TRACKING_ID },
  debug: true
});

app.mount('#app');
