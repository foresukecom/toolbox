<template>
  <div>
    <button v-if="textToCopy" :class="buttonClass" type="button" @click="copyToClipboard">
      <div v-if="!copied">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd"
            d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5v-3.379a3 3 0 00-.879-2.121l-3.12-3.121a3 3 0 00-1.402-.791 2.252 2.252 0 011.913-1.576A2.25 2.25 0 0112.25 1h1.5a2.25 2.25 0 012.238 2.012zM11.5 3.25a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v.25h-3v-.25z"
            clip-rule="evenodd" />
          <path
            d="M3.5 6A1.5 1.5 0 002 7.5v9A1.5 1.5 0 003.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L8.44 6.439A1.5 1.5 0 007.378 6H3.5z" />
        </svg> 
      </div>
      <div v-else>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd"
            d="M18 5.25a2.25 2.25 0 00-2.012-2.238A2.25 2.25 0 0013.75 1h-1.5a2.25 2.25 0 00-2.238 2.012c-.875.092-1.6.686-1.884 1.488H11A2.5 2.5 0 0113.5 7v7h2.25A2.25 2.25 0 0018 11.75v-6.5zM12.25 2.5a.75.75 0 00-.75.75v.25h3v-.25a.75.75 0 00-.75-.75h-1.5z"
            clip-rule="evenodd" />
          <path fill-rule="evenodd"
            d="M3 6a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V7a1 1 0 00-1-1H3zm6.874 4.166a.75.75 0 10-1.248-.832l-2.493 3.739-.853-.853a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.154-.114l3-4.5z"
            clip-rule="evenodd" />
        </svg> 
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
        ? 'bg-green-500 text-white font-bold py-0.5 px-1 rounded focus:outline-none focus:shadow-outline'
        : 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-0.5 px-1 rounded focus:outline-none focus:shadow-outline';
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
