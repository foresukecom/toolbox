<template>
  <v-col cols="12" sm="6" md="4" lg="3">
    <v-card>
      <v-card-title class="d-flex subtitle-1">{{ title }}
        <v-spacer></v-spacer>
        <v-btn @click="copyToClipboard(text)">
          <v-icon v-bind="attrs" v-on="on" small class="mr-2" @click="copyToClipboard(text)">
            mdi-content-copy
          </v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="headline">{{ text }}</v-card-text>
      <v-snackbar v-model="snackbar" :timeout="1000" color="success">
        {{ snackbarText }}
      </v-snackbar>
    </v-card>
  </v-col>
</template>


<script>
export default {
  data() {
    return {
      snackbar: false,
      snackbarText: '',
      snackbarColor: 'success',
    };
  },
  props: {
    title: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  methods: {
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.snackbarText = 'Copied to clipboard!';
        this.snackbarColor = 'success';
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        this.snackbarText = 'Failed to copy to clipboard.';
        this.snackbarColor = 'error';
      }
      this.snackbar = true;
    },
  },
};
</script>
