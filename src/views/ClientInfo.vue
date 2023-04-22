<template>
  <div>
    <h1>Client Info</h1>
    <p>Your IP address is: {{ ipAddress }}</p>
    <h2>User Agent Information</h2>
    <p>User Agent: {{ userAgent }}</p>
    <p>Language: {{ language }}</p>
    <h2>Screen Information</h2>
    <p>Screen Resolution: {{ screenWidth }} x {{ screenHeight }}</p>
    <p>Viewport Size: {{ viewportWidth }} x {{ viewportHeight }}</p>

    <p>Browser: {{ browser }}</p>
    <p>Operating System: {{ os }}</p>

    <h2>IP Information</h2>
    <p>Provider: {{ provider }}</p>
    <p>Region: {{ region }}</p>
    <p>City: {{ city }}</p>
    <p>Country: {{ country }}</p>
    <p>Zip: {{ zip }}</p>

  </div>
</template>

<script>
export default {
  data() {
    return {
      ipAddress: '',
      userAgent: navigator.userAgent,
      language: '',
      screenWidth: 0,
      screenHeight: 0,
      viewportWidth: 0,
      viewportHeight: 0,
      provider: '',
      region: '',
      city: '',
      country: '',
      zip: '',
    };
  },
  methods: {
    parseUserAgent() {
      const userAgent = navigator.userAgent;
      let browser = 'Unknown Browser';
      let os = 'Unknown OS';

      // ブラウザの判定
      if (userAgent.includes('Chrome')) {
        browser = 'Google Chrome';
      } else if (userAgent.includes('Firefox')) {
        browser = 'Mozilla Firefox';
      } else if (userAgent.includes('Safari')) {
        browser = 'Apple Safari';
      } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
        browser = 'Internet Explorer';
      } else if (userAgent.includes('Edge')) {
        browser = 'Microsoft Edge';
      } else if (userAgent.includes('Opera')) {
        browser = 'Opera';
      }

      // OSの判定
      if (userAgent.includes('Win')) {
        os = 'Windows';
      } else if (userAgent.includes('Mac')) {
        os = 'macOS';
      } else if (userAgent.includes('Linux')) {
        os = 'Linux';
      } else if (userAgent.includes('Android')) {
        os = 'Android';
      } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        os = 'iOS';
      }
      return { browser, os };
    },
    async fetchIPDetails(ipAddress) {
      try {
        const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
        const data = await response.json();
        if (data.status === "success") {
          return data;
        } else {
          throw new Error("Failed to fetch IP details");
        }
      } catch (error) {
        console.error("Error fetching IP details:", error);
        return null;
      }
    },
  },
  async mounted() {
    this.userAgent = navigator.userAgent;
    this.language = navigator.language;
    this.screenWidth = window.screen.width;
    this.screenHeight = window.screen.height;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    const { browser, os } = this.parseUserAgent();
    this.browser = browser;
    this.os = os;
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.ipAddress = data.ip;
    } catch (error) {
      console.error('Error fetching IP address:', error);
    }
    const ipDetails = await this.fetchIPDetails(this.ipAddress);
    if (ipDetails) {
      this.provider = ipDetails.isp;
      this.region = ipDetails.regionName;
      this.city = ipDetails.city;
      this.country = ipDetails.country;
      this.zip = ipDetails.zip;
    }
  },
};
</script>
