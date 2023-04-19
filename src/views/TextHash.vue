<template>
  <v-container>
    <v-text-field v-model="inputText" label="テキスト入力" single-line></v-text-field>
    <v-btn @click="hashText">ハッシュ化</v-btn>
    <div v-if="hashedText">
      ハッシュ: {{ hashedText }}
      <v-btn @click="copyHashToClipboard">コピー</v-btn>
    </div>
  </v-container>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'TextHash',
  setup() {
    const inputText = ref('');
    const hashedText = ref('');

    async function hashText() {
      // ここでテキストをハッシュ化する処理を実行
      const encoder = new TextEncoder();
      const data = encoder.encode(inputText.value);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const array = Array.from(new Uint8Array(digest));
      hashedText.value = array.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    async function copyHashToClipboard() {
      try {
        await navigator.clipboard.writeText(hashedText.value);
        alert('ハッシュがクリップボードにコピーされました。');
      } catch (err) {
        alert('クリップボードへのコピーに失敗しました。');
      }
    }

    return {
      inputText,
      hashedText,
      hashText,
      copyHashToClipboard,
    };
  },
};
</script>
