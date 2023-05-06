<template>
  <div>
    <h1>XML Formatter</h1>
    <v-textarea
      label="XML Input"
      auto-grow
      v-model="inputXml"
      @input="formatXml"
    ></v-textarea>
    <v-textarea
      label="Formatted XML"
      auto-grow
      readonly
      :value="formattedXml"
    ></v-textarea>
    <v-btn @click="copyToClipboard">Copy to Clipboard</v-btn>
    <v-snackbar
      v-model="snackbar"
      :timeout="3000"
      :color="snackbarColor"
    >
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
import format from 'xml-formatter';

export default {
  data() {
    return {
      inputXml: "",
      formattedXml: "",
      snackbar: false,
      snackbarText: "",
      snackbarColor: "",
    };
  },
  methods: {
    formatXml() {
      try {
        this.formattedXml = format(this.inputXml, { indentation: "  " });
        this.snackbarColor = "success";
        this.snackbarText = "XML formatted successfully";
      } catch (error) {
        this.formattedXml = "Invalid XML";
        this.snackbarColor = "error";
        this.snackbarText = "Invalid XML input";
      }
    },
    copyToClipboard() {
      navigator.clipboard.writeText(this.formattedXml).then(
        () => {
          this.snackbarColor = "success";
          this.snackbarText = "Copied to clipboard";
          this.snackbar = true;
        },
        () => {
          this.snackbarColor = "error";
          this.snackbarText = "Failed to copy";
          this.snackbar = true;
        }
      );
    },
  },
};
</script>
