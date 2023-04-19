import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import IpAddress from '../views/IpAddress.vue'; 
import TextHash from '../views/TextHash.vue';

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
  {
    path: '/text-hash',
    name: 'text-hash',
    component: TextHash,
  },
  // 他のルートをここに追加
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
