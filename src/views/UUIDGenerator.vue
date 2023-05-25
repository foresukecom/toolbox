<template>
  <div>
    <h1>UUID Generator</h1>
    <v-btn @click="generateUUID">Generate UUID</v-btn>

    <v-row>
      <v-col cols="8">
        <v-text-field :value="uuid" readonly></v-text-field>
      </v-col>

      <v-col cols="4">
        <v-btn @click="copyToClipboard">Copy to Clipboard</v-btn>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :timeout="1000" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
import { v4 as uuidv4 } from 'uuid';

export default {
  data() {
    return {
      uuid: '',
      snackbar: false,
      snackbarColor: 'success',
      snackbarText: '',
    }
  },
  methods: {
    generateUUID() {
      this.uuid = uuidv4();
    },
    copyToClipboard() {
      navigator.clipboard.writeText(this.uuid)
        .then(() => {
          this.snackbarColor = 'success';
          this.snackbarText = 'UUID copied to clipboard!';
          this.snackbar = true;
        })
        .catch(() => {
          this.snackbarColor = 'error';
          this.snackbarText = 'Failed to copy UUID!';
          this.snackbar = true;
        });
    }
  }
}
</script>
