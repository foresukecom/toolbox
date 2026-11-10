// 単位変換（速度・角度・圧力・エネルギー）の換算表と変換ロジック（DOM に依存しない純粋関数群）
// 各単位の factor は「その単位 1 つが基準単位いくつ分か」を表す。
// 係数は可能な限り定義値（正確な値）を使い、出典となる定義をコメントに残している。

// ---------------------------------------------------------
// 速度（基準: m/s）
// ---------------------------------------------------------
// マッハ数の基準にする音速: 国際標準大気（ISA）海面・15℃ での値（定義値ではなく大気モデルからの計算値）
export const SPEED_OF_SOUND_SEA_LEVEL = 340.294;
// 真空中の光速: SI 定義値（1983 年のメートルの定義）
export const SPEED_OF_LIGHT = 299792458;

export const speedUnits = [
  { name: 'm/s', reading: 'メートル毎秒', remark: '基本単位', factor: 1 },
  // 1 km/h = 1000 m / 3600 s
  { name: 'km/h', reading: 'キロメートル毎時', remark: '1 km/h = 1000/3600 m/s', factor: 1000 / 3600 },
  { name: 'km/s', reading: 'キロメートル毎秒', remark: '1 km/s = 1000 m/s', factor: 1000 },
  // 国際マイル: 1 mi = 1609.344 m（1959 年国際ヤード・ポンド協定）
  { name: 'mph', reading: 'マイル毎時', remark: '1 mph = 1609.344 m/h', factor: 1609.344 / 3600 },
  // 国際海里: 1 nmi = 1852 m（1929 年国際水路会議）
  { name: 'kn', reading: 'ノット', remark: '1 kn = 1852 m/h（海里毎時）', factor: 1852 / 3600 },
  // 国際フィート: 1 ft = 0.3048 m
  { name: 'ft/s', reading: 'フィート毎秒', remark: '1 ft/s = 0.3048 m/s', factor: 0.3048 },
  {
    name: 'Mach',
    reading: 'マッハ',
    remark: `海面・15℃ の音速 ${SPEED_OF_SOUND_SEA_LEVEL} m/s 基準`,
    factor: SPEED_OF_SOUND_SEA_LEVEL
  },
  { name: 'c', reading: '光速比', remark: `c = ${SPEED_OF_LIGHT} m/s（定義値）`, factor: SPEED_OF_LIGHT }
];

// ---------------------------------------------------------
// 角度（基準: 度）
// ---------------------------------------------------------
export const angleUnits = [
  { name: '°', reading: '度', remark: '基本単位（1 回転 = 360°）', factor: 1 },
  // 1 rad = 180/π 度
  { name: 'rad', reading: 'ラジアン', remark: 'π rad = 180°', factor: 180 / Math.PI },
  // 1 回転 = 400 grad → 1 grad = 0.9°
  { name: 'grad', reading: 'グラード', remark: '1 回転 = 400 grad（1 grad = 0.9°）', factor: 0.9 },
  { name: '′', reading: '分（角度）', remark: '1° = 60′', factor: 1 / 60 },
  { name: '″', reading: '秒（角度）', remark: '1′ = 60″', factor: 1 / 3600 },
  { name: 'turn', reading: '回転', remark: '1 回転 = 360° = 2π rad', factor: 360 }
];

// ---------------------------------------------------------
// 圧力（基準: Pa）
// ---------------------------------------------------------
// 標準重力加速度 g_n = 9.80665 m/s²（第 3 回 CGPM 1901 の定義値）
const STANDARD_GRAVITY = 9.80665;
// 国際ポンド: 1 lb = 0.45359237 kg、1 in = 0.0254 m
const POUND_FORCE = 0.45359237 * STANDARD_GRAVITY;

export const pressureUnits = [
  { name: 'Pa', reading: 'パスカル', remark: '基本単位（1 Pa = 1 N/m²）', factor: 1 },
  { name: 'hPa', reading: 'ヘクトパスカル', remark: '1 hPa = 100 Pa', factor: 100 },
  { name: 'kPa', reading: 'キロパスカル', remark: '1 kPa = 1000 Pa', factor: 1e3 },
  { name: 'MPa', reading: 'メガパスカル', remark: '1 MPa = 10⁶ Pa', factor: 1e6 },
  // 1 bar = 10⁵ Pa（定義値）
  { name: 'bar', reading: 'バール', remark: '1 bar = 100000 Pa', factor: 1e5 },
  // 標準気圧: 1 atm = 101325 Pa（第 10 回 CGPM 1954 の定義値）
  { name: 'atm', reading: '標準気圧', remark: '1 atm = 101325 Pa', factor: 101325 },
  // 慣用の水銀柱ミリメートル: 13.5951 g/cm³ × g_n × 1 mm = 133.322387415 Pa（定義値）
  { name: 'mmHg', reading: '水銀柱ミリメートル', remark: '1 mmHg = 133.322387415 Pa', factor: 133.322387415 },
  // 1 psi = 1 lbf/in²
  { name: 'psi', reading: '重量ポンド毎平方インチ', remark: '1 psi = 1 lbf/in² ≒ 6894.757 Pa', factor: POUND_FORCE / (0.0254 * 0.0254) },
  // 1 kgf/cm² = 9.80665 N / 10⁻⁴ m²
  { name: 'kgf/cm²', reading: '重量キログラム毎平方センチメートル', remark: '1 kgf/cm² = 98066.5 Pa', factor: STANDARD_GRAVITY * 1e4 }
];

// ---------------------------------------------------------
// エネルギー（基準: J）
// ---------------------------------------------------------
export const energyUnits = [
  { name: 'J', reading: 'ジュール', remark: '基本単位（1 J = 1 N·m = 1 W·s）', factor: 1 },
  { name: 'kJ', reading: 'キロジュール', remark: '1 kJ = 1000 J', factor: 1e3 },
  { name: 'MJ', reading: 'メガジュール', remark: '1 MJ = 10⁶ J', factor: 1e6 },
  // 熱化学カロリー: 1 cal = 4.184 J（日本の計量法・栄養表示で使うカロリー）
  { name: 'cal', reading: 'カロリー', remark: '1 cal = 4.184 J（熱化学カロリー）', factor: 4.184 },
  { name: 'kcal', reading: 'キロカロリー', remark: '1 kcal = 4184 J', factor: 4184 },
  { name: 'Wh', reading: 'ワット時', remark: '1 Wh = 3600 J', factor: 3600 },
  { name: 'kWh', reading: 'キロワット時', remark: '1 kWh = 3.6 MJ', factor: 3.6e6 },
  // 電子ボルト: 電気素量 e = 1.602176634×10⁻¹⁹ C（2019 年 SI 定義値）
  { name: 'eV', reading: '電子ボルト', remark: '1 eV = 1.602176634×10⁻¹⁹ J', factor: 1.602176634e-19 },
  // 国際蒸気表 BTU: 1 BTU_IT = 1055.05585262 J（1 cal_IT = 4.1868 J から導かれる定義値）
  { name: 'BTU', reading: '英熱量', remark: '1 BTU = 1055.05585262 J（国際蒸気表）', factor: 1055.05585262 }
];

// ---------------------------------------------------------
// 共通処理
// ---------------------------------------------------------

// value [from] を [to] に変換する。units は上の換算表のいずれか
export function convert(value, from, to, units) {
  const f = units.find(u => u.name === from);
  const t = units.find(u => u.name === to);
  if (!f || !t) return NaN;
  if (from === to) return value;
  return (value * f.factor) / t.factor;
}

// 既存の単位変換画面と同じ表示形式（有効 7 桁、極端な値は指数表記）
export function formatNumber(n) {
  if (!isFinite(n)) return String(n);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e9 || abs < 1e-4) return n.toExponential(6);
  return Number(n.toPrecision(7)).toString();
}

// 度（10 進）を度分秒表記にする。秒は小数第 secDigits 位で丸め、繰り上がりも処理する
export function formatDms(deg, secDigits = 2) {
  if (!isFinite(deg)) return '';
  const sign = deg < 0 ? '-' : '';
  const scale = Math.pow(10, secDigits);
  // 秒単位の整数（× scale）に丸めてから分解すると 59.999…″ のような表示にならない
  const totalSec = Math.round(Math.abs(deg) * 3600 * scale);
  const d = Math.floor(totalSec / (3600 * scale));
  const m = Math.floor((totalSec - d * 3600 * scale) / (60 * scale));
  const s = (totalSec - d * 3600 * scale - m * 60 * scale) / scale;
  const sText = Number(s.toFixed(secDigits)).toString();
  if (totalSec === 0) return '0°0′0″';
  return `${sign}${d}°${m}′${sText}″`;
}

// 度分秒表記の文字列を度（10 進）にする。解釈できなければ NaN
// 受け付ける例: 35°41′22.5″ / 35°41'22.5" / 35 41 22.5 / 35d41m22.5s / -135:30
export function parseDms(text) {
  if (typeof text !== 'string') return NaN;
  const s = text.trim();
  if (!s) return NaN;
  // 数字・小数点・区切り記号・空白以外が含まれていたら不正
  if (!/^[-+]?[\d.\s°º'′’"″”:dmsDMS]+$/.test(s)) return NaN;
  const nums = s.match(/\d+(?:\.\d+)?|\.\d+/g);
  if (!nums || nums.length > 3) return NaN;
  const [d, m = 0, sec = 0] = nums.map(Number);
  // 分・秒は 60 未満、度以外に小数を持てるのは最後の要素だけ
  if (m >= 60 || sec >= 60) return NaN;
  if (nums.length >= 2 && !Number.isInteger(d)) return NaN;
  if (nums.length === 3 && !Number.isInteger(m)) return NaN;
  const value = d + m / 60 + sec / 3600;
  return s.startsWith('-') ? -value : value;
}
