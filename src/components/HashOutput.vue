<template>
  <div class="hash-output mb-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <label class="text-gray-700 text-sm font-bold mb-2 mr-2" :for="label">
          {{ label }}
        </label>
      <CopyButton :textToCopy="currentHash" />
      </div>  
    </div>
    <textarea
      class="shadow appearance-none border rounded p-3 w-2/3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      :id="label" readonly v-model="currentHash"></textarea>
  </div>
</template>

<script>
import CopyButton from './CopyButton.vue';
export default {
  components: {
    CopyButton,
  },
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
      currentHash: this.hash,
    };
  },
  watch: {
    hash(newHash) {
      this.currentHash = newHash;
    },
  },
};
</script>

<style scoped>
.hash-output {
  margin-bottom: 16px;
}
</style>
