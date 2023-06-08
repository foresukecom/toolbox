import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createVuetify } from 'vuetify';
import '@mdi/font/css/materialdesignicons.css';
import './assets/css/main.css';


console.log(
  `App author: ${process.env.VUE_APP_AUTHOR}, Git commit hash: ${process.env.VUE_APP_GIT_COMMIT_HASH}`
);

const vuetify = createVuetify({
  icons: {
    iconfont: 'mdi',
  },
});
createApp(App).use(router).use(vuetify).mount('#app');
