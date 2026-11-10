/* global BigInt */
// サブネット計算のロジック（DOM に依存しない純粋関数群）
// IPv4 / IPv6 ともアドレスを BigInt で扱い、ビット幅（32 / 128）だけを切り替えて共通の計算をする。

const MAX_SPLIT_ROWS = 256;

// ---- IPv4 ----

// "192.168.1.10" → 3232235786n。不正なら null
export function parseIPv4(str) {
  const parts = str.split('.');
  if (parts.length !== 4) return null;
  let value = 0n;
  for (const p of parts) {
    // 先頭ゼロ（"010" など）は 8 進数と紛らわしいので受け付けない
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    value = (value << 8n) | BigInt(n);
  }
  return value;
}

export function formatIPv4(value) {
  const octets = [];
  for (let i = 3; i >= 0; i--) {
    octets.push(Number((value >> BigInt(i * 8)) & 0xffn));
  }
  return octets.join('.');
}

// ---- IPv6 ----

// "2001:db8::1" → BigInt。末尾の IPv4 埋め込み表記（::ffff:192.0.2.1）にも対応。不正なら null
export function parseIPv6(str) {
  let s = str.toLowerCase();
  if (s.includes('%')) return null; // ゾーン ID は非対応
  let tail = [];
  const lastColon = s.lastIndexOf(':');
  if (s.slice(lastColon + 1).includes('.')) {
    const v4 = parseIPv4(s.slice(lastColon + 1));
    if (v4 === null) return null;
    tail = [Number(v4 >> 16n).toString(16), Number(v4 & 0xffffn).toString(16)];
    s = s.slice(0, lastColon + 1) + 'x'; // 位置合わせ用のダミー
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const toGroups = (h) => (h === '' ? [] : h.split(':'));
  let head = toGroups(halves[0]);
  let rest = halves.length === 2 ? toGroups(halves[1]) : [];
  // ダミーを IPv4 由来の 2 グループに置き換える
  const replaceDummy = (groups) => (groups[groups.length - 1] === 'x' ? [...groups.slice(0, -1), ...tail] : groups);
  if (halves.length === 2) rest = replaceDummy(rest);
  else head = replaceDummy(head);
  let groups;
  if (halves.length === 2) {
    const missing = 8 - head.length - rest.length;
    if (missing < 1) return null;
    groups = [...head, ...Array(missing).fill('0'), ...rest];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  let value = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    value = (value << 16n) | BigInt(parseInt(g, 16));
  }
  return value;
}

function ipv6Groups(value) {
  const groups = [];
  for (let i = 7; i >= 0; i--) {
    groups.push(Number((value >> BigInt(i * 16)) & 0xffffn));
  }
  return groups;
}

// RFC 5952 形式（小文字・最長の 0 の連続（2 グループ以上）を :: に、同じ長さなら先頭側）
export function formatIPv6(value) {
  const groups = ipv6Groups(value);
  let bestStart = -1;
  let bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (groups[i] !== 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && groups[j] === 0) j++;
    if (j - i > bestLen) {
      bestStart = i;
      bestLen = j - i;
    }
    i = j;
  }
  const hex = groups.map((g) => g.toString(16));
  if (bestLen < 2) return hex.join(':');
  return `${hex.slice(0, bestStart).join(':')}::${hex.slice(bestStart + bestLen).join(':')}`;
}

export function expandIPv6(value) {
  return ipv6Groups(value)
    .map((g) => g.toString(16).padStart(4, '0'))
    .join(':');
}

// ---- 共通 ----

export function formatAddress(value, version) {
  return version === 4 ? formatIPv4(value) : formatIPv6(value);
}

export function parseAddress(str) {
  const s = str.trim();
  if (s.includes(':')) {
    const v = parseIPv6(s);
    return v === null ? null : { value: v, version: 6 };
  }
  const v = parseIPv4(s);
  return v === null ? null : { value: v, version: 4 };
}

function bitsOf(version) {
  return version === 4 ? 32 : 128;
}

export function prefixToMask(prefix, bits) {
  const all = (1n << BigInt(bits)) - 1n;
  return (all << BigInt(bits - prefix)) & all;
}

// サブネットマスク（IPv4）→ プレフィックス長。1 が連続していなければ null
export function maskToPrefix(mask) {
  const inverted = ~mask & 0xffffffffn;
  if ((inverted & (inverted + 1n)) !== 0n) return null;
  return inverted === 0n ? 32 : 32 - inverted.toString(2).length;
}

// 入力文字列を解釈する。
// 受け付ける形式: "192.168.1.10/24"、"192.168.1.10/255.255.255.0"、"192.168.1.10 255.255.255.0"、
// "2001:db8::1/64"、プレフィックス省略（/32・/128 として扱う）
export function parseNetworkInput(raw) {
  const s = raw.trim();
  if (s === '') return { error: null, empty: true };
  const m = s.match(/^([^\s/]+)\s*(?:\/\s*|\s+)?([^\s/]*)$/);
  if (!m) return { error: '形式が正しくありません（例: 192.168.1.10/24）' };
  const addr = parseAddress(m[1]);
  if (!addr) return { error: `アドレスとして解釈できません: ${m[1]}` };
  const bits = bitsOf(addr.version);
  let prefix = bits;
  const p = m[2];
  if (p !== '') {
    if (/^\d{1,3}$/.test(p)) {
      prefix = Number(p);
      if (prefix > bits) return { error: `プレフィックス長は 0〜${bits} で指定してください` };
    } else if (addr.version === 4 && p.includes('.')) {
      const mask = parseIPv4(p);
      if (mask === null) return { error: `サブネットマスクとして解釈できません: ${p}` };
      prefix = maskToPrefix(mask);
      if (prefix === null) return { error: 'サブネットマスクの 1 のビットが連続していません' };
    } else {
      return { error: `プレフィックス長またはサブネットマスクとして解釈できません: ${p}` };
    }
  }
  return { error: null, address: addr.value, version: addr.version, prefix };
}

// 基本情報を計算する
export function subnetInfo(address, prefix, version) {
  const bits = bitsOf(version);
  const mask = prefixToMask(prefix, bits);
  const all = (1n << BigInt(bits)) - 1n;
  const wildcard = ~mask & all;
  const network = address & mask;
  const last = network | wildcard;
  const total = 1n << BigInt(bits - prefix);
  let firstHost;
  let lastHost;
  let usable;
  let broadcast = null;
  if (version === 6) {
    // IPv6 にブロードキャストは無い。全アドレスを範囲として示す
    firstHost = network;
    lastHost = last;
    usable = total;
  } else if (prefix >= 31) {
    // /31 は RFC 3021 のポイントツーポイント（2 アドレスとも使える）、/32 は単一ホスト
    firstHost = network;
    lastHost = last;
    usable = total;
  } else {
    broadcast = last;
    firstHost = network + 1n;
    lastHost = last - 1n;
    usable = total - 2n;
  }
  return { bits, mask, wildcard, network, last, broadcast, firstHost, lastHost, total, usable };
}

// IPv4 のクラス（クラスフル時代の区分）
export function ipv4Class(address) {
  const first = Number(address >> 24n);
  if (first < 128) return 'A';
  if (first < 192) return 'B';
  if (first < 224) return 'C';
  if (first < 240) return 'D（マルチキャスト）';
  return 'E（予約）';
}

// 特殊用途アドレス（IANA Special-Purpose Address Registry などから主要なもの）
const SPECIAL_V4 = [
  ['0.0.0.0/8', '「このネットワーク」（RFC 791）'],
  ['10.0.0.0/8', 'プライベート（RFC 1918）'],
  ['100.64.0.0/10', 'キャリアグレード NAT 共有アドレス（RFC 6598）'],
  ['127.0.0.0/8', 'ループバック（RFC 1122）'],
  ['169.254.0.0/16', 'リンクローカル（RFC 3927）'],
  ['172.16.0.0/12', 'プライベート（RFC 1918）'],
  ['192.0.0.0/24', 'IETF プロトコル割り当て（RFC 6890）'],
  ['192.0.2.0/24', 'ドキュメント用 TEST-NET-1（RFC 5737）'],
  ['192.88.99.0/24', '6to4 リレーエニーキャスト（廃止, RFC 7526）'],
  ['192.168.0.0/16', 'プライベート（RFC 1918）'],
  ['198.18.0.0/15', 'ベンチマーク用（RFC 2544）'],
  ['198.51.100.0/24', 'ドキュメント用 TEST-NET-2（RFC 5737）'],
  ['203.0.113.0/24', 'ドキュメント用 TEST-NET-3（RFC 5737）'],
  ['224.0.0.0/4', 'マルチキャスト（RFC 5771）'],
  ['240.0.0.0/4', '将来のための予約（RFC 1112）'],
  ['255.255.255.255/32', 'リミテッドブロードキャスト（RFC 919）'],
];

const SPECIAL_V6 = [
  ['::/128', '未指定アドレス（RFC 4291）'],
  ['::1/128', 'ループバック（RFC 4291）'],
  ['::ffff:0:0/96', 'IPv4 射影アドレス（RFC 4291）'],
  ['64:ff9b::/96', 'IPv4/IPv6 変換（RFC 6052）'],
  ['100::/64', '破棄専用（RFC 6666）'],
  ['2001::/32', 'Teredo（RFC 4380）'],
  ['2001:db8::/32', 'ドキュメント用（RFC 3849）'],
  ['2002::/16', '6to4（RFC 3056）'],
  ['fc00::/7', 'ユニークローカル（RFC 4193）'],
  ['fe80::/10', 'リンクローカル（RFC 4291）'],
  ['ff00::/8', 'マルチキャスト（RFC 4291）'],
];

function compileRanges(list) {
  return list.map(([cidr, label]) => {
    const r = parseNetworkInput(cidr);
    return { cidr, label, network: r.address, prefix: r.prefix, version: r.version };
  });
}

let compiled = null;

// アドレスが該当する特殊用途をすべて返す（より狭い範囲を先に）。該当なしなら空配列
export function specialUses(address, version) {
  if (!compiled) compiled = { 4: compileRanges(SPECIAL_V4), 6: compileRanges(SPECIAL_V6) };
  return compiled[version]
    .filter((r) => contains(r.network, r.prefix, version, address))
    .sort((a, b) => b.prefix - a.prefix)
    .map((r) => ({ cidr: r.cidr, label: r.label }));
}

// 用途の要約（プライベート / グローバルなど）
export function addressScope(address, version) {
  const uses = specialUses(address, version);
  if (uses.length > 0) return uses[0].label;
  if (version === 6 && address >> 125n === 1n) return 'グローバルユニキャスト（2000::/3）';
  return version === 4 ? 'グローバル（パブリック）' : '未割り当て・その他';
}

// address が network/prefix に含まれるか
export function contains(network, prefix, version, address) {
  const mask = prefixToMask(prefix, bitsOf(version));
  return (address & mask) === (network & mask);
}

// network/prefix を newPrefix に分割する。先頭 limit 件と総数を返す
export function splitSubnets(network, prefix, version, newPrefix, limit = MAX_SPLIT_ROWS) {
  const bits = bitsOf(version);
  if (newPrefix < prefix || newPrefix > bits) return null;
  const base = network & prefixToMask(prefix, bits);
  const count = 1n << BigInt(newPrefix - prefix);
  const step = 1n << BigInt(bits - newPrefix);
  const rows = [];
  const n = count < BigInt(limit) ? Number(count) : limit;
  for (let i = 0; i < n; i++) {
    const net = base + BigInt(i) * step;
    rows.push({ index: i + 1, network: net, ...subnetInfo(net, newPrefix, version) });
  }
  return { count, rows };
}

// 2 進数表示用: 8 ビット（IPv6 は 16 ビット）ごとのグループに分け、各ビットがネットワーク部かを付ける
export function binaryGroups(value, prefix, version) {
  const bits = bitsOf(version);
  const groupSize = version === 4 ? 8 : 16;
  const str = value.toString(2).padStart(bits, '0');
  const groups = [];
  for (let i = 0; i < bits; i += groupSize) {
    groups.push(
      str
        .slice(i, i + groupSize)
        .split('')
        .map((c, j) => ({ bit: c, network: i + j < prefix })),
    );
  }
  return groups;
}

// 3 桁区切り（大きな数は 2^n も併記できるように文字列で返す）
export function formatCount(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
