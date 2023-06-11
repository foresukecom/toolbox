<template>
  <div class="flex justify-center">
    <div class="w-4/6">
      <h1 class="text-2xl font-bold text-center my-4">正規表現テスター</h1>
      <div class="mb-4">
        <label for="regex" class="block text-gray-700 font-bold mb-2">正規表現</label>
        <textarea
          id="regex"
          v-model="regex"
          @input="testRegex"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div class="mb-4">
        <label for="testString" class="block text-gray-700 font-bold mb-2">テスト文字列</label>
        <textarea
          id="testString"
          v-model="testString"
          @input="testRegex"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div v-if="result !== ''"
        class="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        v-bind:class="{ 'bg-green-100 border-green-400 text-green-700': result !== '無効な正規表現' }"
      >
        {{ result }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      regex: "",
      testString: "",
      result: "",
    };
  },
  methods: {
    testRegex() {
      try {
        const re = new RegExp(this.regex);
        this.result = re.test(this.testString) ? "一致" : "不一致";
      } catch (error) {
        this.result = "無効な正規表現";
      }
    },
  },
};
</script>
