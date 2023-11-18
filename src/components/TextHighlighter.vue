<template>
  <div class="relative">
    <div v-if="label" class="font-bold mb-2 text-lg">{{ label }}</div>
    <div class="relative">
      <div v-html="highlightedText" class="hljs min-h-[2rem]" ></div>
      <CopyButton
        v-if="showCopyButton"
        class="absolute top-2 right-2"
        :textToCopy="formattedText"
      />
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
  },
  computed: {
    highlightedText() {
      if (!this.formattedText) {
        return "";
      }
      return hljs.highlight(this.highlightLanguage, this.formattedText).value;
    },
  },
};
</script>

