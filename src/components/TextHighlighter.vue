<template>
  <div class="relative" :class="widthClass">
    <div v-if="label" class="font-bold mb-2 text-lg">{{ label }}</div>
    <div class="relative">
      <pre v-html="highlightedText"
        class="whitespace-pre-wrap font-mono bg-gray-800 text-white p-4 rounded min-h-[2rem]"></pre>
      <CopyButton v-if="showCopyButton" class="absolute top-2 right-2" :textToCopy="formattedText" />
    </div>
  </div>
</template>

<script>
import hljs from "highlight.js";
import CopyButton from './CopyButton.vue';

export default {
  components: {
    CopyButton,
  },
  props: {
    formattedText: String,
    highlightLanguage: {
      type: String,
      default: 'plaintext' // デフォルトの言語を指定
    },
    showCopyButton: {
      type: Boolean,
      default: true, // デフォルトでコピーボタンを表示
    },
    label: {
      type: String,
      default: '', // ラベルのデフォルト値は空文字列
    },
    width: {
      type: String,
      default: 'auto', // デフォルトは自動調整
    },
  },
  computed: {
    highlightedText() {
      if (!this.formattedText) {
        return "";
      }
      return hljs.highlight(this.highlightLanguage, this.formattedText).value;
    },
    widthClass() {
      // Tailwind CSSの幅クラスに変換
      return this.width === 'auto' ? 'w-auto' : this.width;
    },
  },
};
</script>

<style>
.formatted-text {
  @apply whitespace-pre-wrap font-mono bg-gray-800 text-white p-4 rounded;
}
</style>