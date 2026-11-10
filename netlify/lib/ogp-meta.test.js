// 実行: node --test netlify/lib/ogp-meta.test.js
const test = require('node:test');
const assert = require('node:assert');
const { extractMeta, decodeHtml, resolveUrl } = require('./ogp-meta');

const HTML = `<!doctype html><html><head>
<title>  サンプル &amp; ページ </title>
<META NAME="Description" CONTENT="基本の説明">
<meta property="og:title" content="OG &quot;タイトル&quot;">
<meta property="og:description" content="OG の説明">
<meta property="og:image" content="/img/card.png">
<meta property="og:image" content="/img/second.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://example.com/page">
<meta property="og:site_name" content="Example">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image:src" content="//cdn.example.com/tw.png">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000">
<meta name="theme-color" content="#336699">
<meta charset="utf-8">
<link rel="canonical" href="/page">
<link rel="shortcut icon" href="favicon.png">
</head><body></body></html>`;

test('OGP / Twitter / 基本情報を取り出し、相対 URL を解決する', () => {
  const m = extractMeta(HTML, 'https://example.com/dir/index.html');
  assert.strictEqual(m.og.title, 'OG "タイトル"');
  assert.strictEqual(m.og.image, 'https://example.com/img/card.png');
  assert.strictEqual(m.og.imageWidth, 1200);
  assert.strictEqual(m.og.imageHeight, 630);
  assert.strictEqual(m.og.site_name, 'Example');
  assert.strictEqual(m.og.type, 'article');
  assert.strictEqual(m.twitter.card, 'summary_large_image');
  assert.strictEqual(m.twitter.image, 'https://cdn.example.com/tw.png');
  assert.strictEqual(m.twitter.title, '');
  assert.strictEqual(m.basic.title, 'サンプル & ページ');
  assert.strictEqual(m.basic.description, '基本の説明');
  assert.strictEqual(m.basic.canonical, 'https://example.com/page');
  assert.strictEqual(m.basic.favicon, 'https://example.com/dir/favicon.png');
  assert.strictEqual(m.basic.faviconFallback, false);
  assert.strictEqual(m.basic.themeColor, '#336699');
  assert.strictEqual(m.metaTags.filter((t) => t.key === 'og:image').length, 2);
  assert.ok(m.metaTags.some((t) => t.attr === 'charset'));
});

test('タグが無いときは空にし、favicon は /favicon.ico を補う', () => {
  const m = extractMeta('<html><head></head></html>', 'https://example.com/a/b');
  assert.strictEqual(m.og.image, '');
  assert.strictEqual(m.basic.title, '');
  assert.strictEqual(m.basic.favicon, 'https://example.com/favicon.ico');
  assert.strictEqual(m.basic.faviconFallback, true);
  assert.deepStrictEqual(m.metaTags, []);
});

test('<base href> を基準にし、javascript: などは捨てる', () => {
  const m = extractMeta(
    '<base href="https://static.example.net/x/"><meta property="og:image" content="a.png"><link rel="icon" href="javascript:alert(1)">',
    'https://example.com/',
  );
  assert.strictEqual(m.og.image, 'https://static.example.net/x/a.png');
  assert.strictEqual(m.basic.faviconFallback, true);
  assert.strictEqual(resolveUrl('data:image/png;base64,xx', 'https://example.com/'), null);
});

test('文字コードを判定してデコードする', () => {
  const sjis = Buffer.from([0x3c, 0x6d, 0x65, 0x74, 0x61, 0x20, 0x63, 0x68, 0x61, 0x72, 0x73, 0x65, 0x74, 0x3d,
    0x53, 0x68, 0x69, 0x66, 0x74, 0x5f, 0x4a, 0x49, 0x53, 0x3e, 0x82, 0xa0]);
  assert.ok(decodeHtml(sjis, 'text/html').endsWith('あ'));
  assert.strictEqual(decodeHtml(Buffer.from('あ'), 'text/html; charset=utf-8'), 'あ');
});

test('画像の先頭バイトから幅・高さを読む', () => {
  const { imageSize } = require('./ogp-meta');
  const png = Buffer.alloc(32);
  png.writeUInt32BE(0x89504e47, 0);
  png.writeUInt32BE(1200, 16);
  png.writeUInt32BE(630, 20);
  assert.deepStrictEqual(imageSize(png), { type: 'png', width: 1200, height: 630 });

  const gif = Buffer.alloc(24);
  gif.write('GIF89a', 0, 'latin1');
  gif.writeUInt16LE(300, 6);
  gif.writeUInt16LE(157, 8);
  assert.deepStrictEqual(imageSize(gif), { type: 'gif', width: 300, height: 157 });

  // SOI, APP0(長さ 16), SOF0(高さ 630, 幅 1200)
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(14),
    Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x76, 0x04, 0xb0, 0x03]), Buffer.alloc(12),
  ]);
  assert.deepStrictEqual(imageSize(jpeg), { type: 'jpeg', width: 1200, height: 630 });

  const webp = Buffer.alloc(32);
  webp.write('RIFF', 0, 'latin1');
  webp.write('WEBPVP8X', 8, 'latin1');
  webp.writeUIntLE(1199, 24, 3);
  webp.writeUIntLE(629, 27, 3);
  assert.deepStrictEqual(imageSize(webp), { type: 'webp', width: 1200, height: 630 });

  assert.strictEqual(imageSize(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
});
