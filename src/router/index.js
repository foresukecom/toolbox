import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import ClientInfo from '../views/ClientInfo.vue'; 
import TextHash from '../views/TextHash.vue';
import VideoToGif from '../views/VideoToGif.vue';
import JsonFormatter from '../views/JsonFormatter.vue';
import TextCaseConverter from '../views/TextCaseConverter.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/client-info',
    name: 'client-info',
    component: ClientInfo, // ここで新しいコンポーネントを指定
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
    {
    path: "/text-case-converter",
    name: "text-case-converter",
    component: TextCaseConverter,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
