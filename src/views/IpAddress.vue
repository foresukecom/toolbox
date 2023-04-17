<template>
  <div>
    <h1>IP Address</h1>
    <p>Your IP address is: {{ ipAddress }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      ipAddress: '',
    };
  },
  async mounted() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.ipAddress = data.ip;
    } catch (error) {
      console.error('Error fetching IP address:', error);
    }
  },
};
</script>
