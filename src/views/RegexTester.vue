<template>
  <div>
    <h1>Regular Expression Tester</h1>
    <v-textarea
      label="Regular Expression"
      v-model="regex"
      @input="testRegex"
    ></v-textarea>
    <v-textarea
      label="Test String"
      v-model="testString"
      @input="testRegex"
    ></v-textarea>
    <v-alert
      v-if="result !== ''"
      :type="result === 'Invalid Regular Expression' ? 'error' : 'info'"
    >
      {{ result }}
    </v-alert>
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
        this.result = re.test(this.testString) ? "Matched" : "Not Matched";
      } catch (error) {
        this.result = "Invalid Regular Expression";
      }
    },
  },
};
</script>
