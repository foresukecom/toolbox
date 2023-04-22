<template>
  <div class="hash-container">
    <v-textarea :label="label" readonly v-model="localHash"></v-textarea>
    <a href="#" @click.prevent="copyToClipboard(localHash)">Copy {{ label }}</a>
  </div>
</template>

<script>
export default {
  props: {
    label: String,
    hash: String,
  },
  computed: {
    localHash: {
      get() {
        return this.hash;
      },
      set(newValue) {
        this.$emit('update:hash', newValue);
      },
    },
  },
  methods: {
    copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        // Clipboard successfully set
      }, () => {
        // Clipboard write failed
      });
    },
  },
};
</script>
