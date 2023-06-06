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
    <FormattedDisplay :formattedText="formattedJson" highlightLanguage="json" />
  </div>
</template>

<script>
import "highlight.js/styles/monokai.css";
import FormattedDisplay from "@/components/FormattedDisplay.vue";

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
    FormattedDisplay,
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
