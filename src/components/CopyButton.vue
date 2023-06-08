<template>
  <div>
    <button
      :class="buttonClass"
      type="button"
      @click="copyToClipboard"
    >
      <svg v-if="copied" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="h-6 w-6 inline-block">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="h-6 w-6 inline-block">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a1.5 1.5 0 00-3 0v6a1.5 1.5 0 001.5 1.5h5a1.5 1.5 0 001.5-1.5V9a1 1 0 00-1-1h-4zm-2 5V5a1 1 0 011-1h4a1 1 0 011 1v1H6a1 1 0 00-1 1v3zm6 2a1 1 0 00-1 1v5a1 1 0 001 1h4a1 1 0 001-1v-5a1 1 0 00-1-1h-4zm2 5V15a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1z"></path>
      </svg>
    </button>
  </div>
</template>

<script>
export default {
  props: {
    textToCopy: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      copied: false,
    };
  },
  computed: {
    buttonClass() {
      return this.copied
        ? 'bg-green-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
        : 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline';
    },
  },
  methods: {
    copyToClipboard() {
      navigator.clipboard.writeText(this.textToCopy).then(
        () => {
          // Successful copy
          console.log('Text copied to clipboard');
          this.copied = true;
          setTimeout(() => {
            this.copied = false;
          }, 2000);
        },
        (error) => {
          // Failed copy
          console.error('Failed to copy text:', error);
        },
      );
    },
  },
};
</script>
