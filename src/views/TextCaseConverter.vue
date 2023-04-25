<template>
  <div>
    <h1>Text Converter</h1>
    <v-textarea label="Input Text" v-model="inputText" @input="convertText"></v-textarea>
    <v-textarea label="Snake Case" readonly v-model="snakeCase"></v-textarea>
    <v-textarea label="Kebab Case" readonly v-model="kebabCase"></v-textarea>
    <v-textarea label="Camel Case" readonly v-model="camelCase"></v-textarea>
    <v-textarea label="Uppercase" readonly v-model="upperCase"></v-textarea>
    <v-textarea label="Lowercase" readonly v-model="lowerCase"></v-textarea>
    <v-textarea label="Inverted Case" readonly v-model="invertedCase"></v-textarea>
  </div>
</template>

<script>
export default {
  data() {
    return {
      inputText: '',
      snakeCase: '',
      kebabCase: '',
      camelCase: '',
      upperCase: '',
      lowerCase: '',
      invertedCase: ''
    };
  },
  methods: {
    convertText() {
      this.snakeCase = this.toSnakeCase(this.inputText);
      this.kebabCase = this.toKebabCase(this.inputText);
      this.camelCase = this.toCamelCase(this.inputText);
      this.upperCase = this.inputText.toUpperCase();
      this.lowerCase = this.inputText.toLowerCase();
      this.invertedCase = this.invertCase(this.inputText);
    },
    toSnakeCase(str) {
      return str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase();
    },
    toKebabCase(str) {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
    },
    toCamelCase(str) {
      return str.replace(/[-_\s]+(.)?/g, (match, c) => (c ? c.toUpperCase() : ''));
    },
    invertCase(str) {
      return str.split('').map(c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('');
    }
  }
};
</script>
