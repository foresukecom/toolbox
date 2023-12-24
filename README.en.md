# 🔧toolbox

This project/website aims to streamline daily tasks and the development process by providing a variety of useful tools.  
[日本語版](README.md)

The website is available [here](http://tools.foresuke.com).


## Features

The following features are included:
※Additional features will be added sequentially.

### Client Information
- Browsing Environment

### String Manipulation Tools
- Text Hash
- JSON Formatting
- XML Formatting
- Text Case Conversion
- Random String Generation
- Ruby Generation

### Date Tools
- Holiday Timer
- World Clock
- Time Zone Conversion
- Time Progress Bar
- UNIXTIME Conversion
- Birthday Information

### Unit Tools
- Distance Unit Conversion

## Configuration

The site is hosted using Netlify.

Primarily, it processes on the front-end using Vue.js, but the [Browsing Environment](https://tools.foresuke.com/client-info) screen uses an external API ([ipinfo.io](https://ipinfo.io/)) to obtain approximate regional information from the IP address.  
To prevent CORS errors, it calls the external API via Netlify functions.

Confidential information is specified as environment variables in Netlify.  
The specified items are as follows:

| Key | Sample Value | Description | 
| --- | --- | --- | 
| IPINFO_API_TOKEN | YOUR_IPINFO_API_TOKEN | Token used when calling ipinfo.io | 
| VUE_APP_AUTHOR | hoge | Author name. Displayed in the browser's developer console | 
| VUE_APP_GA_TRACKING_ID | G-xxxxxxx | Google Analytics Tracking ID | 
| VUE_APP_NETLIFY_FUNCTION_DOMAIN | https://hogehoge.netlify.app | Backend (Netlify functions) endpoint | 

## Setup

This project is developed using Docker containers.  
Here is how to check its operation locally:

1. `git clone` this repository
2. Open in VSCode (the development container will start)
3. Rename `.env.sample` to `.env` and add the necessary information
4. Execute `yarn serve` command inside the container
5. Access [localhost:8080](http://localhost:8080) from your browser

## Contribution

Feel free to contact us for any bugs or feature requests.  

For direct contact, please visit:
- [X(Twitter)](https://twitter.com/foresukecom)
- [Bluesky](https://bsky.app/profile/foresuke.com)
- [discord](https://discord.com/users/1138361849843302482)

## License

MIT
