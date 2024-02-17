<template>
  <div class="container mx-auto">
    <div class="max-w-sm mx-auto">
      <input type="file" @change="handleFileChange" class="block w-full text-sm py-2 px-3 border rounded-lg text-gray-700 bg-white shadow-md focus:outline-none focus:border-indigo-500">
    </div>
    <div v-if="exifData" class="mt-5">
      <div class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div class="md:flex">
          <div class="p-8">
            <div class="uppercase tracking-wide text-sm text-indigo-500 font-semibold">EXIF Data</div>
            <ul class="mt-2 text-gray-500">
              <li v-for="(value, key) in exifData" :key="key" class="py-1">
                <strong>{{ key }}:</strong> {{ value }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import EXIF from 'exif-js';

export default {
  data() {
    return {
      exifData: null,
    };
  },
  methods: {
    handleFileChange(event) {
      const file = event.target.files[0];
      EXIF.getData(file, () => {
        this.exifData = EXIF.getAllTags(file);
      });
    },
  },
};
</script>
