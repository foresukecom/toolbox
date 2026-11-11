// QRコード画面のロジック（DOM に依存しない純粋関数群）
// Node でもそのまま検証できるようにしてある。

export const ENCRYPTION_TYPES = ['WPA', 'WEP', 'nopass'];

// Wi-Fi 文字列の値をエスケープする（\ ; , : " の前にバックスラッシュ）
export function escapeWifiValue(value) {
  return String(value).replace(/([\\;,:"])/g, '\\$1');
}

// Wi-Fi 接続用の文字列を組み立てる
// 例: WIFI:T:WPA;S:MyHome;P:pass\;word;;
export function buildWifiString({ ssid, password = '', encryption = 'WPA', hidden = false }) {
  const parts = [];
  if (encryption !== 'nopass') parts.push(`T:${encryption}`);
  else parts.push('T:nopass');
  parts.push(`S:${escapeWifiValue(ssid)}`);
  if (encryption !== 'nopass' && password !== '') parts.push(`P:${escapeWifiValue(password)}`);
  if (hidden) parts.push('H:true');
  return `WIFI:${parts.join(';')};;`;
}

// Wi-Fi 文字列を分解する（読み取り結果の表示用）。Wi-Fi 形式でなければ null
export function parseWifiString(text) {
  if (!/^WIFI:/i.test(text)) return null;
  const body = text.slice(5);
  const fields = {};
  let key = '';
  let value = '';
  let readingKey = true;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (readingKey) {
      if (c === ':') readingKey = false;
      else if (c === ';') key = '';
      else key += c;
    } else if (c === '\\' && i + 1 < body.length) {
      value += body[++i];
    } else if (c === ';') {
      if (key) fields[key.toUpperCase()] = value;
      key = '';
      value = '';
      readingKey = true;
    } else {
      value += c;
    }
  }
  if (!readingKey && key) fields[key.toUpperCase()] = value;
  if (fields.S === undefined) return null;
  return {
    ssid: fields.S,
    password: fields.P ?? '',
    encryption: fields.T || 'nopass',
    hidden: (fields.H || '').toLowerCase() === 'true',
  };
}

// http(s) の URL かどうか（読み取り結果をリンクにするか判定）
export function isHttpUrl(text) {
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    new URL(text);
    return true;
  } catch (e) {
    return false;
  }
}

// 読み取ったバイト列を文字列にする。UTF-8 として不正なら Shift_JIS を試し、
// どちらも失敗したらデコーダーが返した文字列（fallback）を使う
export function decodeQrBytes(bytes, fallback = '') {
  if (!bytes || bytes.length === 0) return fallback;
  const data = Uint8Array.from(bytes);
  for (const encoding of ['utf-8', 'shift_jis']) {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(data);
    } catch (e) {
      // 次の文字コードを試す
    }
  }
  return fallback;
}

// 読み取り用に画像を縮小するときの寸法（長辺を maxSide 以下にする）
export function fitSize(width, height, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
