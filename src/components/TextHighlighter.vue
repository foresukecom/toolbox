<template>
  <div class="formatted-display">
    <div class="text-area-container relative">
      <pre class="formatted-text prose prose-sm max-w-none" v-html="highlightedText"></pre>
      <CopyButton class="copy-button absolute top-2 right-2" :textToCopy="formattedText" />
    </div>
  </div>
</template>

<script>
import hljs from "highlight.js";
import CopyButton from './CopyButton.vue';

export default {
  components: {
    CopyButton,
  },
  props: ["formattedText", "highlightLanguage"],
  computed: {
    highlightedText() {
      if (!this.formattedText) {
        return "";
      }
      return hljs.highlight(this.highlightLanguage, this.formattedText).value;
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
</style>
