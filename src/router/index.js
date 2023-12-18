import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import AboutPage from '../views/About.vue';
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
import RegexTester from '../views/RegexTester.vue';
import TemplateBasedRandomGenerator from '../views/TemplateBasedRandomGenerator.vue'
import UUIDGenerator from '../views/UUIDGenerator.vue';
import TextCounter from '../views/TextCounter.vue';
import UnixTimeConverter from '../views/UnixTimeConverter.vue';
import BirthdateInfo from '../views/BirthdateInfo.vue';
import RubyGenerator from '../views/HtmlRubyGenerator.vue';
import LengthConverter from '../views/LengthConverter.vue'

const routes = [
  {
    path: '/about',
    name: 'AboutPage',
    component: AboutPage,
  },
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
  },
  {
    path: "/regex-tester",
    name: "regex-tester",
    component: RegexTester,
  },
  {
    path: "/template-base-random-generator",
    name: "template-base-random-generator",
    component: TemplateBasedRandomGenerator,
  },
  {
    path: "/uuid-generator",
    name: "uuid-generator",
    component: UUIDGenerator,
  },
  {
    path: "/text-counter",
    name: "text-counter",
    component: TextCounter,
  },
  {
    path: "/unix-time-converter",
    name: "unix-time-converter",
    component: UnixTimeConverter,
  },
  {
    path: "/birthdate-info",
    name: "birthdate-info",
    component: BirthdateInfo,
  },
  {
    path: "/ruby-generator",
    name: "ruby-generator",
    component: RubyGenerator,
  },
  {
    path: "/length-converter",
    name: "length-converter",
    component: LengthConverter,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
