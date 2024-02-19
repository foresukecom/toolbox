<template>
  <div class="container mx-auto p-4">
    <div 
      class="border-4 border-dashed border-gray-200 rounded-lg p-6 cursor-pointer"
      @dragover.prevent="handleDragOver" 
      @dragleave.prevent="handleDragLeave" 
      @drop.prevent="handleDrop"
      :class="{ 'bg-gray-100': isDragOver }"
    >
      <p class="text-center text-gray-500">画像をここにドラッグアンドドロップしてください</p>
    </div>
    <div v-if="exifData" class="mt-4">
      <h3 class="text-lg font-semibold">EXIF Information:</h3>
      <ul class="list-disc pl-5">
        <li v-for="(value, key) in exifData" :key="key">
          <strong>{{ key }}:</strong> {{ value }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import EXIF from 'exif-js';

export default {
  data() {
    return {
      isDragOver: false,
      exifData: null,
    };
  },
  methods: {
    handleDragOver() {
      this.isDragOver = true;
    },
    handleDragLeave() {
      this.isDragOver = false;
    },
    handleDrop(e) {
      this.isDragOver = false;
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        this.processFile(file);
      }
    },
    processFile(file) {
      EXIF.getData(file, () => {
        this.exifData = EXIF.getAllTags(file);
      });
    },
  },
};
</script>

<style scoped>
</style>
