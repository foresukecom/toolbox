// 外部 URL を安全に取得するための共通ライブラリ（Netlify Functions 用）
//
// 任意の URL を取りに行く関数は SSRF（内部ネットワークやメタデータサービスへの到達）
// に悪用されやすいため、以下を必ずこのライブラリ経由で行う。
//
// - http / https、ポート 80 / 443 のみ。認証情報付き URL は拒否
// - 接続先 IP がプライベート / ループバック / リンクローカル等なら拒否
//   （DNS 解決時の lookup で検査するので、DNS リバインディングにも効く）
// - リダイレクトは回数を制限し、1回ごとに URL と接続先を再検査
// - タイムアウトとサイズ上限
//
// 注意: このディレクトリ (netlify/lib) は関数ではない。各関数から require して使う。

const http = require('http');
const https = require('https');
const dns = require('dns');
const net = require('net');

const DEFAULTS = {
  timeoutMs: 5000,
  maxBytes: 2 * 1024 * 1024,
  maxRedirects: 3,
  accept: '*/*',
  // true の場合、maxBytes を超えたらそこで打ち切って返す（画像の先頭だけ読む用途）
  truncate: false,
};

const USER_AGENT = 'toolbox-fetch/1.0 (+https://github.com/foresukecom/toolbox)';

class SafeFetchError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'SafeFetchError';
    this.code = code;
  }
}

// 公開インターネット以外のアドレス帯
const blockList = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([addr, prefix]) => blockList.addSubnet(addr, prefix, 'ipv4'));
[
  // ::/96 は IPv4 互換アドレス（::1 も含む）
  ['::', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['100::', 64],
  ['2001::', 32], ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10],
  ['ff00::', 8],
].forEach(([addr, prefix]) => blockList.addSubnet(addr, prefix, 'ipv6'));

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return !blockList.check(address, 'ipv4');
  if (family === 6) {
    // IPv4 射影アドレス (::ffff:a.b.c.d / ::ffff:7f00:1) は中の IPv4 で判定する
    const mapped = toMappedIPv4(address);
    if (mapped) return isPublicAddress(mapped);
    return !blockList.check(address, 'ipv6');
  }
  return false;
}

function toMappedIPv4(address) {
  const lower = address.toLowerCase();
  const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
  }
  return null;
}

// URL の形式を検査し、URL オブジェクトを返す
function validateUrl(input) {
  if (typeof input !== 'string' || input.length === 0 || input.length > 2048) {
    throw new SafeFetchError('invalid_url', 'URL が空か、長すぎます');
  }
  let url;
  try {
    url = new URL(input);
  } catch (e) {
    throw new SafeFetchError('invalid_url', 'URL の形式が正しくありません');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SafeFetchError('blocked_url', 'http / https 以外の URL は取得できません');
  }
  if (url.username || url.password) {
    throw new SafeFetchError('blocked_url', '認証情報を含む URL は取得できません');
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new SafeFetchError('blocked_url', 'ポート 80 / 443 以外は取得できません');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host) throw new SafeFetchError('invalid_url', 'ホスト名がありません');
  // IP 直書きの場合は lookup が呼ばれないため、ここで検査する
  if (net.isIP(host) && !isPublicAddress(host)) {
    throw new SafeFetchError('blocked_address', 'この接続先は取得できません');
  }
  return url;
}

// DNS 解決結果を検査する lookup（http.request の lookup オプション用）
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) {
      return callback(new SafeFetchError('blocked_address', 'この接続先は取得できません'));
    }
    if (options && options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

function requestOnce(url, opts) {
  return new Promise((resolveOuter, rejectOuter) => {
    // 少しずつ送り続ける相手にも対応するため、無通信時間とは別に全体の時間も制限する
    const timer = setTimeout(() => {
      req.destroy(new SafeFetchError('timeout', '取得先の応答がタイムアウトしました'));
    }, opts.timeoutMs);
    const resolve = (v) => { clearTimeout(timer); resolveOuter(v); };
    const reject = (e) => { clearTimeout(timer); rejectOuter(e); };
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(url, {
      method: 'GET',
      lookup: safeLookup,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: opts.accept,
        // 自動展開しないので、圧縮されていない応答を要求する
        'Accept-Encoding': 'identity',
      },
    }, (res) => {
      const { statusCode, headers } = res;
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        resolve({ redirect: headers.location, statusCode });
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        reject(new SafeFetchError('http_status', `取得先が HTTP ${statusCode} を返しました`));
        return;
      }
      const chunks = [];
      let size = 0;
      let done = false;
      res.on('data', (chunk) => {
        if (done) return;
        size += chunk.length;
        if (size > opts.maxBytes) {
          done = true;
          if (opts.truncate) {
            chunks.push(chunk.subarray(0, chunk.length - (size - opts.maxBytes)));
            req.destroy();
            resolve({ statusCode, headers, body: Buffer.concat(chunks), truncated: true });
          } else {
            req.destroy();
            reject(new SafeFetchError('too_large', '取得先のデータが大きすぎます'));
          }
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        if (done) return;
        done = true;
        resolve({ statusCode, headers, body: Buffer.concat(chunks), truncated: false });
      });
      res.on('error', (err) => { if (!done) { done = true; reject(err); } });
    });
    req.setTimeout(opts.timeoutMs, () => {
      req.destroy(new SafeFetchError('timeout', '取得先の応答がタイムアウトしました'));
    });
    req.on('error', (err) => reject(err instanceof SafeFetchError ? err : wrapNetworkError(err)));
    req.end();
  });
}

function wrapNetworkError(err) {
  if (err && err.code === 'ENOTFOUND') return new SafeFetchError('not_found', 'ホスト名を解決できません');
  return new SafeFetchError('network', '取得先に接続できませんでした');
}

/**
 * 外部 URL を安全に GET する
 * @param {string} input 取得する URL
 * @param {object} [options] timeoutMs / maxBytes / maxRedirects / accept / truncate
 * @returns {Promise<{url: string, statusCode: number, headers: object, body: Buffer, truncated: boolean}>}
 */
async function safeFetch(input, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  let url = validateUrl(input);
  for (let i = 0; i <= opts.maxRedirects; i++) {
    const res = await requestOnce(url, opts);
    if (!res.redirect) return { url: url.toString(), ...res };
    let next;
    try {
      next = new URL(res.redirect, url).toString();
    } catch (e) {
      throw new SafeFetchError('invalid_url', 'リダイレクト先の URL が不正です');
    }
    url = validateUrl(next);
  }
  throw new SafeFetchError('too_many_redirects', 'リダイレクトが多すぎます');
}

// CORS ヘッダー。ALLOWED_ORIGINS（カンマ区切り）が設定されていれば、その Origin のみ許可する
function corsHeaders(event) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = (event && event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  };
  if (allowed.length === 0) headers['Access-Control-Allow-Origin'] = '*';
  else if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

// SafeFetchError を利用者向けのレスポンスに変換する
function errorResponse(event, err) {
  const known = err instanceof SafeFetchError;
  const statusCode = known && ['invalid_url', 'blocked_url', 'blocked_address'].includes(err.code) ? 400 : 502;
  if (!known) console.error(err);
  return {
    statusCode,
    headers: corsHeaders(event),
    body: JSON.stringify({
      error: known ? err.code : 'internal',
      message: known ? err.message : '取得中にエラーが発生しました',
    }),
  };
}

module.exports = {
  safeFetch,
  validateUrl,
  isPublicAddress,
  corsHeaders,
  errorResponse,
  SafeFetchError,
};
