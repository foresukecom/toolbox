<template>
  <div class="w-4/5 mx-auto my-8">
    <h1 class="text-2xl font-bold mb-4">ワールドクロック</h1>
    <div class="overflow-x-auto">
      <table class="table-auto w-full">
        <thead>
          <tr>
            <th class="px-4 py-2">タイムゾーン</th>
            <th class="px-4 py-2">現在の時間</th>
            <th class="px-4 py-2">オフセット</th>
            <th class="px-4 py-2">サマータイム</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="zone in timeZoneData" :key="zone.name" :class="{ 'bg-blue-100': zone.name === 'Asia/Tokyo' }"
            :id="zone.name === 'Asia/Tokyo' ? 'tokyoRow' : ''">
            <td class="border px-4 py-2">{{ zone.name }}</td>
            <td class="border px-4 py-2">{{ zone.time }}</td>
            <td class="border px-4 py-2">{{ zone.offset }}</td>
            <td class="border px-4 py-2">
              <span v-if="zone.isDST" class="text-yellow-500">☀️</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import moment from "moment-timezone";
import "moment-duration-format";

export default {
  name: "WorldTimezone",
  data() {
    return {
      timeZoneData: this.getTimeZoneData(),
    };
  },
  methods: {
    getZones() {
      const zones = moment.tz.names();
      const filteredZones = zones.filter((zoneName) => {
        return (
          zoneName.includes("/") &&
          !zoneName.startsWith("Etc/") &&
          !zoneName.match(/GMT[+-]\d+/)
        );
      });

      return filteredZones.sort((a, b) => {
        const aOffset = moment.tz(a).utcOffset();
        const bOffset = moment.tz(b).utcOffset();
        return aOffset - bOffset;
      });
    },
    getTimeZoneData() {
      const currentTime = moment();
      const zones = this.getZones();
      return zones.map((zone) => {
        const time = currentTime.clone().tz(zone);
        const offset = time.utcOffset();
        const formattedOffset = (offset >= 0 ? "+" : "-") + moment.duration(Math.abs(offset), "minutes").format("hh:mm");
        const isDST = time.isDST();
        return {
          name: zone,
          time: time.format("YYYY-MM-DD HH:mm:ss"),
          offset: `UTC${formattedOffset}`,
          isDST,
        };
      });
    },
    scrollToTokyo() {
      const tokyoRow = document.getElementById('tokyoRow');
      if (tokyoRow) {
        tokyoRow.scrollIntoView();
      }
    },
  },
  mounted() {
    setInterval(() => {
      this.timeZoneData = this.getTimeZoneData();
    }, 1000);

    this.$nextTick(() => {
      this.scrollToTokyo();
    });
  },
};
</script>
