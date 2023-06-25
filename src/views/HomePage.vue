<template>
  <div class="container mx-auto px-6">
    <div v-for="(category, index) in categories" :key="'category-' + index" class="my-8">
      <hr class="border-b border-gray-200" />
      <h2 class="text-2xl font-semibold mt-4">{{ category.name }}</h2>
      <div class="flex flex-wrap -mx-4">
        <div v-for="(tile, index) in category.tiles" :key="'tile-' + index" class="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 p-4">
          <div @click="goTo(tile.route)"
            class="bg-white shadow rounded overflow-hidden cursor-pointer transform transition hover:scale-105">
            <img :src="tile.image" class="w-full" />
            <div class="text-center py-2 text-lg">{{ tile.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      categories: [
        {
          name: 'クライアント情報',
          tiles: [
            {
              title: 'Client Info',
              image: '/images/pc_images_001.png',
              route: 'client-info',
            },
          ],
        },
        {
          name: '文字列操作ツール',
          tiles: [
            {
              title: 'Text Hash',
              image: '/images/pc_images_002.png',
              route: 'text-hash',
            },
            {
              title: 'json整形',
              image: '/images/pc_images_003.png',
              route: 'json-formatter',
            },
            {
              title: 'xml整形',
              image: '/images/pc_images_004.png',
              route: 'xml-formatter',
            },
            {
              title: '制御文字展開',
              image: '/images/pc_images_005.png',
              route: 'escape-sequence-interpreter',
            },
            {
              title: 'テキストケース変換',
              image: '/images/pc_images_006.png',
              route: 'text-case-converter',
            },
            {
              title: '正規表現テスター',
              image: '/images/pc_images_007.png',
              route: 'regex-tester',
            },
            {
              title: 'ランダム文字列生成',
              image: '/images/pc_images_008.png',
              route: 'template-base-random-generator',
            },
            {
              title: 'UUID生成',
              image: '/images/pc_images_009.png',
              route: 'uuid-generator',
            },
            {
              title: 'テキストカウンター',
              image: '/images/pc_images_010.png',
              route: 'text-counter',
            },
          ],
        },
        {
          name: '画像操作ツール',
          tiles: [

            {
              title: 'Gif 変換',
              image: '/images/pc_images_011.png',
              route: 'video-to-gif',
            },
          ],
        },
        {
          name: '日付ツール',
          tiles: [
            {
              title: '祝日タイマー',
              image: '/images/pc_images_012.png',
              route: 'countdown-to-holidays',
            },
            {
              title: '世界時計',
              image: '/images/pc_images_013.png',
              route: 'world-timezone',
            },
            {
              title: 'タイムゾーン変換',
              image: '/images/pc_images_014.png',
              route: 'timezone-converter',
            },
            {
              title: '和暦',
              image: '/images/pc_images_015.png',
              route: 'japanese-era',
            },
            {
              title: 'コンピュータ時刻問題',
              image: '/images/pc_images_016.png',
              route: 'time-issues',
            },
            {
              title: '時間進捗バー',
              image: '/images/pc_images_017.png',
              route: 'time-progress',
            },
            {
              title: 'UNIXTIME変換',
              image: '/images/pc_images_018.png',
              route: 'unix-time-converter',
            },
            {
              title: '生年月日情報',
              image: '/images/pc_images_019.png',
              route: 'birthdate-info',
            },
          ],
        },
      ]
    };
  },
  methods: {
    goTo(route) {
      this.$router.push({ name: route });
    },
  },
};
</script>
