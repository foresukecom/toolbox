<template>
  <div class="w-2/3 mx-auto">
    <h1 class="text-2xl font-bold mb-4">UUID Generator</h1>
    <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" @click="generateUUID">Generate UUID</button>
    <div class="flex items-center mt-4">
      <input type="text" class="border-2 border-gray-300 bg-white h-10 px-5 rounded-lg text-lg focus:outline-none w-2/3" :value="uuid" readonly>
      <CopyButton :textToCopy="uuid" class="ml-4" />
    </div>
  </div>
</template>

<script>
import { v4 as uuidv4 } from 'uuid';
import CopyButton from '@/components/CopyButton.vue';

export default {
  components: {
    CopyButton,
  },
  data() {
    return {
      uuid: '',
    }
  },
  methods: {
    generateUUID() {
      this.uuid = uuidv4();
    },
  },
}
</script>
