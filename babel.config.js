module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset'
  ],
  plugins: [
    // cron-parser v5 の static private methods (#foo) を変換するため
    '@babel/plugin-transform-private-methods'
  ]
}
