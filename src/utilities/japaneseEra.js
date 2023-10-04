import moment from "moment";
import japaneseErasData from "@/assets/japanese_eras.json";

export async function getJapaneseEras() {
  return japaneseErasData.map((era) => ({
    name: era.name,
    start: moment(era.start),
    end: era.end ? moment(era.end) : moment(),
  }));
}

export function formatJapaneseEra(era, date) {
  const eraStartDate = moment(era.start);
  const yearsSinceEraStart = date.year() - eraStartDate.year() + 1;
  const formattedDate = date.format('M月D日 H:mm:ss');

  return `${era.name}${yearsSinceEraStart}年 ${formattedDate}`;
}

export function formatDate(date, includeAD = false, includeJapaneseEra = false, includeAdEra = false, includeMonth = false, includeDay = false, includeWeekday = false, includeTime = false) {
  let dateArry = [];

  // 西暦を含める場合
  if (includeAD) {
    dateArry.push(Intl.DateTimeFormat("ja-JP", {year: "numeric"}).format(date));
  }

  // 和暦を含める場合
  if (includeJapaneseEra) {
    dateArry.push("("+Intl.DateTimeFormat("ja-JP-u-ca-japanese", {year: "numeric"}).format(date)+")");
  }

  // 西暦と和暦を含める場合
  if (includeAdEra) {
    dateArry.push(Intl.DateTimeFormat("ja-JP", {year: "numeric"}).format(date)) + " (" + Intl.DateTimeFormat("ja-JP-u-ca-japanese", {year: "numeric"}).format(date) + ")";
  }

  // 月を含める場合
  if (includeMonth) {
    dateArry.push(Intl.DateTimeFormat("ja-JP", {month: "long"}).format(date));
  }

  // 日を含める場合
  if (includeDay) {
    dateArry.push(Intl.DateTimeFormat("ja-JP", {day: "numeric"}).format(date));
  }

  // 曜日を含める場合
  if (includeWeekday) {
    dateArry.push(Intl.DateTimeFormat("ja-JP", {weekday: "long"}).format(date));
  }

  // 時間を含める場合
  if (includeTime) {
    dateArry.push(Intl.DateTimeFormat("ja-JP", {hour: "numeric", minute: "numeric", second: "numeric"}).format(date));
  }

  return dateArry.join(" ");
}
