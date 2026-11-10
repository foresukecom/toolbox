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

The development environment is built with [Nix](https://nixos.org/) (flakes) and [direnv](https://direnv.net/).  
Development tools such as Node.js, Yarn, Go and just are defined in `flake.nix`.

### Prerequisites

- Nix (with flakes enabled)
- direnv (hooked into your shell; using [nix-direnv](https://github.com/nix-community/nix-direnv) is recommended)

### Steps

1. `git clone` this repository
2. Run `direnv allow` at the repository root (the first run takes a while to fetch the tools)
3. Copy `.env.sample` to `.env` and add the necessary information (or run `just env`)
4. Run `just install` to install dependencies
5. Run `just serve` to start the development server
6. Access [localhost:8080](http://localhost:8080) from your browser

Without direnv, you can enter the same shell with `nix develop`.

## Contribution

Feel free to contact us for any bugs or feature requests.  

For direct contact, please visit:
- [X(Twitter)](https://twitter.com/foresukecom)
- [Bluesky](https://bsky.app/profile/foresuke.com)
- [discord](https://discord.com/users/1138361849843302482)

## License

MIT
