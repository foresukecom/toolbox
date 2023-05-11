<template>
  <v-container>
    <div v-for="(category, index) in categories" :key="'category-' + index">
      <v-divider></v-divider>
      <h2>{{ category.name }}</h2>
      <v-row>
        <v-col cols="12" sm="6" md="4" lg="3" v-for="(tile, index) in category.tiles" :key="'tile-' + index">
          <v-card @click="goTo(tile.route)" class="d-flex flex-column">
            <v-img :src="tile.image" height="200px" />
            <v-card-title class="text-center">{{ tile.title }}</v-card-title>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
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
              image: 'https://via.placeholder.com/200',
              route: 'client-info',
            },
          ],
        },
        {
          name: '文字列操作ツール',
          tiles: [
            {
              title: 'Text Hash',
              image: 'https://via.placeholder.com/200',
              route: 'text-hash',
            },
            {
              title: 'json整形',
              image: 'https://via.placeholder.com/200',
              route: 'json-formatter',
            },
            {
              title: 'xml整形',
              image: 'https://via.placeholder.com/200',
              route: 'xml-formatter',
            },
            {
              title: 'テキストケース変換',
              image: 'https://via.placeholder.com/200',
              route: 'text-case-converter',
            },
          ],
        },
        {
          name: '画像操作ツール',
          tiles: [

            {
              title: 'Gif 変換',
              image: 'https://via.placeholder.com/200',
              route: 'video-to-gif',
            },
          ],
        },
        {
          name: '日付ツール',
          tiles: [
            {
              title: '祝日タイマー',
              image: 'https://via.placeholder.com/200',
              route: 'countdown-to-holidays',
            },
            {
              title: '世界時計',
              image: 'https://via.placeholder.com/200',
              route: 'world-timezone',
            },
            {
              title: 'タイムゾーン変換',
              image: 'https://via.placeholder.com/200',
              route: 'timezone-converter',
            },
            {
              title: '和暦',
              image: 'https://via.placeholder.com/200',
              route: 'japanese-era',
            },
            {
              title: 'コンピュータ時刻問題',
              image: 'https://via.placeholder.com/200',
              route: 'time-issues',
            },
            {
              title: '時間進捗バー',
              image: 'https://via.placeholder.com/200',
              route: 'time-progress',
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
