<template>
  <div class="hash-output">
    <v-textarea
      :label="label"
      readonly
      v-model="currentHash"
      :append-icon="copyIcon"
      @click:append="copyToClipboard"
    ></v-textarea>
  </div>
</template>
<!-- TODO 色、高さを変更する -->

<script>
export default {
  props: {
    label: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      copyIcon: 'mdi-content-copy',
      currentHash: this.hash,
    };
  },
  watch: {
    hash(newHash) {
      this.currentHash = newHash;
    },
  },
  methods: {
    copyToClipboard() {
      navigator.clipboard.writeText(this.currentHash).then(
        () => {
          // Successful copy
          console.log('Hash copied to clipboard');
        },
        (error) => {
          // Failed copy
          console.error('Failed to copy hash:', error);
        },
      );
    },
  },
};
</script>

<style scoped>
.hash-output {
  margin-bottom: 16px;
}
</style>
