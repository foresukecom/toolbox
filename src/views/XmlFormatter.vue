<template>
  <div>
    <h1>XML Formatter</h1>
    <textarea
      class="resize border rounded-md p-3 w-2/3"
      v-model="inputXml"
      @input="formatXml"
      placeholder="Input XML"
    ></textarea>

    <TextHighlighter :formattedText="formattedXml" highlightLanguage="xml" />
  </div>
</template>

<script>
import "highlight.js/styles/monokai.css";
import TextHighlighter from "@/components/TextHighlighter.vue";
import format from 'xml-formatter';

export default {
  data() {
    return {
      inputXml: "",
      formattedXml: "",
    };
  },
  components: {
    TextHighlighter,
  },
  methods: {
    formatXml() {
      try {
        this.formattedXml = format(this.inputXml, { indentation: "  " });
      } catch (error) {
        this.formattedXml = "Invalid XML";
      }
    },
  },
};
</script>
