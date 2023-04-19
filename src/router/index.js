import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import IpAddress from '../views/IpAddress.vue'; 
import TextHash from '../views/TextHash.vue';
import VideoToGif from '../views/VideoToGif.vue';
import JsonFormatter from '../views/JsonFormatter.vue';

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
  {
    path: '/video-to-gif',
    name: 'video-to-gif',
    component: VideoToGif
  },
  {
    path: "/json-formatter",
    name: "json-formatter",
    component: JsonFormatter,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
