// URL の分解・クエリの再構築ロジック（DOM に依存しない純粋関数群）
// ブラウザと Node の両方にある WHATWG URL API を使うので、Node でもそのまま検証できる。

// スキームの判定: "xxx://" 形式か、"//" を伴わない既知のスキーム
const HIERARCHICAL_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;
const OPAQUE_SCHEME = /^(mailto|tel|sms|data|urn|about|javascript|blob|news|file):/i;

// トラッキング系パラメータ（キーの完全一致、または utm_ などの接頭辞）
const TRACKING_PREFIXES = ['utm_', 'pk_', 'mtm_', 'hsa_', 'oly_'];
const TRACKING_KEYS = new Set([
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'twclid', 'ttclid',
  'igshid', 'li_fat_id', 'mc_cid', 'mc_eid', '_ga', '_gl', '_hsenc', '_hsmi', 'mkt_tok', 'vero_id',
  'srsltid', 'ref_src', 'ref_url',
]);

export function isTrackingKey(key) {
  const k = key.toLowerCase();
  return TRACKING_KEYS.has(k) || TRACKING_PREFIXES.some((p) => k.startsWith(p));
}

// 不正な % シーケンスがあっても落ちないデコード（デコードできない部分はそのまま残す）
export function safeDecode(s) {
  return s.replace(/(%[0-9a-fA-F]{2})+/g, (m) => {
    try {
      return decodeURIComponent(m);
    } catch (e) {
      // 途中までの有効な UTF-8 を拾うため 1 バイトずつ試す
      return m.replace(/%[0-9a-fA-F]{2}/g, (b) => {
        try {
          return decodeURIComponent(b);
        } catch (e2) {
          return b;
        }
      });
    }
  });
}

// クエリ（application/x-www-form-urlencoded 風）のデコード: + は空白として扱う
export function decodeQueryPart(s) {
  return safeDecode(s.replace(/\+/g, ' '));
}

// 編集されたクエリのキー・値のエンコード
export function encodeQueryPart(s) {
  return encodeURIComponent(s);
}

// 入力文字列を解釈する。スキームが無ければ https:// を補った候補を返す
// 戻り値: { url, error, needsScheme, supplemented }
export function parseUrl(raw) {
  const s = raw.trim();
  if (s === '') return { url: null, error: null, needsScheme: false, supplemented: null };

  const hasScheme = HIERARCHICAL_SCHEME.test(s) || OPAQUE_SCHEME.test(s);
  if (!hasScheme) {
    const candidate = 'https://' + s.replace(/^\/+/, '');
    try {
      const url = new URL(candidate);
      return { url, error: null, needsScheme: true, supplemented: candidate };
    } catch (e) {
      return { url: null, error: 'URL として解釈できません（スキームを補っても不正です）', needsScheme: false, supplemented: null };
    }
  }
  try {
    return { url: new URL(s), error: null, needsScheme: false, supplemented: null };
  } catch (e) {
    return { url: null, error: 'URL として解釈できません', needsScheme: false, supplemented: null };
  }
}

// url.search（先頭の ? を含む）をクエリ行の配列にする
// raw を保持しておき、編集されていない行は元の表記のまま再構築できるようにする
export function parseQuery(search) {
  const qs = search.startsWith('?') ? search.slice(1) : search;
  if (qs === '') return [];
  return qs.split('&').map((raw) => {
    const eq = raw.indexOf('=');
    const rawKey = eq < 0 ? raw : raw.slice(0, eq);
    const rawValue = eq < 0 ? '' : raw.slice(eq + 1);
    const key = decodeQueryPart(rawKey);
    const value = decodeQueryPart(rawValue);
    return { key, value, raw, origKey: key, origValue: value };
  });
}

// 1 行分のエンコード済み表記（編集されていなければ元の表記）
export function encodeQueryRow(row) {
  if (row.raw !== undefined && row.key === row.origKey && row.value === row.origValue) {
    return row.raw;
  }
  return encodeQueryPart(row.key) + '=' + encodeQueryPart(row.value);
}

// クエリ行の配列からクエリ文字列（? なし）を作る。新規の空行は無視する
export function buildQuery(rows) {
  return rows
    .filter((r) => r.raw !== undefined || r.key !== '' || r.value !== '')
    .map(encodeQueryRow)
    .join('&');
}

// 元の URL のクエリ部分だけを差し替えた URL を返す
// keepEmptyQuery: クエリが空のとき "?" を残すか（元の URL が "?" だけを持っていた場合）
export function rebuildUrl(url, rows, keepEmptyQuery = false) {
  const u = new URL(url.href);
  const hash = u.hash;
  u.hash = '';
  u.search = '';
  let href = u.href;
  // 元が "?#x" のように空クエリ＋フラグメントだと、hash を消した時点で末尾に残らないことがあるため除く
  if (href.endsWith('?')) href = href.slice(0, -1);
  const qs = buildQuery(rows);
  if (qs !== '' || keepEmptyQuery) href += '?' + qs;
  // 空のフラグメント（"#" だけ）も保持する
  if (hash !== '' || url.href.endsWith('#')) href += hash === '' ? '#' : hash;
  return href;
}

// 元の URL が空クエリ（"?" だけ）を持っているか
export function hasEmptyQuery(url) {
  if (url.search !== '') return false;
  const noHash = url.href.split('#')[0];
  return noHash.endsWith('?');
}

// パスをセグメントに分ける（"/a/b/" → ["a", "b", ""]）。不透明パス（mailto: など）は 1 つ
export function pathSegments(pathname) {
  if (!pathname.startsWith('/')) return [pathname];
  return pathname.slice(1).split('/');
}

// スキームごとの既定ポート
export const DEFAULT_PORTS = { 'http:': '80', 'https:': '443', 'ws:': '80', 'wss:': '443', 'ftp:': '21' };

// ---- Punycode（RFC 3492）のデコード: xn-- で始まるラベルを Unicode に戻す ----
const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;

function adapt(delta, numPoints, firstTime) {
  let d = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  d += Math.floor(d / numPoints);
  let k = 0;
  while (d > ((BASE - TMIN) * TMAX) >> 1) {
    d = Math.floor(d / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * d) / (d + SKEW));
}

function digitValue(c) {
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 22; // 0-9 → 26-35
  if (code >= 65 && code <= 90) return code - 65; // A-Z
  if (code >= 97 && code <= 122) return code - 97; // a-z
  return BASE;
}

// Punycode 文字列（xn-- を除いた部分）を Unicode に。不正なら null
export function punycodeDecode(input) {
  const output = [];
  const basicEnd = input.lastIndexOf('-');
  for (let j = 0; j < Math.max(basicEnd, 0); j++) {
    if (input.charCodeAt(j) >= 0x80) return null;
    output.push(input.charCodeAt(j));
  }
  let n = INITIAL_N;
  let bias = INITIAL_BIAS;
  let i = 0;
  for (let idx = basicEnd > 0 ? basicEnd + 1 : 0; idx < input.length; ) {
    const oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (idx >= input.length) return null;
      const digit = digitValue(input[idx++]);
      if (digit >= BASE) return null;
      i += digit * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    const len = output.length + 1;
    bias = adapt(i - oldi, len, oldi === 0);
    n += Math.floor(i / len);
    i %= len;
    if (n > 0x10ffff) return null;
    output.splice(i, 0, n);
    i++;
  }
  return String.fromCodePoint(...output);
}

// ホスト名を Unicode 表記にする（xn-- ラベルのみデコード）
export function hostToUnicode(hostname) {
  return hostname
    .split('.')
    .map((label) => {
      if (!label.toLowerCase().startsWith('xn--')) return label;
      const decoded = punycodeDecode(label.slice(4));
      return decoded === null ? label : decoded;
    })
    .join('.');
}

// URL 文字列のホスト部分だけを Unicode 表記に差し替える
export function hrefWithUnicodeHost(href, hostname) {
  const unicode = hostToUnicode(hostname);
  if (unicode === hostname || hostname === '') return href;
  const at = href.indexOf('//');
  if (at < 0) return href;
  // "scheme://[userinfo@]host" のホスト部分を置き換える
  const authStart = at + 2;
  const rest = href.slice(authStart);
  const authEnd = rest.search(/[/?#]/);
  const authority = authEnd < 0 ? rest : rest.slice(0, authEnd);
  const atSign = authority.lastIndexOf('@');
  const hostStart = authStart + (atSign < 0 ? 0 : atSign + 1);
  return href.slice(0, hostStart) + href.slice(hostStart).replace(hostname, unicode);
}
