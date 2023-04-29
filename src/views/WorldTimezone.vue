<template>
  <div>
    <h1>World Clock</h1>
    <table>
      <thead>
        <tr>
          <th>Time Zone</th>
          <th>Current Time</th>
          <th>Offset</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="zone in timeZoneData" :key="zone.name" :class="{ highlight: zone.name === 'Asia/Tokyo' }">
          <td>{{ zone.name }}</td>
          <td>{{ zone.time }}</td>
          <td>{{ zone.offset }}</td>
        </tr>
      </tbody>
    </table>
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
        return {
          name: zone,
          time: time.format("YYYY-MM-DD HH:mm:ss"),
          offset: `UTC${formattedOffset}`,
        };
      });
    },
  },
  mounted() {
    setInterval(() => {
      this.timeZoneData = this.getTimeZoneData();
    }, 1000);
  },
};
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

.highlight {
  background-color: #cce5ff;
}
</style>
