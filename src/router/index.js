import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import ClientInfo from '../views/ClientInfo.vue'; 
import TextHash from '../views/TextHash.vue';
import VideoToGif from '../views/VideoToGif.vue';
import JsonFormatter from '../views/JsonFormatter.vue';
import XmlFormatter from '../views/XmlFormatter.vue';
import TextCaseConverter from '../views/TextCaseConverter.vue';
import CountdownToHolidays from '../views/CountdownToHolidays.vue';
import WorldTimezone from '../views/WorldTimezone.vue';
import TimezoneConverter from '../views/TimezoneConverter.vue';
import JapaneseEra from '../views/JapaneseEra.vue';
import TimeIssues from '../views/TimeIssues.vue';
import TimeProgress from '../views/AllTimeProgress.vue';
import EscapeSequenceInterpreter from '../views/EscapeSequenceInterpreter.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/client-info',
    name: 'client-info',
    component: ClientInfo,
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
    path: "/xml-formatter",
    name: "xml-formatter",
    component: XmlFormatter,
  },
  {
    path: "/text-case-converter",
    name: "text-case-converter",
    component: TextCaseConverter,
  },
  {
    path: "/countdown-to-holidays",
    name: "countdown-to-holidays",
    component: CountdownToHolidays,
  },
  {
    path: "/world-timezone",
    name: "world-timezone",
    component: WorldTimezone,
  },
  {
    path: "/timezone-converter",
    name: "timezone-converter",
    component: TimezoneConverter,
  },
  {
    path: "/japanese-era",
    name: "japanese-era",
    component: JapaneseEra,
  },
  {
    path: "/time-issues",
    name: "time-issues",
    component: TimeIssues,
  },
  {
    path: "/time-progress",
    name: "time-progress",
    component: TimeProgress,
  },
  {
    path: "/escape-sequence-interpreter",
    name: "escape-sequence-interpreter",
    component: EscapeSequenceInterpreter,
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
