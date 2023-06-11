import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/css/main.css';

console.log(
  `App author: ${process.env.VUE_APP_AUTHOR}, Git commit hash: ${process.env.VUE_APP_GIT_COMMIT_HASH}`
);

createApp(App).use(router).mount('#app');
