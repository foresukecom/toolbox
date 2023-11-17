<template>
  <div>
    <h1>制御文字の解釈・展開</h1>
    <textarea
      class="resize border rounded-md p-3 w-2/3"
      v-model="input"
      @input="interpretEscapeSequences"
      placeholder="Input Text"
    ></textarea>
    <TextHighlighter v-if="output" :formattedText="output" highlightLanguage="json"/>
  </div>
</template>

<script>
import TextHighlighter from '@/components/TextHighlighter.vue';
import { interpretEscapeSequences as interpret } from '@/utilities/escapeSequenceUtils.js';

export default {
  components: {
    TextHighlighter,
  },
  data() {
    return {
      input: "",
      output: "",
    };
  },
  methods: {
    interpretEscapeSequences() {
      this.output = interpret(this.input);
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
