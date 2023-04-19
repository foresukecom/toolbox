<template>
  <div>
    <h2>Video to GIF Converter</h2>
    <input type="file" @change="onFileSelected" accept="video/*" />
    <br />
    <button @click="convertVideoToGif" :disabled="!videoFile">Convert</button>
    <br />
    <img v-if="gifUrl" :src="gifUrl" alt="Generated GIF" />
    <br />
    <button v-if="gifUrl" @click="fetchFile">Download GIF</button>
  </div>
</template>

<script>
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const ffmpeg = createFFmpeg({ log: true });

export default {
  data() {
    return {
      videoFile: null,
      gifUrl: "",
    };
  },
  methods: {
    async onFileSelected(event) {
      this.videoFile = event.target.files[0];
    },
    async convertVideoToGif() {
      if (!this.videoFile) return;

      await ffmpeg.load();
      ffmpeg.FS("writeFile", "input.mp4", await fetchFile(this.videoFile));
      await ffmpeg.run("-i", "input.mp4", "-vf", "fps=10,scale=320:-1:flags=lanczos", "-c:v", "gif", "output.gif");
      const data = ffmpeg.FS("readFile", "output.gif");
      const url = URL.createObjectURL(new Blob([data.buffer], { type: "image/gif" }));
      this.gifUrl = url;
    },
    fetchFile() {
      const link = document.createElement("a");
      link.href = this.gifUrl;
      link.download = "output.gif";
      link.click();
    },
  },
};
</script>
