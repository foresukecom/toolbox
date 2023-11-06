<template>
  <div class="p-4">
    <div class="mb-4">
      <label for="kanji" class="block text-gray-700 text-sm font-bold mb-2">漢字:</label>
      <input v-model="kanji" type="text" id="kanji" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
    </div>
    <div class="mb-6">
      <label for="ruby" class="block text-gray-700 text-sm font-bold mb-2">ルビ:</label>
      <input v-model="ruby" type="text" id="ruby" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
    </div>
    <button @click="generateHtml" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      HTMLで出力
    </button>
    <div v-html="outputHtml" class="mt-4"></div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      kanji: '',
      ruby: '',
      outputHtml: ''
    }
  },
  methods: {
    generateHtml() {
      this.outputHtml = `<ruby>${this.kanji}<rt>${this.ruby}</rt></ruby>`;
    }
  }
}
</script>

