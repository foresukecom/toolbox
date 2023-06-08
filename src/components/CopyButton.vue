<template>
  <div>
    <button :class="buttonClass" type="button" @click="copyToClipboard">
      <div v-if="!copied">
        <i class="material-icons">content_copy</i>
      </div>
      <div v-else>
        <i class="material-icons">check</i>
      </div>
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
        ? 'bg-green-500 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline'
        : 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline';
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
          }, 500);
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
