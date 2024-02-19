<template>
  <div class="container mx-auto p-4">
    <div class="border-4 border-dashed border-gray-200 rounded-lg p-6 cursor-pointer" @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave" @drop.prevent="handleDrop" :class="{ 'bg-gray-100': isDragOver }">
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
    <div ref="mapContainer" class="map-container h-64" />
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import EXIF from 'exif-js';

export default {
  data() {
    return {
      isDragOver: false,
      exifData: null,
      map: null, // 地図のインスタンスを保持
    };
  },
  mounted() {
    mapboxgl.accessToken = process.env.VUE_APP_MAPBOX;
    this.map = new mapboxgl.Map({
      container: this.$refs.mapContainer, // コンテナの参照
      style: 'mapbox://styles/mapbox/streets-v11', // 地図のスタイル
      center: [0, 0], // 初期の中心点
      zoom: 15, // 初期のズームレベル
    });
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
        if (this.exifData.GPSLatitude && this.exifData.GPSLongitude) {
          const lat = this.convertGPSInfo(this.exifData.GPSLatitude);
          const lng = this.convertGPSInfo(this.exifData.GPSLongitude);
          // 地図がロードされていることを確認してから、中心を更新
          if (this.map && this.map.isStyleLoaded()) {
            this.map.flyTo({ center: [lng, lat] });
          }
        }
      });
    },

    convertGPSInfo(gpsData) {
      const convertToDecimal = (num) => {
        return num[0].numerator + num[1].numerator / (60 * num[1].denominator) + num[2].numerator / (3600 * num[2].denominator);
      };

      // GPSデータが存在し、正しい形式であることを確認
      if (gpsData && gpsData.length === 3) {
        return convertToDecimal(gpsData);
      } else {
        return 0; // 不正なデータの場合は0を返す
      }
    },
  },
};
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 400px;
  /* 地図の高さ */
}
</style>
