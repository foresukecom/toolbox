<template>
  <div class="container mx-auto px-6">
    <div v-for="(category, index) in categories" :key="'category-' + index" class="my-8">
      <hr class="border-b border-gray-200" />
      <h2 class="text-2xl font-semibold mt-4">{{ category.name }}</h2>
      <div class="flex flex-wrap -mx-4">
        <div v-for="(tile, index) in category.tiles" :key="'tile-' + index" class="flex-auto p-4">
          <div @click="goTo(tile.route)"
            class="fusen text-center py-2 text-lg cursor-pointer transform transition hover:scale-105"
            :style="{ 'border-left-color': titleToColor(tile.title) }">
            {{ tile.title }}
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
              title: '閲覧環境',
              route: 'client-info',
            },
          ],
        },
        {
          name: '文字列操作ツール',
          tiles: [
            {
              title: 'Text Hash',
              route: 'text-hash',
            },
            {
              title: 'json整形',
              route: 'json-formatter',
            },
            {
              title: 'xml整形',
              route: 'xml-formatter',
            },
            {
              title: '制御文字展開',
              route: 'escape-sequence-interpreter',
            },
            {
              title: 'テキストケース変換',
              route: 'text-case-converter',
            },
            {
              title: '正規表現テスター',
              route: 'regex-tester',
            },
            {
              title: 'ランダム文字列生成',
              route: 'template-base-random-generator',
            },
            {
              title: 'UUID生成',
              route: 'uuid-generator',
            },
            {
              title: 'テキストカウンター',
              route: 'text-counter',
            },
            {
              title: 'ルビ生成',
              route: 'ruby-generator',
            },
            {
              title: '文字装飾',
              route: 'text-styler',
            },
          ],
        },
        {
          name: '画像操作ツール',
          tiles: [
            // {
            //   title: 'Gif 変換',
            //   route: 'video-to-gif',
            // },
            {
              title: 'EXIF削除',
              route: 'image-metadata'
            }
          ],
        },
        {
          name: '日付ツール',
          tiles: [
            {
              title: '祝日タイマー',
              route: 'countdown-to-holidays',
            },
            {
              title: '世界時計',
              route: 'world-timezone',
            },
            {
              title: 'タイムゾーン変換',
              route: 'timezone-converter',
            },
            {
              title: '和暦',
              route: 'japanese-era',
            },
            {
              title: 'コンピュータ時刻問題',
              route: 'time-issues',
            },
            {
              title: '時間進捗バー',
              route: 'time-progress',
            },
            {
              title: 'UNIXTIME変換',
              route: 'unix-time-converter',
            },
            {
              title: '生年月日情報',
              route: 'birthdate-info',
            },
          ],
        },

        {
          name: '単位ツール',
          tiles: [
            {
              title: '距離単位変換',
              route: 'length-converter',
            },
          ],
        },
        {
          name: '数値ツール',
          tiles: [
            {
              title: '素数カウンター',
              route: 'sosu',
            },
          ],
        },
        {
          name: 'Blueskyツール',
          tiles: [
            {
              title: 'Hugo埋め込みコード生成',
              route: 'bluesky-shortcodes',
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
    // 文字列からハッシュを生成
    stringToHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    },
    // ハッシュから色を生成
    hashToColor(hash) {
      let color = '#';
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
      }
      return color;
    },
    // タイトルから色を生成
    titleToColor(title) {
      const hash = this.stringToHash(title);
      return this.hashToColor(hash);
    },
  },
};
</script>


<style>
.fusen {
  display: inline-block;
  position: relative;
  padding: .5em 1em;
  border-left: 27px solid #2589d0;
  background-color: #f5f5f5;
  color: #333333;
  min-width: 150px;
  max-width: 300px;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 50px;
  height: auto;
}
</style>
