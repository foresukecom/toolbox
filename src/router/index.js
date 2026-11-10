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
import WeightConverter from '../views/WeightConverter.vue'
import AreaConverter from '../views/AreaConverter.vue'
import VolumeConverter from '../views/VolumeConverter.vue'
import TemperatureConverter from '../views/TemperatureConverter.vue'
import DataSizeConverter from '../views/DataSizeConverter.vue'
import DurationConverter from '../views/DurationConverter.vue'
import TextStyler from '../views/TextStyler.vue';
import ImageMetadata from '../views/ImageMetadata.vue'
import SosuCounter from '../views/SosuCounter.vue'
import JwtDecoder from '../views/JwtDecoder.vue'
import EncodeDecode from '../views/EncodeDecode.vue'
import CronExplainer from '../views/CronExplainer.vue'
import ColorConverter from '../views/ColorConverter.vue'
import TextDiff from '../views/TextDiff.vue'
import DataFormatConverter from '../views/DataFormatConverter.vue'
import BaseConverter from '../views/BaseConverter.vue'
import CsvFormatter from '../views/CsvFormatter.vue'
import RssReader from '../views/RssReader.vue'
import PageImageMetadata from '../views/PageImageMetadata.vue'
import GameOfLife from '../views/GameOfLife.vue'

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
    path: "/weight-converter",
    name: "weight-converter",
    component: WeightConverter,
    meta: { title: `${appName}: ${pageTitles.weightConverter}` }
  },
  {
    path: "/area-converter",
    name: "area-converter",
    component: AreaConverter,
    meta: { title: `${appName}: ${pageTitles.areaConverter}` }
  },
  {
    path: "/volume-converter",
    name: "volume-converter",
    component: VolumeConverter,
    meta: { title: `${appName}: ${pageTitles.volumeConverter}` }
  },
  {
    path: "/temperature-converter",
    name: "temperature-converter",
    component: TemperatureConverter,
    meta: { title: `${appName}: ${pageTitles.temperatureConverter}` }
  },
  {
    path: "/data-size-converter",
    name: "data-size-converter",
    component: DataSizeConverter,
    meta: { title: `${appName}: ${pageTitles.dataSizeConverter}` }
  },
  {
    path: "/duration-converter",
    name: "duration-converter",
    component: DurationConverter,
    meta: { title: `${appName}: ${pageTitles.durationConverter}` }
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
  {
    path: "/sosu",
    name: "sosu",
    component: SosuCounter,
    meta: { title: `${appName}: ${pageTitles.sosu}` } 
  },
  {
    path: "/jwt-decoder",
    name: "jwt-decoder",
    component: JwtDecoder,
    meta: { title: `${appName}: ${pageTitles.jwtDecoder}` }
  },
  {
    path: "/encode-decode",
    name: "encode-decode",
    component: EncodeDecode,
    meta: { title: `${appName}: ${pageTitles.encodeDecode}` }
  },
  {
    path: "/cron-explainer",
    name: "cron-explainer",
    component: CronExplainer,
    meta: { title: `${appName}: ${pageTitles.cronExplainer}` }
  },
  {
    path: "/color-converter",
    name: "color-converter",
    component: ColorConverter,
    meta: { title: `${appName}: ${pageTitles.colorConverter}` }
  },
  {
    path: "/text-diff",
    name: "text-diff",
    component: TextDiff,
    meta: { title: `${appName}: ${pageTitles.textDiff}` }
  },
  {
    path: "/data-format-converter",
    name: "data-format-converter",
    component: DataFormatConverter,
    meta: { title: `${appName}: ${pageTitles.dataFormatConverter}` }
  },
  {
    path: "/base-converter",
    name: "base-converter",
    component: BaseConverter,
    meta: { title: `${appName}: ${pageTitles.baseConverter}` }
  },
  {
    path: "/csv-formatter",
    name: "csv-formatter",
    component: CsvFormatter,
    meta: { title: `${appName}: ${pageTitles.csvFormatter}` }
  },
  {
    path: "/rss-reader",
    name: "rss-reader",
    component: RssReader,
    meta: { title: `${appName}: ${pageTitles.rssReader}` }
  },
  {
    path: "/page-image-metadata",
    name: "page-image-metadata",
    component: PageImageMetadata,
    meta: { title: `${appName}: ${pageTitles.pageImageMetadata}` }
  },
  {
    path: "/game-of-life",
    name: "game-of-life",
    component: GameOfLife,
    meta: { title: `${appName}: ${pageTitles.gameOfLife}` }
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

router.afterEach((to) => {
  // to.meta.title からタイトルを取得し、存在しない場合はデフォルトタイトルを使用
  document.title = to.meta.title || 'デフォルトタイトル';
});

export default router;
