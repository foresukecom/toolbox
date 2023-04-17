import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import IpAddress from '../views/IpAddress.vue'; // ここに新しいコンポーネントをインポート

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/ip-address',
    name: 'ip-address',
    component: IpAddress, // ここで新しいコンポーネントを指定
  },
  // 他のルートをここに追加
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
