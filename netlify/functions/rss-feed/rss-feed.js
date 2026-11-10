// RSS / Atom フィードの検索・取得（Issue #21）
//
//   GET /.netlify/functions/rss-feed?url=<URL>
//
// URL がフィードならそのまま解析し、HTML なら <link rel="alternate"> や定番のパスから
// フィードを探して解析する。外部 URL の取得は必ず safeFetch 経由で行い、応答は JSON のみ返す。

const { XMLParser } = require('fast-xml-parser');
const { parse: parseHtml } = require('node-html-parser');
const { safeFetch, corsHeaders, errorResponse, SafeFetchError } = require('../../lib/safe-fetch');

const ACCEPT = 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8';
const MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 4000;
// 関数全体の処理時間の上限（Netlify の同期関数は10秒でタイムアウトする）
const TOTAL_BUDGET_MS = 8000;
// 残り時間がこれより短ければ、次の取得は始めない
const MIN_FETCH_MS = 500;
const MAX_ITEMS = 50;
const MAX_SUMMARY = 300;
const MAX_TEXT = 500;
const MAX_DISCOVERED = 10;
const FALLBACK_PATHS = ['/feed', '/rss.xml', '/atom.xml', '/index.xml', '/feed.xml'];
const FEED_TYPES = {
  'application/rss+xml': 'rss',
  'application/atom+xml': 'atom',
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  htmlEntities: true,
  processEntities: {
    enabled: true,
    maxEntitySize: 1000,
    maxEntityCount: 100,
    maxExpandedLength: 100000,
  },
});

exports.handler = async function handler(event) {
  const started = Date.now();
  const headers = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod && event.httpMethod !== 'GET') {
    return json(405, headers, { error: 'method_not_allowed', message: 'GET のみ対応しています' });
  }

  const input = ((event.queryStringParameters || {}).url || '').trim();
  if (!input) {
    return json(400, headers, { error: 'missing_url', message: 'url を指定してください' });
  }

  const deadline = started + TOTAL_BUDGET_MS;
  try {
    const res = await fetchWithin(input, deadline);
    const text = decodeBody(res);

    // 入力がフィードそのもの
    if (!looksLikeHtml(res, text)) {
      const feed = parseFeed(text, res.url);
      if (feed) return json(200, headers, { source: res.url, discovered: [], feed });
      // XML 宣言付きの XHTML などは、HTML として探索を続ける
      if (!/<html[\s>]/i.test(text)) return notFeed(headers);
    }

    // HTML からフィードを探す
    let discovered = discoverFeeds(text, res.url);
    let feed = null;
    let feedError = null;

    if (discovered.length) {
      // 先頭から順に、解析できたものを採用する
      for (const candidate of discovered) {
        if (remaining(deadline) < MIN_FETCH_MS) break;
        try {
          feed = await fetchFeed(candidate.url, deadline);
          if (feed) break;
          feedError = { error: 'not_feed', message: 'フィードとして解釈できませんでした' };
        } catch (err) {
          feedError = toErrorBody(err);
        }
      }
    } else {
      // 見つからなければ、同じオリジンの定番パスを試す
      const origin = new URL(res.url).origin;
      for (const path of FALLBACK_PATHS) {
        if (remaining(deadline) < MIN_FETCH_MS) break;
        const url = origin + path;
        try {
          feed = await fetchFeed(url, deadline);
        } catch (err) {
          feed = null;
        }
        if (feed) {
          discovered = [{ title: feed.title, url: feed.url, type: feed.type }];
          break;
        }
      }
    }

    if (!feed && !discovered.length) return notFeed(headers);

    const body = { source: res.url, discovered, feed };
    // 候補はあったが取得できなかった場合は、候補を選び直せるように 200 で返す
    if (!feed) body.feedError = feedError || { error: 'not_feed', message: 'フィードとして解釈できませんでした' };
    return json(200, headers, body);
  } catch (err) {
    return errorResponse(event, err);
  }
};

function json(statusCode, headers, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function notFeed(headers) {
  return json(422, headers, { error: 'not_feed', message: 'フィードが見つかりませんでした' });
}

function toErrorBody(err) {
  if (err instanceof SafeFetchError) return { error: err.code, message: err.message };
  console.error(err);
  return { error: 'internal', message: '取得中にエラーが発生しました' };
}

function remaining(deadline) {
  return deadline - Date.now();
}

function fetchWithin(url, deadline) {
  const timeoutMs = Math.min(FETCH_TIMEOUT_MS, remaining(deadline));
  if (timeoutMs < MIN_FETCH_MS) {
    return Promise.reject(new SafeFetchError('timeout', '処理時間の上限に達しました'));
  }
  return safeFetch(url, { accept: ACCEPT, maxBytes: MAX_BYTES, timeoutMs });
}

async function fetchFeed(url, deadline) {
  const res = await fetchWithin(url, deadline);
  const text = decodeBody(res);
  if (looksLikeHtml(res, text)) return null;
  return parseFeed(text, res.url);
}

// ---- 文字コード -------------------------------------------------------------

function decodeBody(res) {
  const body = res.body;
  // BOM
  if (body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf) return decode(body.subarray(3), 'utf-8');
  if (body[0] === 0xfe && body[1] === 0xff) return decode(body.subarray(2), 'utf-16be');
  if (body[0] === 0xff && body[1] === 0xfe) return decode(body.subarray(2), 'utf-16le');

  const contentType = String(res.headers['content-type'] || '');
  const fromHeader = contentType.match(/charset\s*=\s*["']?([\w-]+)/i);
  // 先頭部分だけ ASCII として見て、XML 宣言 / meta の charset を探す
  const head = body.subarray(0, 1024).toString('latin1');
  const fromBody = head.match(/<\?xml[^>]*encoding\s*=\s*["']([\w-]+)["']/i)
    || head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i);
  const charset = (fromHeader && fromHeader[1]) || (fromBody && fromBody[1]) || 'utf-8';
  return decode(body, charset);
}

function decode(buf, charset) {
  try {
    return new TextDecoder(charset).decode(buf);
  } catch (e) {
    return new TextDecoder('utf-8').decode(buf);
  }
}

function looksLikeHtml(res, text) {
  const head = text.slice(0, 2048).replace(/^\s+/, '');
  if (/^<\?xml/i.test(head)) return false;
  if (/^(<!--[\s\S]*?-->\s*)*<(rss|feed|rdf:RDF)[\s>]/i.test(head)) return false;
  const contentType = String(res.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('html')) return true;
  return /<html[\s>]|<!doctype html/i.test(head);
}

// ---- フィードの検索 ---------------------------------------------------------

function discoverFeeds(html, baseUrl) {
  let root;
  try {
    root = parseHtml(html, { blockTextElements: { script: false, style: false } });
  } catch (e) {
    return [];
  }
  const seen = new Set();
  const results = [];
  for (const link of root.querySelectorAll('link')) {
    const rel = (link.getAttribute('rel') || '').toLowerCase().split(/\s+/);
    const type = FEED_TYPES[(link.getAttribute('type') || '').toLowerCase().trim()];
    if (!rel.includes('alternate') || !type) continue;
    const url = toHttpUrl(link.getAttribute('href'), baseUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    results.push({ title: truncate(clean(link.getAttribute('title') || ''), MAX_TEXT) || null, url, type });
    if (results.length >= MAX_DISCOVERED) break;
  }
  return results;
}

// ---- XML の解析 -------------------------------------------------------------

function parseFeed(xml, feedUrl) {
  let doc;
  try {
    // DOCTYPE の内部サブセット（独自エンティティ）は使わないので取り除く
    doc = xmlParser.parse(xml.replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/i, ''));
  } catch (e) {
    return null;
  }
  if (!doc || typeof doc !== 'object') return null;
  if (doc.rss) return parseRss2(doc.rss, feedUrl);
  if (doc['rdf:RDF']) return parseRdf(doc['rdf:RDF'], feedUrl);
  if (doc.feed) return parseAtom(doc.feed, feedUrl);
  return null;
}

function parseRss2(rss, feedUrl) {
  const channel = first(rss.channel);
  if (!channel || typeof channel !== 'object') return null;
  const siteUrl = toHttpUrl(rssLink(channel.link), feedUrl);
  const base = siteUrl || feedUrl;
  return {
    url: feedUrl,
    type: 'rss',
    title: limitText(channel.title),
    siteUrl,
    description: limitText(channel.description),
    updated: toIso(text(channel.lastBuildDate) || text(channel.pubDate) || text(channel['dc:date'])),
    items: toArray(channel.item).slice(0, MAX_ITEMS).map((item) => ({
      title: limitText(item.title),
      link: toHttpUrl(rssLink(item.link) || permalinkGuid(item.guid), base),
      published: toIso(text(item.pubDate) || text(item['dc:date'])),
      author: limitText(item.author || item['dc:creator']),
      summary: summarize(item.description || item['content:encoded']),
    })),
  };
}

function parseRdf(rdf, feedUrl) {
  const channel = first(rdf.channel) || {};
  const siteUrl = toHttpUrl(text(channel.link), feedUrl);
  const base = siteUrl || feedUrl;
  // RSS 1.0 では item は channel の外（rdf:RDF 直下）にある
  return {
    url: feedUrl,
    type: 'rdf',
    title: limitText(channel.title),
    siteUrl,
    description: limitText(channel.description),
    updated: toIso(text(channel['dc:date'])),
    items: toArray(rdf.item).slice(0, MAX_ITEMS).map((item) => ({
      title: limitText(item.title),
      link: toHttpUrl(text(item.link) || attr(item, 'rdf:about'), base),
      published: toIso(text(item['dc:date'])),
      author: limitText(item['dc:creator']),
      summary: summarize(item.description || item['content:encoded']),
    })),
  };
}

function parseAtom(feed, feedUrl) {
  if (typeof feed !== 'object') return null;
  const siteUrl = toHttpUrl(atomLink(feed.link), feedUrl);
  const base = siteUrl || feedUrl;
  return {
    url: feedUrl,
    type: 'atom',
    title: limitText(feed.title),
    siteUrl,
    description: limitText(feed.subtitle),
    updated: toIso(text(feed.updated)),
    items: toArray(feed.entry).slice(0, MAX_ITEMS).map((entry) => ({
      title: limitText(entry.title),
      link: toHttpUrl(atomLink(entry.link), base),
      published: toIso(text(entry.published) || text(entry.updated)),
      author: limitText(toArray(entry.author).map((a) => text(a && typeof a === 'object' ? a.name : a)).filter(Boolean).join(', ')),
      summary: summarize(entry.summary || entry.content),
    })),
  };
}

// RSS 2.0 の <link> は atom:link と並ぶことがあるので、文字列のものを採用する
function rssLink(value) {
  for (const v of toArray(value)) {
    const t = text(v);
    if (t) return t;
    if (v && typeof v === 'object' && v['@_href']) return v['@_href'];
  }
  return '';
}

function permalinkGuid(guid) {
  const g = first(guid);
  if (!g) return '';
  if (typeof g === 'object' && String(g['@_isPermaLink']).toLowerCase() === 'false') return '';
  return text(g);
}

// Atom の <link>: rel が alternate（または省略）のものを優先する
function atomLink(value) {
  const links = toArray(value).filter((l) => l && typeof l === 'object' && l['@_href']);
  const alt = links.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate');
  return (alt || links[0] || {})['@_href'] || '';
}

// ---- 値の整形 ---------------------------------------------------------------

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function first(value) {
  return toArray(value)[0];
}

function attr(node, name) {
  return node && typeof node === 'object' ? node[`@_${name}`] || '' : '';
}

// 要素の中身を文字列にする（属性付きの要素や、xhtml の入れ子にも対応）
function text(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    return Object.keys(value)
      .filter((k) => !k.startsWith('@_'))
      .map((k) => text(value[k]))
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

function clean(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function truncate(s, max) {
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : s;
}

// タイトル等: HTML が入っていることがあるので、タグを除いて短くする
function limitText(value) {
  const s = stripHtml(text(value));
  return s ? truncate(s, MAX_TEXT) : null;
}

function summarize(value) {
  const s = stripHtml(text(value));
  return s ? truncate(s, MAX_SUMMARY) : null;
}

function stripHtml(s) {
  if (!s) return '';
  if (!/[<&]/.test(s)) return clean(s);
  try {
    const root = parseHtml(s, { blockTextElements: { script: false, style: false, noscript: false } });
    return clean(root.text);
  } catch (e) {
    return clean(s.replace(/<[^>]*>/g, ' '));
  }
}

function toHttpUrl(href, base) {
  const s = text(href);
  if (!s) return null;
  try {
    const url = new URL(s, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch (e) {
    return null;
  }
}

const TZ_ABBR = { JST: '+0900', KST: '+0900', UT: '+0000', Z: '+0000' };

function toIso(value) {
  const s = text(value);
  if (!s) return null;
  let time = Date.parse(s);
  if (Number.isNaN(time)) {
    // Date.parse が解釈できないタイムゾーン略称を数値に置き換えて再試行
    const replaced = s.replace(/\b(JST|KST|UT|Z)$/i, (m) => TZ_ABBR[m.toUpperCase()]);
    time = Date.parse(replaced);
  }
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}
