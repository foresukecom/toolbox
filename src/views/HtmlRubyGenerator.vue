<template>
  <div class="p-4">
    <div class="mb-4">
      <div class="mb-4">
        <label for="ruby" class="block text-gray-700 text-sm font-bold mb-2">ルビ:</label>
        <input v-model="ruby" type="text" id="ruby"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
      </div>
      <label for="kanji" class="block text-gray-700 text-sm font-bold mb-2">漢字:</label>
      <input v-model="kanji" type="text" id="kanji"
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
    </div>
    <div class="mb-4">
      <button @click="generateHtml"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
        HTMLで出力
      </button>
    </div>
    <div v-if="outputHtml" class="mt-4">
      <p class="text-gray-600">HTMLタグ付きテキスト:</p>
      <div v-html="outputHtml" class="text-blue-600"></div>
    </div>

    <div v-if="outputHtml" class="mt-4">
    <p class="text-gray-600">HTMLタグ付きテキスト:</p>
    <!-- HTMLタグをテキストとして表示する -->
    <div v-html="escapedHtml" class="text-blue-600"></div>
  </div>
  </div>  
</template>

<script>
export default {
  data() {
    return {
      kanji: '',
      ruby: '',
      outputHtml: '',
      escapedHtml: '', // エスケープされたHTMLを格納するためのプロパティ
    };
  },
  methods: {
    generateHtml() {
      if (this.kanji && this.ruby) {
        const rawHtml = `<ruby>${this.kanji}<rt>${this.ruby}</rt></ruby>`;
        this.outputHtml = rawHtml;
        this.escapedHtml = this.escapeHtml(rawHtml); // エスケープ処理を追加
      } else {
        this.outputHtml = '';
        this.escapedHtml = ''; // 入力がない場合は出力をクリア
      }
    },
    escapeHtml(html) {
      return html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },
  }
}
</script>
