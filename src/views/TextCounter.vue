<template>
  <div class="max-w-lg mx-auto mt-10 px-4">
    <h1 class="text-2xl font-bold mb-5">文字数分析ツール</h1>
    <textarea v-model="inputText" class="w-full h-64 p-3 rounded border" placeholder="テキストをここに入力してください..."></textarea>
    <div class="mt-5 space-y-2">
      <p>文字数: {{ inputText.length }}</p>
      <p>バイト数: {{ getByteSize(inputText) }}</p>
      <p>単語数: {{ countWords(inputText) }}</p>
      <p>行数: {{ countLines(inputText) }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      inputText: "",
    };
  },
  methods: {
    getByteSize(str) {
      return new Blob([str]).size;
    },
    countWords(str) {
      const match = str.match(/[\w\d\s.-_\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF]+/gi);
      return match ? match.join("").split(/\s+/).length : 0;
    },
    countLines(str) {
      return str.split(/\r\n|\r|\n/).length;
    },
  },
};
</script>

<style scoped>
textarea {
  box-sizing: border-box;
}
</style>
