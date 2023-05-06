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
