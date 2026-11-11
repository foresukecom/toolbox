// chmod のパーミッション変換ロジック（DOM に依存しない純粋関数群）
// モードは 0〜0o7777 の整数で扱う（上位 3 ビットが setuid / setgid / sticky）。

export const SETUID = 0o4000;
export const SETGID = 0o2000;
export const STICKY = 0o1000;
export const MAX_MODE = 0o7777;

// 所有者・グループ・その他の並び（shift は rwx 3 ビットの位置）
export const CLASSES = [
  { key: 'u', label: '所有者', en: 'Owner', shift: 6, special: SETUID, specialChar: 's' },
  { key: 'g', label: 'グループ', en: 'Group', shift: 3, special: SETGID, specialChar: 's' },
  { key: 'o', label: 'その他', en: 'Others', shift: 0, special: STICKY, specialChar: 't' },
];

export const PERMS = [
  { key: 'r', label: '読み取り', value: 4 },
  { key: 'w', label: '書き込み', value: 2 },
  { key: 'x', label: '実行', value: 1 },
];

// ls -l の先頭 1 文字（ファイル種別）
export const FILE_TYPES = {
  '-': '通常ファイル',
  d: 'ディレクトリ',
  l: 'シンボリックリンク',
  c: 'キャラクタデバイス',
  b: 'ブロックデバイス',
  p: '名前付きパイプ（FIFO）',
  s: 'ソケット',
  D: 'ドア（Solaris）',
};

// 8 進数表記。特殊ビットが無ければ 3 桁、あれば 4 桁
export function modeToOctal(mode, forceFourDigits = false) {
  const digits = forceFourDigits || mode > 0o777 ? 4 : 3;
  return mode.toString(8).padStart(digits, '0');
}

// 8 進数の文字列を解析する。先頭の 0o / 0 を許容し、1〜4 桁まで
export function parseOctal(text) {
  let s = String(text).trim();
  if (s === '') return { mode: null, error: null };
  if (/^0o/i.test(s)) s = s.slice(2);
  if (!/^[0-7]+$/.test(s)) {
    return { mode: null, error: '0〜7 の数字だけで入力してください' };
  }
  // 00755 のような先頭の余分な 0 は取り除いてから桁数を判定する
  const trimmed = s.replace(/^0+(?=\d)/, '');
  if (trimmed.length > 4) {
    return { mode: null, error: '8 進数は 4 桁（7777）までです' };
  }
  return { mode: parseInt(trimmed, 8), error: null };
}

// 記号表記（rwxr-xr-x の 9 文字）
export function modeToSymbolic(mode) {
  let out = '';
  for (const c of CLASSES) {
    const bits = (mode >> c.shift) & 7;
    const special = (mode & c.special) !== 0;
    out += bits & 4 ? 'r' : '-';
    out += bits & 2 ? 'w' : '-';
    if (special) {
      // 実行ビットがあれば小文字、なければ大文字
      out += bits & 1 ? c.specialChar : c.specialChar.toUpperCase();
    } else {
      out += bits & 1 ? 'x' : '-';
    }
  }
  return out;
}

// 記号表記 9 文字を解析する
export function parseSymbolic(text) {
  const s = String(text).trim();
  if (s === '') return { mode: null, error: null };
  if (s.length !== 9) {
    return { mode: null, error: '記号表記は 9 文字（例: rwxr-xr-x）で入力してください' };
  }
  let mode = 0;
  for (let i = 0; i < CLASSES.length; i++) {
    const c = CLASSES[i];
    const [r, w, x] = s.slice(i * 3, i * 3 + 3);
    if (r !== 'r' && r !== '-') return charError(i * 3, r, 'r か -');
    if (w !== 'w' && w !== '-') return charError(i * 3 + 1, w, 'w か -');
    let bits = (r === 'r' ? 4 : 0) | (w === 'w' ? 2 : 0);
    const sc = c.specialChar;
    if (x === 'x') bits |= 1;
    else if (x === sc) {
      bits |= 1;
      mode |= c.special;
    } else if (x === sc.toUpperCase()) mode |= c.special;
    else if (x !== '-') return charError(i * 3 + 2, x, `x / ${sc} / ${sc.toUpperCase()} / -`);
    mode |= bits << c.shift;
  }
  return { mode, error: null };
}

function charError(index, ch, expected) {
  return { mode: null, error: `${index + 1} 文字目の「${ch}」は不正です（${expected} のいずれか）` };
}

// chmod の記号モード（u=rwx,g=rx,o=rx）。特殊ビットは u=s / g=s / o=t で表す
export function modeToChmodSymbolic(mode) {
  return CLASSES.map((c) => {
    const bits = (mode >> c.shift) & 7;
    let perms = PERMS.filter((p) => bits & p.value)
      .map((p) => p.key)
      .join('');
    if (mode & c.special) perms += c.specialChar;
    return `${c.key}=${perms}`;
  }).join(',');
}

// ls -l の 1 行を解析する。先頭 10 文字（種別 + 9 文字）を読み、
// 後ろに付く ACL / 拡張属性 / SELinux の印（+ @ .）は無視する
export function parseLsLine(line) {
  const s = String(line).trim();
  if (s === '') return null;
  const m = s.match(/^(\S)(\S{9})([+@.]?)(?:\s+(.*))?$/);
  if (!m) {
    return { error: '先頭がパーミッション（例: -rwxr-xr-x）になっていません', line: s };
  }
  const [, typeChar, perm, marker, rest] = m;
  const type = FILE_TYPES[typeChar];
  if (!type) {
    return { error: `ファイル種別「${typeChar}」は不明です`, line: s };
  }
  const parsed = parseSymbolic(perm);
  if (parsed.error) return { error: parsed.error, line: s };
  return {
    error: null,
    line: s,
    typeChar,
    type,
    marker,
    mode: parsed.mode,
    name: rest ? extractName(rest) : '',
  };
}

// ls -l の残りの列（リンク数 所有者 グループ サイズ 日付 名前）から名前を取り出す
function extractName(rest) {
  // 月 日 時刻/年 の後ろが名前（"Nov 10 12:34 name" / "11月 10 12:34 name" / ISO 形式）
  const m =
    rest.match(/\s\S+\s+\d{1,2}日?\s+(?:\d{1,2}:\d{2}|\d{4}年?)\s+(.+)$/) ||
    rest.match(/\s\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:\s+[+-]\d{4})?)?\s+(.+)$/);
  return m ? m[1] : '';
}
