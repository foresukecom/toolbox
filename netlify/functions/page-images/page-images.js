// Web ページ内の画像を集め、それぞれの EXIF などのメタデータを返す
//
//   GET /.netlify/functions/page-images?url=<URL>
//
// 外部への取得はすべて netlify/lib/safe-fetch.js の safeFetch 経由で行う。
// レスポンスは JSON のみ（取得した HTML や画像そのものは返さない）。
// Netlify の同期関数は10秒で打ち切られるため、全体で8秒以内に返す。

const { parse } = require('node-html-parser');
const exifr = require('exifr');
const { safeFetch, corsHeaders, errorResponse } = require('../../lib/safe-fetch');

const PAGE_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_MAX_BYTES = 256 * 1024;
const FETCH_TIMEOUT_MS = 3000;
const MAX_IMAGES = 20;
const CONCURRENCY = 4;
// 開始からこの時間を過ぎたら、新しい画像の取得は始めない
const START_DEADLINE_MS = 7000;
// 全体の上限（実行中の取得もこれを超えないようにタイムアウトを縮める）
const TOTAL_DEADLINE_MS = 7800;
const MIN_FETCH_MS = 300;

const PICK_KEYS = ['Make', 'Model', 'LensModel', 'DateTimeOriginal', 'Software', 'Artist', 'Copyright'];

function json(event, statusCode, body) {
  return { statusCode, headers: corsHeaders(event), body: JSON.stringify(body) };
}

function headerValue(headers, name) {
  const v = headers && headers[name];
  return Array.isArray(v) ? v[0] : (v || '');
}

// Content-Type または <meta charset> から文字コードを決めて HTML をデコードする
function decodeHtml(body, contentType) {
  let charset = (contentType.match(/charset=["']?([\w-]+)/i) || [])[1];
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

// srcset の先頭候補の URL
function firstSrcsetUrl(srcset) {
  const first = (srcset || '').trim().split(/\s+/)[0] || '';
  return first.replace(/,$/, '');
}

// ページ内の画像 URL を集める（絶対 URL 化・重複除去・http/https のみ）
function collectImages(root, baseUrl) {
  const list = [];
  const seen = new Set();
  let dataUriCount = 0;

  const add = (raw, alt) => {
    const value = (raw || '').trim();
    if (!value) return;
    if (/^data:/i.test(value)) {
      dataUriCount++;
      return;
    }
    let abs;
    try {
      abs = new URL(value, baseUrl);
    } catch (e) {
      return;
    }
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return;
    abs.hash = '';
    const key = abs.toString();
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ url: key, alt: alt || '' });
  };

  root.querySelectorAll('meta').forEach((meta) => {
    const prop = (meta.getAttribute('property') || '').toLowerCase();
    if (prop === 'og:image' || prop === 'og:image:url') {
      const altMeta = root.querySelector('meta[property="og:image:alt"]');
      add(meta.getAttribute('content'), altMeta ? altMeta.getAttribute('content') : '');
    }
  });
  root.querySelectorAll('img, source').forEach((el) => {
    const isImg = el.rawTagName.toLowerCase() === 'img';
    let alt = isImg ? el.getAttribute('alt') : '';
    if (!isImg && el.parentNode) {
      const img = el.parentNode.querySelector('img');
      alt = img ? img.getAttribute('alt') : '';
    }
    if (isImg) add(el.getAttribute('src'), alt);
    add(firstSrcsetUrl(el.getAttribute('srcset')), alt);
  });

  return { list, dataUriCount };
}

function pickMetadata(raw) {
  const out = {};
  PICK_KEYS.forEach((key) => {
    if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') out[key] = raw[key];
  });
  const width = raw.ImageWidth || raw.ExifImageWidth;
  const height = raw.ImageHeight || raw.ExifImageHeight;
  if (width) out.ImageWidth = width;
  if (height) out.ImageHeight = height;
  if (Number.isFinite(raw.latitude) && Number.isFinite(raw.longitude)) {
    out.latitude = raw.latitude;
    out.longitude = raw.longitude;
  }
  return out;
}

const UNSUPPORTED_TYPES = ['image/svg+xml', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/bmp'];

async function inspectImage(item, timeoutMs) {
  const result = {
    url: item.url,
    alt: item.alt,
    contentType: null,
    bytesRead: 0,
    truncated: false,
    hasGps: false,
    metadata: null,
    note: null,
    error: null,
    skipped: false,
  };

  let res;
  try {
    res = await safeFetch(item.url, {
      accept: 'image/*',
      maxBytes: IMAGE_MAX_BYTES,
      truncate: true,
      timeoutMs,
    });
  } catch (err) {
    result.error = err && err.code && err.name === 'SafeFetchError' ? err.code : 'network';
    result.note = err && err.name === 'SafeFetchError' ? err.message : '取得に失敗しました';
    return result;
  }

  const contentType = headerValue(res.headers, 'content-type').split(';')[0].trim().toLowerCase();
  result.contentType = contentType || null;
  result.bytesRead = res.body.length;
  result.truncated = res.truncated;

  if (contentType && !contentType.startsWith('image/')) {
    result.note = '画像ではありません';
    return result;
  }
  if (UNSUPPORTED_TYPES.includes(contentType)) {
    result.note = 'EXIF の読み取りに対応していない形式です';
    return result;
  }

  let raw;
  try {
    raw = await exifr.parse(res.body, { tiff: true, exif: true, gps: true, xmp: false, icc: false });
  } catch (err) {
    const message = String((err && err.message) || '');
    if (/unknown file format|invalid input/i.test(message)) {
      result.note = 'EXIF の読み取りに対応していない形式です';
    } else if (res.truncated) {
      result.note = 'ファイルの先頭だけでは EXIF を読み取れませんでした';
    } else {
      result.note = 'EXIF を読み取れませんでした';
    }
    return result;
  }

  if (!raw) {
    result.note = 'EXIF がありません';
    return result;
  }
  const metadata = pickMetadata(raw);
  if (Object.keys(metadata).length === 0) {
    result.note = 'EXIF はありますが、主な項目は含まれていません';
    return result;
  }
  result.metadata = metadata;
  result.hasGps = metadata.latitude !== undefined;
  return result;
}

// 同時に CONCURRENCY 件まで取得する。期限を過ぎたら残りは skipped にする
async function inspectAll(items, startedAt) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      const elapsed = Date.now() - startedAt;
      const remaining = TOTAL_DEADLINE_MS - elapsed;
      if (elapsed >= START_DEADLINE_MS || remaining < MIN_FETCH_MS) {
        results[index] = {
          url: item.url,
          alt: item.alt,
          contentType: null,
          bytesRead: 0,
          truncated: false,
          hasGps: false,
          metadata: null,
          note: '時間切れのため取得しませんでした',
          error: null,
          skipped: true,
        };
        continue;
      }
      results[index] = await inspectImage(item, Math.min(FETCH_TIMEOUT_MS, remaining));
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return results;
}

exports.handler = async function handler(event) {
  const startedAt = Date.now();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }
  if (event.httpMethod && event.httpMethod !== 'GET') {
    return json(event, 405, { error: 'method_not_allowed', message: 'GET のみ対応しています' });
  }

  const url = event.queryStringParameters && event.queryStringParameters.url;
  if (!url) {
    return json(event, 400, { error: 'missing_url', message: 'url パラメータを指定してください' });
  }

  let page;
  try {
    page = await safeFetch(url, { accept: 'text/html', maxBytes: PAGE_MAX_BYTES, timeoutMs: FETCH_TIMEOUT_MS });
  } catch (err) {
    return errorResponse(event, err);
  }

  try {
    const contentType = headerValue(page.headers, 'content-type').toLowerCase();
    if (!/text\/html|application\/xhtml\+xml/.test(contentType)) {
      return json(event, 422, { error: 'not_html', message: '取得先が HTML ではありません' });
    }

    const root = parse(decodeHtml(page.body, contentType));
    const titleEl = root.querySelector('title');
    const title = titleEl ? titleEl.text.trim() : '';

    // <base href> があればそれを基準にする（取得後の URL からの相対も可）
    let baseUrl = page.url;
    const baseEl = root.querySelector('base[href]');
    if (baseEl) {
      try {
        const b = new URL(baseEl.getAttribute('href'), page.url);
        if (b.protocol === 'http:' || b.protocol === 'https:') baseUrl = b.toString();
      } catch (e) {
        // 不正な <base> は無視する
      }
    }

    const { list, dataUriCount } = collectImages(root, baseUrl);
    const targets = list.slice(0, MAX_IMAGES);
    const images = await inspectAll(targets, startedAt);
    const overLimit = list.length - targets.length;
    const timeSkipped = images.filter((img) => img.skipped).length;

    return json(event, 200, {
      page: page.url,
      title,
      found: list.length,
      dataUriCount,
      checked: images.length - timeSkipped,
      images,
      skipped: overLimit + timeSkipped,
      overLimit,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    return errorResponse(event, err);
  }
};
