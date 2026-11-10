// 日付計算のための純粋関数群
// 日付は { y, m, d }（m は 1〜12）または「1970-01-01 からの通算日数（日番号）」で扱う。
// タイムゾーンや夏時間の影響を受けないよう、内部では UTC の Date だけを使う。

const MS_PER_DAY = 86400000;

export const MIN_YEAR = 1;
export const MAX_YEAR = 9999;

export const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y, m) {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

// 'YYYY-MM-DD' を { y, m, d } に変換する。不正な日付は null
export function parseDate(str) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || '').trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < MIN_YEAR || y > MAX_YEAR || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function formatISO({ y, m, d }) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// { y, m, d } → 日番号。Date.UTC は 0〜99 年を 1900 年代に読み替えるので setUTCFullYear を使う
export function toDayNumber({ y, m, d }) {
  const dt = new Date(0);
  dt.setUTCFullYear(y, m - 1, d);
  return Math.round(dt.getTime() / MS_PER_DAY);
}

export function fromDayNumber(n) {
  const dt = new Date(n * MS_PER_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// 0 = 日曜 〜 6 = 土曜
export function weekdayOf(n) {
  return new Date(n * MS_PER_DAY).getUTCDay();
}

export function isWeekend(n) {
  const w = weekdayOf(n);
  return w === 0 || w === 6;
}

export function inSupportedRange(n) {
  const { y } = fromDayNumber(n);
  return y >= MIN_YEAR && y <= MAX_YEAR;
}

// n か月後（負なら前）。日が存在しない場合はその月の末日に丸め、clamped を true にする
export function addMonths(date, n) {
  const total = date.y * 12 + (date.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = total - y * 12 + 1;
  const last = daysInMonth(y, m);
  return { date: { y, m, d: Math.min(date.d, last) }, clamped: date.d > last };
}

// a から b までの「○年○か月○日」。a <= b を前提とする。
// a に月数を足した日（月末は丸め）が b を超えない最大の月数を取り、残りを日数とする
export function diffYMD(a, b) {
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  const bn = toDayNumber(b);
  while (months > 0 && toDayNumber(addMonths(a, months).date) > bn) months--;
  const anchor = toDayNumber(addMonths(a, months).date);
  return { years: Math.floor(months / 12), months: months % 12, days: bn - anchor };
}

// 祝日データ（{ 'YYYY-MM-DD': 名前 }）を日番号 → 名前の Map に変換する
export function buildHolidayMap(holidays) {
  const map = new Map();
  if (!holidays) return map;
  for (const [iso, name] of Object.entries(holidays)) {
    const date = parseDate(iso);
    if (date) map.set(toDayNumber(date), name);
  }
  return map;
}

function isBusinessDay(n, holidayMap) {
  return !isWeekend(n) && !(holidayMap && holidayMap.has(n));
}

// 日番号 from〜to（両端を含む、from <= to）の営業日数。
// 土日は週単位でまとめて数え、祝日は平日に当たるものだけを差し引く
export function countBusinessDays(from, to, holidayMap = null) {
  if (from > to) return 0;
  const total = to - from + 1;
  const fullWeeks = Math.floor(total / 7);
  let count = fullWeeks * 5;
  for (let n = from + fullWeeks * 7; n <= to; n++) {
    if (!isWeekend(n)) count++;
  }
  if (holidayMap) {
    for (const n of holidayMap.keys()) {
      if (n >= from && n <= to && !isWeekend(n)) count--;
    }
  }
  return count;
}

// 期間内（両端を含む）の祝日一覧（土日に重なるものには onWeekend を付ける）
export function holidaysBetween(from, to, holidayMap) {
  const list = [];
  if (!holidayMap) return list;
  for (const [n, name] of holidayMap) {
    if (n >= from && n <= to) list.push({ n, name, onWeekend: isWeekend(n) });
  }
  return list.sort((x, y) => x.n - y.n);
}

export const MAX_BUSINESS_STEPS = 100000;

// 基準日から n 営業日後（負なら前）の日番号。基準日そのものは数えない
export function addBusinessDays(from, n, holidayMap = null) {
  const step = n < 0 ? -1 : 1;
  let remaining = Math.min(Math.abs(n), MAX_BUSINESS_STEPS);
  let cur = from;
  while (remaining > 0) {
    cur += step;
    if (isBusinessDay(cur, holidayMap)) remaining--;
  }
  return cur;
}

// 日番号 from〜to の各年のうち、covered（年の Set）に含まれない年の一覧
export function uncoveredYears(from, to, covered) {
  const lo = fromDayNumber(Math.min(from, to)).y;
  const hi = fromDayNumber(Math.max(from, to)).y;
  const list = [];
  for (let y = lo; y <= hi; y++) {
    if (!covered.has(y)) list.push(y);
  }
  return list;
}

// 祝日データに含まれる年の Set
export function coveredYearsOf(holidayMap) {
  const set = new Set();
  for (const n of holidayMap.keys()) set.add(fromDayNumber(n).y);
  return set;
}
