<template>
  <v-container>
    <v-row>
      <v-col cols="12" sm="6" md="4" lg="3" v-for="(tile, index) in tiles" :key="index">
        <v-card @click="goTo(tile.route)" class="d-flex flex-column">
          <v-img :src="tile.image" height="200px" />
          <v-card-title class="text-center">{{ tile.title }}</v-card-title>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      tiles: [
        {
          title: 'IP Address',
          image: 'https://via.placeholder.com/200',
          route: 'ip-address',
        },
        {
          title: 'Text Hash',
          image: 'https://via.placeholder.com/200',
          route: 'text-hash',
        },
      ],
    };
  },
  methods: {
    goTo(route) {
      this.$router.push({ name: route });
    },
  },
};
</script>
