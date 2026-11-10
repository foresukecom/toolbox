// HTML 文字列から OGP / Twitter Card / 基本メタ情報を取り出す（Netlify Functions 用）
//
// ネットワークには触れない純粋な関数だけを置く（node:test で検証する）。

const { parse } = require('node-html-parser');

const MAX_META_TAGS = 300;
const MAX_VALUE_LENGTH = 2000;

const OG_KEYS = ['title', 'description', 'image', 'url', 'site_name', 'type'];
const TWITTER_KEYS = ['card', 'title', 'description', 'image'];

// Content-Type または <meta charset> から文字コードを決めて HTML をデコードする
function decodeHtml(body, contentType) {
  let charset = ((contentType || '').match(/charset=["']?([\w-]+)/i) || [])[1];
  if (!charset) {
    const head = body.subarray(0, 2048).toString('latin1');
    charset = (head.match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
  }
  try {
    return new TextDecoder(charset || 'utf-8').decode(body);
  } catch (e) {
    return new TextDecoder('utf-8').decode(body);
  }
}

// 相対 URL を絶対 URL に解決する（http / https 以外は null）
function resolveUrl(value, baseUrl) {
  const v = (value || '').trim();
  if (!v) return null;
  try {
    const u = new URL(v, baseUrl);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch (e) {
    return null;
  }
}

// 属性名の大文字小文字を区別せずに取得する
function attr(el, name) {
  const attrs = el.attributes || {};
  const key = Object.keys(attrs).find((k) => k.toLowerCase() === name);
  return key === undefined ? null : attrs[key];
}

function clip(value) {
  const s = String(value == null ? '' : value).trim();
  return s.length > MAX_VALUE_LENGTH ? s.slice(0, MAX_VALUE_LENGTH) : s;
}

/**
 * HTML からメタ情報を抽出する
 * @param {string} html HTML 文字列
 * @param {string} pageUrl 取得後（リダイレクト後）の URL
 */
function extractMeta(html, pageUrl) {
  const root = parse(html);

  // <base href> があればそれを基準にする
  let baseUrl = pageUrl;
  const baseEl = root.querySelector('base[href]');
  if (baseEl) baseUrl = resolveUrl(attr(baseEl, 'href'), pageUrl) || pageUrl;

  const metaTags = [];
  // 同じキーが複数あれば最初のものを使う
  const first = {};
  root.querySelectorAll('meta').forEach((el) => {
    const keyAttr = ['property', 'name', 'http-equiv', 'itemprop'].find((a) => attr(el, a) !== null);
    if (keyAttr) {
      const key = clip(attr(el, keyAttr)).toLowerCase();
      const content = clip(attr(el, 'content'));
      if (!(key in first)) first[key] = { content, media: attr(el, 'media') };
      if (metaTags.length < MAX_META_TAGS) metaTags.push({ attr: keyAttr, key, content });
    } else if (attr(el, 'charset') !== null && metaTags.length < MAX_META_TAGS) {
      metaTags.push({ attr: 'charset', key: 'charset', content: clip(attr(el, 'charset')) });
    }
  });
  const get = (key) => (first[key] ? first[key].content : '');

  const og = {};
  OG_KEYS.forEach((k) => { og[k] = get(`og:${k}`); });
  if (!og.image) og.image = get('og:image:url') || get('og:image:secure_url');
  og.image = og.image ? resolveUrl(og.image, baseUrl) || '' : '';
  og.url = og.url ? resolveUrl(og.url, baseUrl) || og.url : '';
  og.imageWidth = Number(get('og:image:width')) || null;
  og.imageHeight = Number(get('og:image:height')) || null;
  og.imageAlt = get('og:image:alt');

  const twitter = {};
  TWITTER_KEYS.forEach((k) => { twitter[k] = get(`twitter:${k}`); });
  if (!twitter.image) twitter.image = get('twitter:image:src');
  twitter.image = twitter.image ? resolveUrl(twitter.image, baseUrl) || '' : '';
  twitter.imageAlt = get('twitter:image:alt');

  const titleEl = root.querySelector('head title') || root.querySelector('title');
  const links = root.querySelectorAll('link');
  const rels = (el) => (attr(el, 'rel') || '').toLowerCase().split(/\s+/);
  const canonicalEl = links.find((el) => rels(el).includes('canonical'));
  const iconEl = links.find((el) => rels(el).includes('icon'))
    || links.find((el) => rels(el).includes('apple-touch-icon'));
  const iconHref = iconEl ? resolveUrl(attr(iconEl, 'href'), baseUrl) : null;
  // media 指定のない theme-color を優先する
  const themeEl = root.querySelectorAll('meta')
    .filter((el) => (attr(el, 'name') || '').toLowerCase() === 'theme-color')
    .sort((a, b) => (attr(a, 'media') ? 1 : 0) - (attr(b, 'media') ? 1 : 0))[0];

  const basic = {
    title: titleEl ? clip(titleEl.text.replace(/\s+/g, ' ')) : '',
    description: get('description'),
    canonical: canonicalEl ? resolveUrl(attr(canonicalEl, 'href'), baseUrl) || '' : '',
    favicon: iconHref || resolveUrl('/favicon.ico', baseUrl),
    faviconFallback: !iconHref,
    themeColor: themeEl ? clip(attr(themeEl, 'content')) : '',
  };

  return { og, twitter, basic, metaTags };
}

// 画像ファイルの先頭バイトから幅・高さを読む（PNG / JPEG / GIF / WebP）。読めなければ null
function imageSize(buf) {
  if (!buf || buf.length < 24) return null;
  // PNG: IHDR
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return { type: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // GIF
  if (buf.toString('latin1', 0, 3) === 'GIF') {
    return { type: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  // WebP
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP' && buf.length >= 30) {
    const chunk = buf.toString('latin1', 12, 16);
    if (chunk === 'VP8 ') {
      return { type: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { type: 'webp', width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      return { type: 'webp', width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
    }
    return null;
  }
  // JPEG: SOFn マーカーを探す
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'jpeg', width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

module.exports = { extractMeta, decodeHtml, resolveUrl, imageSize };
