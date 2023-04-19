<template>
  <div>
    <v-textarea label="Input Text" v-model="inputText"></v-textarea>
    <div class="hash-container">
      <v-textarea label="MD5" readonly v-model="md5Hash"></v-textarea>
      <a href="#" @click.prevent="copyToClipboard(md5Hash)">Copy MD5</a>
    </div>
    <div class="hash-container">
      <v-textarea label="SHA-1" readonly v-model="sha1Hash"></v-textarea>
      <a href="#" @click.prevent="copyToClipboard(sha1Hash)">Copy SHA-1</a>
    </div>
    <div class="hash-container">
      <v-textarea label="SHA-256" readonly v-model="sha256Hash"></v-textarea>
      <a href="#" @click.prevent="copyToClipboard(sha256Hash)">Copy SHA-256</a>
    </div>
    <div class="hash-container">
      <v-textarea label="SHA-512" readonly v-model="sha512Hash"></v-textarea>
      <a href="#" @click.prevent="copyToClipboard(sha512Hash)">Copy SHA-512</a>
    </div>
    <div class="hash-container">
      <v-textarea label="SHA-3" readonly v-model="sha3Hash"></v-textarea>
      <a href="#" @click.prevent="copyToClipboard(sha3Hash)">Copy SHA-3</a>
    </div>
  </div>
</template>

<script>
import { MD5, SHA1, SHA256, SHA512, SHA3 } from 'crypto-js';

export default {
  name: 'TextHash',
  data() {
    return {
      inputText: '',
      md5Hash: '',
      sha1Hash: '',
      sha256Hash: '',
      sha512Hash: '',
      sha3Hash: '',
    };
  },
  watch: {
    inputText() {
      this.md5Hash = this.hashText(MD5);
      this.sha1Hash = this.hashText(SHA1);
      this.sha256Hash = this.hashText(SHA256);
      this.sha512Hash = this.hashText(SHA512);
      this.sha3Hash = this.hashText(SHA3);
    },
  },
  methods: {
    hashText(hashFunction) {
      return hashFunction(this.inputText).toString();
    },
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        console.log('Copied to clipboard');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    },
  },
};
</script>

<style scoped>
.hash-container {
  display: flex;
  align-items: center;
}
</style>
