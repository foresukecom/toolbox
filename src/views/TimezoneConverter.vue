<template>
  <div>
    <h1>Timezone Converter</h1>
    <div>
      <label for="inputDateTime">Input Date & Time:</label>
      <input type="datetime-local" id="inputDateTime" v-model="inputDateTime" />
      <button @click="setCurrentTime">Set Current Time</button>
    </div>
    <div>
      <label for="inputTimezone">Input Timezone:</label>
      <select id="inputTimezone" v-model="selectedInputTimezone">
        <option v-for="timezone in commonTimezones" :key="timezone" :value="timezone">
          {{ timezone }} (UTC{{ formatOffset(timezone) }})
        </option>
      </select>
    </div>
    <div>
      <label for="outputTimezone">Output Timezone:</label>
      <select id="outputTimezone" v-model="selectedOutputTimezone">
        <option v-for="timezone in commonTimezones" :key="timezone" :value="timezone">
          {{ timezone }} (UTC{{ formatOffset(timezone) }})
        </option>
      </select>
    </div>
    <div>
      <label for="outputDateTime">Output Date & Time:</label>
      <input type="text" id="outputDateTime" :value="outputDateTime" readonly />
    </div>
  </div>
</template>


<script>
import moment from "moment-timezone";

export default {
  name: "TimezoneConverter",
  data() {
    return {
      selectedInputTimezone: "Asia/Tokyo",
      selectedOutputTimezone: "UTC",
      inputDateTime: moment().format("YYYY-MM-DDTHH:mm"),
      outputDateTime: "",
    };
  },
  computed: {
    commonTimezones() {
      return [
        "Asia/Tokyo",
        "UTC",
        "America/New_York",
        "Europe/London",
        "Europe/Paris",
        "Asia/Shanghai",
        "Australia/Sydney",
        "Asia/Seoul",
      ];
    },
  },
  watch: {
    selectedInputTimezone() {
      this.convertTime();
    },
    selectedOutputTimezone() {
      this.convertTime();
    },
    inputDateTime() {
      this.convertTime();
    },
  },
  methods: {
    convertTime() {
      const inputMoment = moment.tz(this.inputDateTime, this.selectedInputTimezone);
      const outputMoment = inputMoment.clone().tz(this.selectedOutputTimezone);
      this.outputDateTime = outputMoment.format("YYYY-MM-DD HH:mm:ss");
    },
    setCurrentTime() {
      const now = moment().tz(this.selectedInputTimezone);
      this.inputDateTime = now.format("YYYY-MM-DDTHH:mm");
    },
    formatOffset(timezone) {
      const offset = moment.tz(timezone).utcOffset();
      const hours = offset / 60;
      const sign = hours >= 0 ? "+" : "-";
      return `${sign}${Math.abs(hours)}:00`;
    },
  },
  mounted() {
    this.convertTime();
  },
};
</script>


<style scoped>
h1 {
  margin-bottom: 20px;
}
</style>
