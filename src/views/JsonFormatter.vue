<template>
  <div>
    <h1>JSON Formatter</h1>
    <v-textarea
      label="JSON Input"
      auto-grow
      v-model="inputJson"
      @input="formatJson"
      :error-messages="errorMessages"
      :success-messages="!hasError && formattedJson ? 'Valid JSON' : ''"
    ></v-textarea>
    <pre v-if="formattedJson" class="formatted-json" v-html="highlightedJson"></pre>
    <v-btn @click="copyToClipboard">Copy to clipboard</v-btn>
    <v-snackbar v-model="snackbarVisible" right bottom :timeout="1000">
      Formatted JSON copied to clipboard!
    </v-snackbar>
  </div>
</template>

<script>
import hljs from "highlight.js";
import "highlight.js/styles/monokai.css";

export default {
  data() {
    return {
      inputJson: "",
      formattedJson: "",
      errorMessages: "",
      hasError: false,
      snackbarVisible: false,
    };
  },
  computed: {
    highlightedJson() {
      if (this.hasError) {
        return hljs.highlightAuto(this.formattedJson, ["json"]).value;
      }
      return hljs.highlight("json", this.formattedJson).value;
    },
  },
  methods: {
    formatJson() {
      try {
        const jsonObj = JSON.parse(this.inputJson);
        this.formattedJson = JSON.stringify(jsonObj, null, 2);
        this.hasError = false;
        this.errorMessages = "";
      } catch (error) {
        this.formattedJson = error.message;
        this.hasError = true;
        this.errorMessages = "Invalid JSON";
      }
    },
    async copyToClipboard() {
      if (!navigator.clipboard) {
        alert("Your browser does not support clipboard API.");
        return;
      }
      try {
        await navigator.clipboard.writeText(this.formattedJson);
        this.snackbarVisible = true;
      } catch (error) {
        alert("Failed to copy formatted JSON to clipboard.");
      }
    },
  },
};
</script>

<style scoped>
.formatted-json {
  white-space: pre-wrap;
  font-family: "Courier New", monospace;
  background-color: #272822;
  color: #f8f8f2;
  padding: 16px;
  border-radius: 4px;
}
</style>
