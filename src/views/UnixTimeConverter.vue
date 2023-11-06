<template>
  <div class="container mx-auto">
    <!-- unixtimeの入力 -->
    <div class="flex items-center mb-6">
      <label class="w-32 text-right mr-4">Unix時間:</label>
      <input class="border-2 border-gray-200 p-2 rounded w-64" v-model="unixtime" type="text" placeholder="Unixtime" @input="updateReadable">
    </div>

    <!-- YYYY-MM-DD HH:MM:SS形式の入力とTimezone selection -->
    <div class="flex items-center mb-6 mt-10">
      <label class="w-32 text-right mr-4">日付と時間:</label>
      <input class="border-2 border-gray-200 p-2 rounded w-64" v-model="readable" type="datetime-local" placeholder="YYYY-MM-DD HH:MM:SS" @input="updateUnixtime">
      <select v-model="timezone" class="ml-4 border-2 border-gray-200 p-2 rounded w-32">
        <option value="jst">JST</option>
        <option value="utc">UTC</option>
      </select>
    </div>

    <!-- Reset button -->
    <button class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-4" @click="resetTime">現在の時間にリセット</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      unixtime: Math.floor(Date.now() / 1000),
      readable: new Date().toISOString().replace('T', ' ').substring(0, 19),
      timezone: 'jst'
    }
  },
  methods: {
    updateReadable() {
      if (this.unixtime) {
        let date = new Date(this.unixtime * 1000);
        if (this.timezone === 'jst') {
          date.setHours(date.getHours() + 9);
        }
        this.readable = date.toISOString().replace('T', ' ').substring(0, 19);
      } else {
        this.readable = '';
      }
    },
    updateUnixtime() {
      if (this.readable) {
        let date = new Date(this.readable);
        if (this.timezone === 'jst') {
          date.setHours(date.getHours() - 9);
        }
        this.unixtime = Math.floor(date.getTime() / 1000);
      } else {
        this.unixtime = '';
      }
    },
    resetTime() {
      this.unixtime = Math.floor(Date.now() / 1000);
      this.updateReadable();
    }
  }
}
</script>
