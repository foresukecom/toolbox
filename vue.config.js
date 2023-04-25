const childProcess = require('child_process');
const { defineConfig } = require('@vue/cli-service');
const webpack = require('webpack');

const gitCommitHash = childProcess
  .execSync('git rev-parse --short HEAD')
  .toString()
  .trim();

module.exports = defineConfig({
  transpileDependencies: true,

  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        'process.env.VUE_APP_GIT_COMMIT_HASH': JSON.stringify(gitCommitHash),
      }),
    ],
  },

  pluginOptions: {
    vuetify: {
      // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vuetify-loader
    },
  },

  devServer: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
