<template>
  <div class="p-4">
    <div class="mb-4">
      <label for="ruby" class="block text-gray-700 text-sm font-bold mb-2">ルビ:</label>
      <input v-model="ruby" type="text" id="ruby"
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
    </div>
    <div class="mb-4">
      <label for="kanji" class="block text-gray-700 text-sm font-bold mb-2">漢字:</label>
      <input v-model="kanji" type="text" id="kanji"
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
    </div>
    <div v-if="outputHtml" class="mt-4">
      <p class="text-gray-600">HTMLタグ付きテキスト:</p>
      <div v-html="outputHtml" class="text-blue-600"></div>
    </div>
    <div v-if="escapedHtml" class="mt-4">
      <p class="text-gray-600">エスケープされたHTMLタグ:</p>
      <TextHighlighter :formattedText="escapedHtml" highlightLanguage="html" />
    </div>
  </div>
</template>

<script>
import TextHighlighter from "@/components/TextHighlighter.vue";
export default {
  data() {
    return {
      kanji: '',
      ruby: '',
      outputHtml: '',
      escapedHtml: '',
    };
  },
  watch: {
    kanji() {
      this.generateHtml();
    },
    ruby() {
      this.generateHtml();
    }
  },
  components: {
    TextHighlighter,
  },
  methods: {
    generateHtml() {
      if (this.kanji && this.ruby) {
        const rawHtml = `<ruby>${this.kanji}<rt>${this.ruby}</rt></ruby>`;
        this.outputHtml = rawHtml;
        this.escapedHtml = rawHtml;
      } else {
        this.outputHtml = '';
        this.escapedHtml = '';
      }
    },
  }
}
</script>
