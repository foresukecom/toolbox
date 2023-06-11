<template>
  <div>
    <h1>制御文字の解釈・展開</h1>
    <textarea
      class="resize border rounded-md p-3 w-2/3"
      v-model="input"
      @input="interpretEscapeSequences"
      placeholder="Input Text"
    ></textarea>
    <FormattedDisplay v-if="output" :formattedText="output" highlightLanguage="json"/>
  </div>
</template>

<script>
import FormattedDisplay from '@/components/FormattedDisplay.vue';

export default {
  components: {
    FormattedDisplay,
  },
  data() {
    return {
      input: "",
      output: "",
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
