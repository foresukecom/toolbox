import { createRouter, createWebHistory } from 'vue-router';
import pageTitles from './pageTitles';
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
import TextStyler from '../views/TextStyler.vue';
import ImageMetadata from '../views/ImageMetadata.vue'

const appName = "開発の友"
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: `${appName}: ${pageTitles.home}` } 
  },
  {
    path: '/about',
    name: 'AboutPage',
    component: AboutPage,
    meta: { title: `${appName}: ${pageTitles.about}` }
  },
  {
    path: '/client-info',
    name: 'client-info',
    component: ClientInfo,
    meta: { title: `${appName}: ${pageTitles.clientInfo}` } 
  },
  {
    path: '/text-hash',
    name: 'text-hash',
    component: TextHash,
    meta: { title: `${appName}: ${pageTitles.textHash}` } 
  },
  {
    path: '/video-to-gif',
    name: 'video-to-gif',
    component: VideoToGif,
    meta: { title: `${appName}: ${pageTitles.videoToGif}` } 
  },
  {
    path: "/json-formatter",
    name: "json-formatter",
    component: JsonFormatter,
    meta: { title: `${appName}: ${pageTitles.jsonFormatter}` } 
  },
  {
    path: "/xml-formatter",
    name: "xml-formatter",
    component: XmlFormatter,
    meta: { title: `${appName}: ${pageTitles.xmlFormatter}` } 
  },
  {
    path: "/text-case-converter",
    name: "text-case-converter",
    component: TextCaseConverter,
    meta: { title: `${appName}: ${pageTitles.textCaseConverter}` } 
  },
  {
    path: "/countdown-to-holidays",
    name: "countdown-to-holidays",
    component: CountdownToHolidays,
    meta: { title: `${appName}: ${pageTitles.countdownToHolidays}` } 
  },
  {
    path: "/world-timezone",
    name: "world-timezone",
    component: WorldTimezone,
    meta: { title: `${appName}: ${pageTitles.worldTimezone}` } 
  },
  {
    path: "/timezone-converter",
    name: "timezone-converter",
    component: TimezoneConverter,
    meta: { title: `${appName}: ${pageTitles.timezoneConverter}` } 
  },
  {
    path: "/japanese-era",
    name: "japanese-era",
    component: JapaneseEra,
    meta: { title: `${appName}: ${pageTitles.japaneseEra}` } 
  },
  {
    path: "/time-issues",
    name: "time-issues",
    component: TimeIssues,
    meta: { title: `${appName}: ${pageTitles.timeIssues}` } 
  },
  {
    path: "/time-progress",
    name: "time-progress",
    component: TimeProgress,
    meta: { title: `${appName}: ${pageTitles.timeProgress}` } 
  },
  {
    path: "/escape-sequence-interpreter",
    name: "escape-sequence-interpreter",
    component: EscapeSequenceInterpreter,
    meta: { title: `${appName}: ${pageTitles.escapeSequenceInterpreter}` } 
  },
  {
    path: "/regex-tester",
    name: "regex-tester",
    component: RegexTester,
    meta: { title: `${appName}: ${pageTitles.regexTester}` } 
  },
  {
    path: "/template-base-random-generator",
    name: "template-base-random-generator",
    component: TemplateBasedRandomGenerator,
    meta: { title: `${appName}: ${pageTitles.templateBaseRandomGenerator}` } 
  },
  {
    path: "/uuid-generator",
    name: "uuid-generator",
    component: UUIDGenerator,
    meta: { title: `${appName}: ${pageTitles.uuidGenerator}` } 
  },
  {
    path: "/text-counter",
    name: "text-counter",
    component: TextCounter,
    meta: { title: `${appName}: ${pageTitles.textCounter}` } 
  },
  {
    path: "/unix-time-converter",
    name: "unix-time-converter",
    component: UnixTimeConverter,
    meta: { title: `${appName}: ${pageTitles.unixTimeConverter}` } 
  },
  {
    path: "/birthdate-info",
    name: "birthdate-info",
    component: BirthdateInfo,
    meta: { title: `${appName}: ${pageTitles.birthdateInfo}` } 
  },
  {
    path: "/ruby-generator",
    name: "ruby-generator",
    component: RubyGenerator,
    meta: { title: `${appName}: ${pageTitles.rubyGenerator}` } 
  },
  {
    path: "/length-converter",
    name: "length-converter",
    component: LengthConverter,
    meta: { title: `${appName}: ${pageTitles.lengthConverter}` } 
  },
  {
    path: "/text-styler",
    name: "text-styler",
    component: TextStyler,
    meta: { title: `${appName}: ${pageTitles.textStyler}` } 
  },
  {
    path: "/image-metadata",
    name: "image-metadata",
    component: ImageMetadata,
    meta: { title: `${appName}: ${pageTitles.imageMetadata}` } 
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.afterEach((to) => {
  // to.meta.title からタイトルを取得し、存在しない場合はデフォルトタイトルを使用
  document.title = to.meta.title || 'デフォルトタイトル';
});

export default router;
