<template>
  <div class="container mx-auto p-4">
    <div class="flex items-center justify-center w-full">
      <label for="dropzone-file"
        class="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
        @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @drop.prevent="handleDrop">
        <div class="flex flex-col items-center justify-center pt-5 pb-6">
          <svg class="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 7h10M7 12h10m-5 5h5a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">EXIF情報を取得したいファイルを選択するか、画面内にドラッグ・アンド・ドロップしてください。</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">image/jpeg, image/tiff</p>
        </div>
        <input id="dropzone-file" type="file" class="hidden" @change="handleFileChange" accept="image/jpeg, image/tiff" />

      </label>
    </div>

    <div v-if="selectedImageUrl" class="mt-4">
      <img class="h-auto max-w-lg transition-all duration-300 rounded-lg blur-sm hover:blur-none"
        :src="selectedImageUrl" />
    </div>
    <div v-if="exifData" class="mt-4">

      <button type="button" @click="removeExifAndDownload(selectedFile)"
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center mt-4 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
        <svg class="w-5 h-5 me-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        EXIF情報を削除した画像ファイルをダウンロード
      </button>

      <h3 class="text-lg font-semibold">EXIF Information:</h3>
      <ul class="list-disc pl-5">
        <li v-for="(value, key) in exifData" :key="key">
          <strong>{{ key }}:</strong> {{ value }}
        </li>
      </ul>
    </div>
    <div :style="mapStyle" ref="mapContainer" class="map-container h-64"></div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import EXIF from 'exif-js';

export default {
  data() {
    return {
      selectedImageUrl: null,
      isDragOver: false,
      exifData: null,
      map: null, // 地図のインスタンスを保持
      mapStyle: { visibility: 'hidden' },
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
        this.processFile(file); // EXIFデータの処理
        this.loadImage(file); // 画像の読み込み
      }
    },
    handleFileChange(event) {
      const files = event.target.files;
      if (files.length > 0) {
        this.selectedFile = files[0]; // selectedFile を更新
        this.processFile(this.selectedFile); // EXIFデータの処理
        this.loadImage(this.selectedFile); // 画像の読み込み
      }
    },
    processFile(file) {
      EXIF.getData(file, () => {
        this.exifData = EXIF.getAllTags(file);
        if (this.exifData.GPSLatitude && this.exifData.GPSLongitude) {
          const lat = this.convertGPSInfo(this.exifData.GPSLatitude);
          const lng = this.convertGPSInfo(this.exifData.GPSLongitude);
          this.mapVisible = true;
          // 地図がロードされていることを確認してから、中心を更新
          if (this.map && this.map.isStyleLoaded()) {
            this.map.flyTo({ center: [lng, lat] });
            this.showMap();
          }
        } else {
          this.hideMap();
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
    showMap() {
      this.mapStyle.visibility = 'visible'; // 地図を表示
    },
    hideMap() {
      this.mapStyle.visibility = 'hidden'; // 地図を非表示
    },
    loadImage(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImageUrl = e.target.result; // 読み込んだ画像のデータURLを設定
      };
      reader.readAsDataURL(file); // ファイルをデータURLとして読み込む
    },
    // EXIF削除
    removeExifAndDownload(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // canvasを使用して画像を描画し、EXIF情報を削除
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // canvasから画像をエクスポート
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);

            // ダウンロードリンクを作成
            const link = document.createElement('a');
            link.href = url;
            link.download = 'no-exif_' + file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Blob URLを解放
            URL.revokeObjectURL(url);
          }, 'image/jpeg');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },
  },
};
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 400px;
  /* 地図の高さ */
}</style>
