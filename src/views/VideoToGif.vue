<template>
  <div>
    <h1>動画からGIFへの変換</h1>
    <input type="file" @change="loadVideo" accept="video/mp4,video/x-flv" />
    <video v-if="videoSrc" controls :src="videoSrc"></video>
    <div>
      <label for="gifSize">GIFサイズ:</label>
      <select id="gifSize" v-model="selectedGifSize">
        <option v-for="size in gifSizes" :key="size" :value="size">{{ size }}</option>
      </select>
    </div>
    <div>
      <label for="frameRate">フレームレート:</label>
      <select id="frameRate" v-model="selectedFrameRate">
        <option v-for="rate in frameRates" :key="rate" :value="rate">{{ rate }}</option>
      </select>
    </div>
    <button @click="convertVideoToGif">GIFに変換</button>
    <img v-if="gifSrc" :src="gifSrc" />
    <a v-if="gifSrc" :href="gifSrc" download="converted.gif">GIFをダウンロード</a>
  </div>
</template>

<script>
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export default {
  name: 'VideoToGif',
  data() {
    return {
      videoSrc: null,
      gifSrc: null,
      gifSizes: [320, 480, 640],
      selectedGifSize: 320,
      frameRates: [10, 15, 24],
      selectedFrameRate: 10,
    };
  },
  methods: {
    async loadVideo(event) {
      const file = event.target.files[0];
      if (!file) return;

      const fileURL = URL.createObjectURL(file);
      this.videoSrc = fileURL;
    },
    async convertVideoToGif() {
      const ffmpeg = createFFmpeg({ log: true });
      await ffmpeg.load();
      const videoFile = await fetchFile(this.videoSrc);
      ffmpeg.FS('writeFile', 'input.mp4', videoFile);

      await ffmpeg.run(
        '-i',
        'input.mp4',
        '-vf',
        `fps=${this.selectedFrameRate},scale=${this.selectedGifSize}:-1`,
        '-f',
        'gif',
        'output.gif'
      );

      const data = ffmpeg.FS('readFile', 'output.gif');
      const url = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));
      this.gifSrc = url;
    },
  },
};
</script>
