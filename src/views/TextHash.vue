<template>
  <div>
    <v-textarea label="Input Text" v-model="inputText" @input="updateHash"></v-textarea>
    <hash-output label="MD5" :hash="md5Hash"></hash-output>
    <hash-output label="SHA-1" :hash="sha1Hash"></hash-output>
    <hash-output label="SHA-256" :hash="sha256Hash"></hash-output>
    <hash-output label="SHA-512" :hash="sha512Hash"></hash-output>
    <hash-output label="SHA-3" :hash="sha3Hash"></hash-output>
  </div>
</template>

<script>
import crypto from 'crypto-js';
import HashOutput from '@/components/HashOutput.vue';

export default {
  components: {
    HashOutput,
  },
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
  methods: {
    updateHash() {
      this.md5Hash = this.hash(this.inputText, 'md5');
      this.sha1Hash = this.hash(this.inputText, 'sha1');
      this.sha256Hash = this.hash(this.inputText, 'sha256');
      this.sha512Hash = this.hash(this.inputText, 'sha512');
      this.sha3Hash = this.hash(this.inputText, 'sha3');
    },
    hash(text, algorithm) {
      let hashedText;
      switch (algorithm) {
        case 'md5':
          hashedText = crypto.MD5(text).toString();
          break;
        case 'sha1':
          hashedText = crypto.SHA1(text).toString();
          break;
        case 'sha256':
          hashedText = crypto.SHA256(text).toString();
          break;
        case 'sha512':
          hashedText = crypto.SHA512(text).toString();
          break;
        case 'sha3':
          hashedText = crypto.SHA3(text).toString();
          break;
        default:
          hashedText = '';
      }
      return hashedText;
    },
  },
};
</script>
