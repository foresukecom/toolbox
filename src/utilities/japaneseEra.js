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

export function formatDate(date, includeEra = false, includeTime = false) {
  let dateArry = [];
  dateArry.push(Intl.DateTimeFormat("ja-JP", {year: "numeric"}).format(date));
  if (includeEra) {
    dateArry.push("("+Intl.DateTimeFormat("ja-JP-u-ca-japanese", {year: "numeric"}).format(date)+")");
  }
  dateArry.push(Intl.DateTimeFormat("ja-JP", {month: "long", day: "numeric", weekday: "long"}).format(date));
  if (includeTime){
    dateArry.push(Intl.DateTimeFormat("ja-JP", {hour: "numeric", minute: "numeric", second: "numeric"}).format(date));
  }

  return dateArry.join(" ");
}
