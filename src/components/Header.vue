<template>
  <header class="blog-header">
    <div class="blog-brand">
      <router-link to="/" class="blog-link">開発の友</router-link>
    </div>
    <nav>
      <router-link to="/" class="blog-link">Home</router-link>
      <router-link to="/about" class="blog-link">About</router-link>
    </nav>
  </header>
  <div v-if="breadcrumbItems.length > 1" class="blog-breadcrumb">
    <template v-for="(item, index) in breadcrumbItems" :key="index">
      <router-link
        v-if="index !== breadcrumbItems.length - 1"
        :to="item.href"
        class="blog-link"
      >{{ item.text }}</router-link>
      <span v-else>{{ item.text }}</span>
      <span v-if="index !== breadcrumbItems.length - 1" class="sep">/</span>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import pageTitles from '@/router/pageTitles';

export default {
  name: 'AppHeader',
  setup() {
    const route = useRoute();

    const pathToTitle = {
      '/about': pageTitles.about,
      '/client-info': pageTitles.clientInfo,
      '/text-hash': pageTitles.textHash,
      '/video-to-gif': pageTitles.videoToGif,
      '/json-formatter': pageTitles.jsonFormatter,
      '/xml-formatter': pageTitles.xmlFormatter,
      '/text-case-converter': pageTitles.textCaseConverter,
      '/countdown-to-holidays': pageTitles.countdownToHolidays,
      '/world-timezone': pageTitles.worldTimezone,
      '/timezone-converter': pageTitles.timezoneConverter,
      '/japanese-era': pageTitles.japaneseEra,
      '/time-issues': pageTitles.timeIssues,
      '/time-progress': pageTitles.timeProgress,
      '/escape-sequence-interpreter': pageTitles.escapeSequenceInterpreter,
      '/regex-tester': pageTitles.regexTester,
      '/template-base-random-generator': pageTitles.templateBaseRandomGenerator,
      '/uuid-generator': pageTitles.uuidGenerator,
      '/text-counter': pageTitles.textCounter,
      '/unix-time-converter': pageTitles.unixTimeConverter,
      '/birthdate-info': pageTitles.birthdateInfo,
      '/ruby-generator': pageTitles.rubyGenerator,
      '/length-converter': pageTitles.lengthConverter,
      '/weight-converter': pageTitles.weightConverter,
      '/area-converter': pageTitles.areaConverter,
      '/volume-converter': pageTitles.volumeConverter,
      '/temperature-converter': pageTitles.temperatureConverter,
      '/data-size-converter': pageTitles.dataSizeConverter,
      '/duration-converter': pageTitles.durationConverter,
      '/text-styler': pageTitles.textStyler,
      '/image-metadata': pageTitles.imageMetadata,
      '/sosu': pageTitles.sosu,
      '/bluesky-shortcodes': pageTitles.blueskyShortcodes,
    };

    const breadcrumbItems = computed(() => {
      const items = [{ text: 'ホーム', href: '/' }];
      const title = pathToTitle[route.path];
      if (title) {
        items.push({ text: title, href: route.path });
      }
      return items;
    });

    return { breadcrumbItems };
  },
};
</script>
