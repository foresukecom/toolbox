<template>
  <div class="container mx-auto px-4">
    <h1 class="text-2xl mb-4">Text Converter</h1>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2">
        <label for="inputText" class="block text-sm font-medium text-gray-700">Input Text</label>
        <textarea id="inputText" v-model="inputText" @input="convertText" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2 relative">
        <label for="snakeCase" class="block text-sm font-medium text-gray-700">Snake Case</label>
        <textarea id="snakeCase" readonly v-model="snakeCase" class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="snakeCase" class="absolute top-2 right-2" />
      </div>
      <div class="col-span-2 relative">
        <label for="kebabCase" class="block text-sm font-medium text-gray-700">Kebab Case</label>
        <textarea id="kebabCase" readonly v-model="kebabCase" class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="kebabCase" class="absolute top-2 right-2" />
      </div>
      <div class="col-span-2 relative">
        <label for="camelCase" class="block text-sm font-medium text-gray-700">Camel Case</label>
        <textarea id="camelCase" readonly v-model="camelCase" class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="camelCase" class="absolute top-2 right-2" />
      </div>
      <div class="col-span-2 relative">
        <label for="upperCase" class="block text-sm font-medium text-gray-700">Uppercase</label>
        <textarea id="upperCase" readonly v-model="upperCase" class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="upperCase" class="absolute top-2 right-2" />
      </div>
      <div class="col-span-2 relative">
        <label for="lowerCase" class="block text-sm font-medium text-gray-700">Lowercase</label>
        <textarea id="lowerCase" readonly v-model="lowerCase" class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="lowerCase" class="absolute top-2 right-2" />
      </div>
      <div class="col-span-2 relative">
        <label for="invertedCase" class="block text-sm font-medium text-gray-700">Inverted Case</label>
        <textarea id="invertedCase" readonly v-model="invertedCase" class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
        <CopyButton :textToCopy="invertedCase" class="absolute top-2 right-2" />
      </div>
    </div>
  </div>
</template>



<script>
import CopyButton from '@/components/CopyButton.vue';
export default {
  components: {
    CopyButton,
  },
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

