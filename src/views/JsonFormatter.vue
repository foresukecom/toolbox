<template>
  <div>
    <h1>JSON Formatter</h1>
    <v-textarea
      label="JSON Input"
      auto-grow
      v-model="inputJson"
    ></v-textarea>
    <v-btn @click="formatJson">Format JSON</v-btn>
    <v-textarea
      label="Formatted JSON"
      auto-grow
      readonly
      :value="formattedJson"
    ></v-textarea>
  </div>
</template>

<script>
export default {
  data() {
    return {
      inputJson: "",
      formattedJson: "",
    };
  },
  methods: {
    formatJson() {
      try {
        const jsonObj = JSON.parse(this.inputJson);
        this.formattedJson = JSON.stringify(jsonObj, null, 2);
      } catch (error) {
        this.formattedJson = "Invalid JSON";
      }
    },
  },
};
</script>
