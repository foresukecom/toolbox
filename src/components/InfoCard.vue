<template>
  <div class="w-full sm:w-2/3 md:w-1/3 lg:w-2/3 p-4">
    <div class="bg-white rounded shadow-md border border-gray-200 p-6">
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center">
          <h2 class="text-lg font-semibold mr-2">{{ title }}</h2>
          <CopyButton v-if="showCopyButton" :textToCopy="text" />
        </div>
      </div>
      <div :style="{ 'white-space': 'pre-line' }">{{ text }}</div>
    </div>
  </div>
</template>

<script>
import CopyButton from './CopyButton.vue';

export default {
  components: {
    CopyButton,
  },
  props: {
    title: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    showCopyButton: {
      type: Boolean,
      default: true,
    },
  },
};
</script>

<style scoped>
</style>
