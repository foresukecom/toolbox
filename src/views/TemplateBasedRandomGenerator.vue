<template>
  <div class="w-2/3 m-auto mt-10">
    <h1 class="text-3xl font-bold mb-8">テンプレートに基づくランダムジェネレーター</h1>
    <div class="mb-6">
      <h3 class="font-bold mb-2">ルール:</h3>
      <ul class="list-disc list-inside">
        <li>'d' はランダムな数字 (0-9) を表します。</li>
        <li>'l' はランダムな小文字 (a-z) を表します。</li>
        <li>'L' はランダムな大文字 (A-Z) を表します。</li>
        <li>'*' はランダムな英数字 (a-z, A-Z, 0-9) を表します。</li>
      </ul>
    </div>
    <label class="block mb-2">入力テンプレート</label>
    <textarea class="mb-4 w-full h-24 p-2 border rounded" v-model="inputTemplate" @input="generateRandomString"></textarea>
    <div class="flex items-center mb-2">
      <label class="mr-2">生成された文字列:</label>
      <CopyButton :textToCopy="generatedString" class="ml-2"/>
    </div>
    <textarea class="w-full h-24 p-2 border rounded bg-gray-100" v-model="generatedString" readonly></textarea>
  </div>
</template>

<script>
import { ref } from "vue";
import CopyButton from '@/components/CopyButton.vue';

export default {
  components: {
    CopyButton,
  },
  setup() {
    const inputTemplate = ref("");
    const generatedString = ref("");

    const generateRandomString = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      generatedString.value = inputTemplate.value.split('').map((char) => {
        switch (char) {
          case 'd':
            return Math.floor(Math.random() * 10);
          case 'l':
            return String.fromCharCode(Math.floor(Math.random() * 26) + 97);
          case 'L':
            return String.fromCharCode(Math.floor(Math.random() * 26) + 65);
          case '*':
            return chars.charAt(Math.floor(Math.random() * chars.length));
          default:
            return char;
        }
      }).join('');
    };

    return { inputTemplate, generatedString, generateRandomString };
  },
};
</script>

<style scoped>
</style>
