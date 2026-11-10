// 全角 ⇔ 半角変換のロジック（DOM に依存しない純粋関数群）
// 対象（英字 / 数字 / 記号 / スペース / カタカナ）を個別に選べるよう、NFKC ではなく自前のテーブルで変換する。
// 入力は「変換の単位」に区切り、単位ごとに変換前後を segments として返す（差分ハイライト用）。

// 半角カナ（U+FF61〜U+FF9F）と全角の対応。句読点・長音もカタカナ扱い
const HALF_KANA = '｡｢｣､･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ';
const FULL_KANA = '。「」、・ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン゛゜';

// 濁点・半濁点付きの全角カナ → 半角の基底文字（ﾞ / ﾟ を後ろに付ける）
const DAKUTEN_BASE = {
  ガ: 'ｶ', ギ: 'ｷ', グ: 'ｸ', ゲ: 'ｹ', ゴ: 'ｺ',
  ザ: 'ｻ', ジ: 'ｼ', ズ: 'ｽ', ゼ: 'ｾ', ゾ: 'ｿ',
  ダ: 'ﾀ', ヂ: 'ﾁ', ヅ: 'ﾂ', デ: 'ﾃ', ド: 'ﾄ',
  バ: 'ﾊ', ビ: 'ﾋ', ブ: 'ﾌ', ベ: 'ﾍ', ボ: 'ﾎ',
  ヴ: 'ｳ', ヷ: 'ﾜ', ヺ: 'ｦ',
};
const HANDAKUTEN_BASE = { パ: 'ﾊ', ピ: 'ﾋ', プ: 'ﾌ', ペ: 'ﾍ', ポ: 'ﾎ' };

const HALF_TO_FULL = {};
const FULL_TO_HALF = {};
for (let i = 0; i < HALF_KANA.length; i++) {
  HALF_TO_FULL[HALF_KANA[i]] = FULL_KANA[i];
  FULL_TO_HALF[FULL_KANA[i]] = HALF_KANA[i];
}
// 合成用の結合文字（U+3099 / U+309A）も半角の濁点・半濁点にする
FULL_TO_HALF['\u3099'] = 'ﾞ';
FULL_TO_HALF['\u309A'] = 'ﾟ';
for (const [full, base] of Object.entries(DAKUTEN_BASE)) {
  HALF_TO_FULL[base + 'ﾞ'] = full;
  FULL_TO_HALF[full] = base + 'ﾞ';
}
for (const [full, base] of Object.entries(HANDAKUTEN_BASE)) {
  HALF_TO_FULL[base + 'ﾟ'] = full;
  FULL_TO_HALF[full] = base + 'ﾟ';
}

// 「記号」のうち特別扱いするもの（全角 → 半角）。表示用の注記にも使う
const SPECIAL_SYMBOLS = { '￥': '¥' };

// 変換対象として表示する注記（どれを変換し、どれを変換しないか）
export const SYMBOL_NOTES = [
  { chars: '～ ⇔ ~', rule: '全角チルダ（U+FF5E）と半角チルダを相互変換。波ダッシュ「〜」（U+301C）は変換しません。' },
  { chars: '－ ⇔ -', rule: '全角ハイフンマイナス（U+FF0D）と半角を相互変換。「―」（U+2015）「‐」（U+2010）「−」（U+2212）は変換しません。' },
  { chars: 'ー ⇔ ｰ', rule: '長音符はカタカナとして扱います（「記号」ではなく「カタカナ」で変換）。' },
  { chars: '＂ ⇔ "\u3000＇ ⇔ \'', rule: '全角の引用符（U+FF02 / U+FF07）は相互変換。「” “ ’ ‘」（曲がった引用符）は変換しません。' },
  { chars: '￥ ⇔ ¥', rule: '全角円記号（U+FFE5）は半角円記号「¥」（U+00A5）にします。バックスラッシュ「\\」は「＼」（U+FF3C）と相互変換します。' },
  { chars: '。「」、・', rule: '句読点・かぎ括弧・中黒は半角カナ（｡｢｣､･）と対応するため「カタカナ」で変換します。' },
  { chars: 'ヵ ヶ ヮ ヰ ヱ', rule: '半角カナに対応する文字がないため変換しません。ひらがなも半角にはなりません。' },
];

// ASCII 印字可能文字（U+0021〜U+007E）の種別
function asciiKind(code) {
  if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) return 'alpha';
  if (code >= 0x30 && code <= 0x39) return 'digit';
  return 'symbol';
}

// 入力を変換の単位に区切る。
// 半角カナ＋ﾞ/ﾟ（合成できる組み合わせのみ）と、全角かな＋結合濁点（U+3099 / U+309A）は 1 単位にまとめる
export function splitUnits(text) {
  const chars = Array.from(text);
  const units = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];
    if (next !== undefined) {
      if ((next === 'ﾞ' || next === 'ﾟ') && HALF_TO_FULL[ch + next]) {
        units.push(ch + next);
        i++;
        continue;
      }
      if ((next === '\u3099' || next === '\u309A') && /[ぁ-ヺ]/.test(ch)) {
        units.push(ch + next);
        i++;
        continue;
      }
    }
    units.push(ch);
  }
  return units;
}

// 1 単位を半角にする
function unitToHalf(unit, targets) {
  if (unit.length === 1) {
    const code = unit.charCodeAt(0);
    if (code === 0x3000) return targets.space ? ' ' : unit;
    if (code >= 0xff01 && code <= 0xff5e) {
      const half = code - 0xfee0;
      return targets[asciiKind(half)] ? String.fromCharCode(half) : unit;
    }
    if (SPECIAL_SYMBOLS[unit]) return targets.symbol ? SPECIAL_SYMBOLS[unit] : unit;
  }
  if (targets.kana) {
    if (FULL_TO_HALF[unit]) return FULL_TO_HALF[unit];
    // カ + U+3099 のような分解形
    const base = unit[0];
    const mark = unit[1];
    if (mark && FULL_TO_HALF[mark]) {
      const composed = unit.normalize('NFC');
      if (FULL_TO_HALF[composed]) return FULL_TO_HALF[composed];
      if (FULL_TO_HALF[base]) return FULL_TO_HALF[base] + FULL_TO_HALF[mark];
    }
  }
  return unit;
}

// 1 単位を全角にする
function unitToFull(unit, targets) {
  if (unit.length === 1) {
    const code = unit.charCodeAt(0);
    if (code === 0x20) return targets.space ? '\u3000' : unit;
    if (code >= 0x21 && code <= 0x7e) {
      return targets[asciiKind(code)] ? String.fromCharCode(code + 0xfee0) : unit;
    }
    if (unit === '¥') return targets.symbol ? '￥' : unit;
  }
  if (targets.kana) {
    if (HALF_TO_FULL[unit]) return HALF_TO_FULL[unit];
    // 全角かな + 結合濁点は合成済みの 1 文字にそろえる
    if (unit.length === 2 && (unit[1] === '\u3099' || unit[1] === '\u309A')) {
      return unit.normalize('NFC');
    }
  }
  return unit;
}

// ひらがな → カタカナ（ゝゞ → ヽヾ も含む）
function hiraToKata(unit) {
  return unit.replace(/[ぁ-ゖゝゞ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

// カタカナ → ひらがな。半角カナ（句読点類を除く）はいったん全角にしてから変換する
function kataToHira(unit) {
  let s = unit;
  if (s[0] >= '\uFF66' && s[0] <= '\uFF9D' && HALF_TO_FULL[s]) s = HALF_TO_FULL[s];
  return s.replace(/[ァ-ヶヽヾ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// テキストを変換し、単位ごとの変換前後を返す
// options: { direction: 'toHalf' | 'toFull', targets: { alpha, digit, symbol, space, kana }, kana: 'none' | 'hiraToKata' | 'kataToHira' }
export function convertSegments(text, options) {
  const { direction, targets, kana = 'none' } = options;
  const units = splitUnits(text);
  const segments = new Array(units.length);
  for (let i = 0; i < units.length; i++) {
    const src = units[i];
    let dst = src;
    // ひらがな ⇔ カタカナを先に行い、そのあと幅を変換する
    if (kana === 'hiraToKata') dst = hiraToKata(dst);
    else if (kana === 'kataToHira') dst = kataToHira(dst);
    dst = direction === 'toHalf' ? unitToHalf(dst, targets) : unitToFull(dst, targets);
    segments[i] = { src, dst, changed: src !== dst };
  }
  return segments;
}

export function convert(text, options) {
  return convertSegments(text, options)
    .map((s) => s.dst)
    .join('');
}

export const ALL_TARGETS = { alpha: true, digit: true, symbol: true, space: true, kana: true };
