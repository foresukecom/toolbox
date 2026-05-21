<template>
  <div class="home-page">
    <p class="home-lead">
      開発・日常・ちょっとした計算に使えるツール集です。
    </p>

    <section
      v-for="(category, index) in categories"
      :key="'cat-' + index"
      class="blog-category"
      :class="category.cssClass"
    >
      <hr />
      <h2 class="blog-h">{{ category.name }}</h2>
      <ul class="blog-tools">
        <li v-for="tile in category.tiles" :key="tile.route">
          <router-link :to="{ name: tile.route }" class="blog-link">
            {{ tile.title }}
          </router-link>
        </li>
      </ul>
    </section>
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
          cssClass: 'cat-client',
          tiles: [
            { title: '閲覧環境', route: 'client-info' },
          ],
        },
        {
          name: '文字列操作ツール',
          cssClass: 'cat-text',
          tiles: [
            { title: 'Text Hash', route: 'text-hash' },
            { title: 'json整形', route: 'json-formatter' },
            { title: 'xml整形', route: 'xml-formatter' },
            { title: '制御文字展開', route: 'escape-sequence-interpreter' },
            { title: 'テキストケース変換', route: 'text-case-converter' },
            { title: '正規表現テスター', route: 'regex-tester' },
            { title: 'ランダム文字列生成', route: 'template-base-random-generator' },
            { title: 'UUID生成', route: 'uuid-generator' },
            { title: 'テキストカウンター', route: 'text-counter' },
            { title: 'ルビ生成', route: 'ruby-generator' },
            { title: '文字装飾', route: 'text-styler' },
          ],
        },
        {
          name: '画像操作ツール',
          cssClass: 'cat-image',
          tiles: [
            { title: 'EXIF削除', route: 'image-metadata' },
          ],
        },
        {
          name: '日付ツール',
          cssClass: 'cat-date',
          tiles: [
            { title: '祝日タイマー', route: 'countdown-to-holidays' },
            { title: '世界時計', route: 'world-timezone' },
            { title: 'タイムゾーン変換', route: 'timezone-converter' },
            { title: '和暦', route: 'japanese-era' },
            { title: 'コンピュータ時刻問題', route: 'time-issues' },
            { title: '時間進捗バー', route: 'time-progress' },
            { title: 'UNIXTIME変換', route: 'unix-time-converter' },
            { title: '生年月日情報', route: 'birthdate-info' },
          ],
        },
        {
          name: '単位ツール',
          cssClass: 'cat-unit',
          tiles: [
            { title: '距離単位変換', route: 'length-converter' },
            { title: '重さ単位変換', route: 'weight-converter' },
            { title: '面積単位変換', route: 'area-converter' },
            { title: '体積単位変換', route: 'volume-converter' },
            { title: '温度単位変換', route: 'temperature-converter' },
            { title: 'データ量単位変換', route: 'data-size-converter' },
            { title: '期間単位変換', route: 'duration-converter' },
          ],
        },
        {
          name: '数値ツール',
          cssClass: 'cat-number',
          tiles: [
            { title: '素数カウンター', route: 'sosu' },
          ],
        },
        {
          name: 'Blueskyツール',
          cssClass: 'cat-bluesky',
          tiles: [
            { title: 'Hugo埋め込みコード生成', route: 'bluesky-shortcodes' },
          ],
        },
      ],
    };
  },
};
</script>

<style scoped>
.home-page {
  max-width: 800px;
  margin: 0 auto;
}

.home-lead {
  color: var(--tb-muted);
  margin: 1em 0 0;
}

.blog-tools li {
  font-family: 'Fira Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
</style>
