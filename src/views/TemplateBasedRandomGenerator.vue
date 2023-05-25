<template>
  <div>
    <h1>Template-Based Random Generator</h1>
    <div>
      <h3>Rules:</h3>
      <ul>
        <li>'d' represents a random digit (0-9).</li>
        <li>'l' represents a random lowercase letter (a-z).</li>
        <li>'L' represents a random uppercase letter (A-Z).</li>
        <li>'*' represents a random alphanumeric character (a-z, A-Z, 0-9).</li>
      </ul>
    </div>
    <v-textarea label="Input Template" auto-grow v-model="inputTemplate" @input="generateRandomString"></v-textarea>
    <v-textarea label="Generated String" auto-grow v-model="generatedString" readonly></v-textarea>
    <v-btn @click="copyToClipboard">Copy to Clipboard</v-btn>
    <v-snackbar v-model="showSnackbar" :timeout="1000" color="success">
      コピーしました
    </v-snackbar>
  </div>
</template>

<script>
export default {
  data() {
    return {
      inputTemplate: "",
      generatedString: "",
      showSnackbar: false,
    };
  },
  methods: {
    generateRandomString() {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      this.generatedString = this.inputTemplate.split('').map((char) => {
        switch (char) {
          case 'd':
            return Math.floor(Math.random() * 10);
          case 'l':
            return String.fromCharCode(Math.floor(Math.random() * 26) + 97);
          case 'L':
            return String.fromCharCode(Math.floor(Math.random() * 26) + 65);
          case '*':
            return chars.charAt(Math.floor(Math.random() * chars.length));
          default:
            return char;
        }
      }).join('');
    },
    async copyToClipboard() {
      await navigator.clipboard.writeText(this.generatedString);
      this.showSnackbar = true;
    },
  },
};
</script>
