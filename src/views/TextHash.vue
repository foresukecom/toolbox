<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="6">
        <v-textarea
          v-model="textToHash"
          label="Enter your text"
          auto-grow
        ></v-textarea>
      </v-col>
      <v-col cols="12" md="6">
        <v-textarea
          v-model="hashedText"
          label="Hashed text"
          auto-grow
          readonly
        ></v-textarea>
      </v-col>
    </v-row>
    <v-btn @click="copyToClipboard" color="primary">Copy to clipboard</v-btn>
  </v-container>
</template>

<script>
import { ref, watch } from 'vue';
import { SHA256 } from 'crypto-js';

export default {
  setup() {
    const textToHash = ref('');
    const hashedText = ref('');

    // textToHash が変更されたときに実行される関数
    const onTextToHashChange = () => {
      hashedText.value = SHA256(textToHash.value).toString();
    };

    // textToHash の変更を監視
    watch(textToHash, onTextToHashChange);

    const copyToClipboard = () => {
      const textarea = document.createElement('textarea');
      textarea.textContent = hashedText.value;
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    };

    return {
      textToHash,
      hashedText,
      copyToClipboard,
    };
  },
};
</script>
