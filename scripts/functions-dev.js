// ローカルで Netlify Functions を動かす簡易サーバ（netlify-cli の代わり）
//
//   node scripts/functions-dev.js [port]   (既定: 9999)
//
// http://localhost:<port>/.netlify/functions/<name>?... へのリクエストを
// netlify/functions/<name>/<name>.js の handler に渡す。関数ファイルはリクエストごとに読み直す。
// フロントエンドからつなぐ場合は VUE_APP_NETLIFY_FUNCTION_DOMAIN=http://localhost:<port> で起動する。

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.argv[2] || process.env.PORT || 9999);
const functionsDir = path.join(__dirname, '..', 'netlify', 'functions');

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/\.netlify\/functions\/([a-z0-9-]+)$/);
  const file = match && path.join(functionsDir, match[1], `${match[1]}.js`);
  if (!file || !fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('function not found');
    return;
  }

  delete require.cache[require.resolve(file)];
  const { handler } = require(file);
  const event = {
    httpMethod: req.method,
    path: url.pathname,
    headers: req.headers,
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: null,
  };

  const started = Date.now();
  try {
    const result = await handler(event, {});
    res.writeHead(result.statusCode || 200, result.headers || {});
    res.end(result.body || '');
    console.log(`${req.method} ${url.pathname} -> ${result.statusCode} (${Date.now() - started}ms)`);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('handler threw an error');
  }
}).listen(port, () => {
  console.log(`functions: http://localhost:${port}/.netlify/functions/<name>`);
});
