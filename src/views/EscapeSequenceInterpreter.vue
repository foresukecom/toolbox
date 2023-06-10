<template>
  <div>
    <h1>制御文字の解釈・展開</h1>
    <v-textarea label="Input" auto-grow v-model="input" @input="interpretEscapeSequences"></v-textarea>
    <pre v-if="output" class="output">{{ output }}</pre>
    <v-btn @click="copyToClipboard">Copy to clipboard</v-btn>
    <v-snackbar v-model="snackbarVisible" right bottom :timeout="1000">
      Output copied to clipboard!
    </v-snackbar>
  </div>
</template>

<script>
export default {
  data() {
    return {
      input: "",
      output: "",
      snackbarVisible: false,
    };
  },
  methods: {
    interpretEscapeSequences() {
      // Replace escape sequences with their actual characters
      this.output = this.input
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\'/g, '\'')
        // eslint-disable-next-line no-useless-escape
        .replace(/\\"/g, '\"')
        .replace(/\\\\/g, '\\');
    },
    async copyToClipboard() {
      if (!navigator.clipboard) {
        alert("Your browser does not support clipboard API.");
        return;
      }
      try {
        await navigator.clipboard.writeText(this.output);
        this.snackbarVisible = true;
      } catch (error) {
        alert("Failed to copy output to clipboard.");
      }
    },
  },
};
</script>

<style scoped>
.output {
  white-space: pre-wrap;
  font-family: "Courier New", monospace;
  background-color: #272822;
  color: #f8f8f2;
  padding: 16px;
  border-radius: 4px;
}
</style>
