// Web ページの OGP / Twitter Card / 基本メタ情報を返す
//
//   GET /.netlify/functions/ogp-preview?url=<URL>
//
// 外部への取得はすべて netlify/lib/safe-fetch.js の safeFetch 経由で行う。
// レスポンスは JSON のみ（取得した HTML や画像そのものは返さない）。
// og:image は推奨サイズの判定のため、先頭だけを読んで幅・高さを調べる。
// Netlify の同期関数は10秒で打ち切られるため、全体で8秒以内に返す。

const { safeFetch, corsHeaders, errorResponse } = require('../../lib/safe-fetch');
const { extractMeta, decodeHtml, imageSize } = require('../../lib/ogp-meta');

// メタ情報は <head> にあるので、大きなページは先頭だけ読めば足りる
const PAGE_MAX_BYTES = 1024 * 1024;
const IMAGE_MAX_BYTES = 128 * 1024;
const PAGE_TIMEOUT_MS = 4000;
const IMAGE_TIMEOUT_MS = 3000;
const TOTAL_DEADLINE_MS = 7800;
const MIN_FETCH_MS = 300;

function json(event, statusCode, body) {
  return { statusCode, headers: corsHeaders(event), body: JSON.stringify(body) };
}

function headerValue(headers, name) {
  const v = headers && headers[name];
  return Array.isArray(v) ? v[0] : (v || '');
}

// 画像の種類・幅・高さ・サイズを調べる（失敗しても全体はエラーにしない）
async function inspectImage(url, timeoutMs) {
  const info = { url, contentType: null, width: null, height: null, bytes: null, error: null };
  try {
    const res = await safeFetch(url, { accept: 'image/*', maxBytes: IMAGE_MAX_BYTES, truncate: true, timeoutMs });
    info.contentType = headerValue(res.headers, 'content-type').split(';')[0].trim().toLowerCase() || null;
    const length = Number(headerValue(res.headers, 'content-length'));
    info.bytes = Number.isFinite(length) && length > 0 ? length : (res.truncated ? null : res.body.length);
    const size = imageSize(res.body);
    if (size) {
      info.width = size.width;
      info.height = size.height;
    }
  } catch (err) {
    info.error = err && err.name === 'SafeFetchError' ? err.code : 'network';
  }
  return info;
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
    page = await safeFetch(url, {
      accept: 'text/html,application/xhtml+xml',
      maxBytes: PAGE_MAX_BYTES,
      truncate: true,
      timeoutMs: PAGE_TIMEOUT_MS,
    });
  } catch (err) {
    return errorResponse(event, err);
  }

  try {
    const contentType = headerValue(page.headers, 'content-type').toLowerCase();
    if (!/text\/html|application\/xhtml\+xml/.test(contentType)) {
      return json(event, 422, { error: 'not_html', message: '取得先が HTML ではありません' });
    }

    const meta = extractMeta(decodeHtml(page.body, contentType), page.url);

    // og:image（無ければ twitter:image）の寸法を調べる
    const imageUrl = meta.og.image || meta.twitter.image;
    let image = null;
    const remaining = TOTAL_DEADLINE_MS - (Date.now() - startedAt);
    if (imageUrl && remaining >= MIN_FETCH_MS) {
      image = await inspectImage(imageUrl, Math.min(IMAGE_TIMEOUT_MS, remaining));
    }

    return json(event, 200, {
      page: page.url,
      truncated: page.truncated,
      ...meta,
      image,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    return errorResponse(event, err);
  }
};
