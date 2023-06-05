<template>
  <div class="formatted-display">
    <div class="text-area-container">
      <pre class="formatted-text" v-html="highlightedText"></pre>
      <v-btn
        icon
        small
        class="copy-button"
        @click="copyToClipboard"
      >
        <v-icon>mdi-content-copy</v-icon>
      </v-btn>
    </div>
    <v-snackbar v-model="snackbarVisible" right bottom :timeout="1000">
      Formatted text copied to clipboard!
    </v-snackbar>
  </div>
</template>

<script>
import hljs from "highlight.js";

export default {
  props: ["formattedText", "highlightLanguage"],
  data() {
    return {
      snackbarVisible: false,
    };
  },
  computed: {
    highlightedText() {
      if (!this.formattedText) {
        return "";
      }
      return hljs.highlight(this.highlightLanguage, this.formattedText).value;
    },
  },
  methods: {
    async copyToClipboard() {
      if (!navigator.clipboard) {
        alert("Your browser does not support clipboard API.");
        return;
      }
      try {
        await navigator.clipboard.writeText(this.formattedText);
        this.snackbarVisible = true;
      } catch (error) {
        alert("Failed to copy formatted text to clipboard.");
      }
    },
  },
};
</script>

<style scoped>
.formatted-display {
  position: relative;
}

.text-area-container {
  position: relative;
}

.formatted-text {
  white-space: pre-wrap;
  font-family: "Courier New", monospace;
  background-color: #272822;
  color: #f8f8f2;
  padding: 16px;
  border-radius: 4px;
}

.copy-button {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
