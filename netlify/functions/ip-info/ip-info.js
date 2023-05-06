const axios = require("axios");

exports.handler = async function(event, context) {
  const { ip } = event.queryStringParameters;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!ip) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "IP address is required." }),
    };
  }

  const API_KEY = process.env.IPINFO_API_TOKEN;

  try {
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${API_KEY}`);
    const data = response.data;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country,
        postal: data.postal,
        location: data.loc,
        org: data.org,
      }),
    };
  } catch (error) {
    console.error("Error fetching IP information:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch IP information." }),
    };
  }
};
