<template>
  <div>
    <h1>JSON Formatter</h1>
    <textarea
      class="resize border rounded-md p-3 w-2/3"
      v-model="inputJson"
      @input="formatJson"
      placeholder="Input JSON"
    ></textarea>

    <TextHighlighter :formattedText="formattedJson" highlightLanguage="json" />
  </div>
</template>

<script>
import "highlight.js/styles/monokai.css";
import TextHighlighter from "@/components/TextHighlighter.vue";

export default {
  data() {
    return {
      inputJson: "",
      formattedJson: "",
      errorMessages: "",
      hasError: false,
    };
  },
  components: {
    TextHighlighter,
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
