<template>
  <div class="dev-tool cat-date">
    <div class="dc-tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.value"
        type="button"
        role="tab"
        :aria-selected="tab === t.value"
        :class="['dc-tab', { 'dc-tab-active': tab === t.value }]"
        @click="tab = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 日付の差 -->
    <div v-if="tab === 'diff'" class="dc-panel">
      <section class="mb-6">
        <div class="dc-inputs">
          <div class="dc-field">
            <label class="block font-bold mb-1" for="dc-start">開始日</label>
            <div class="flex flex-wrap items-center gap-2">
              <input id="dc-start" v-model="startDate" type="date" min="0001-01-01" max="9999-12-31" class="border rounded-md p-2" />
              <input v-if="useTime" v-model="startTime" type="time" step="1" class="border rounded-md p-2" aria-label="開始時刻" />
              <button type="button" class="dc-btn" @click="startDate = todayISO()">今日</button>
            </div>
            <p v-if="startInfo" class="hint mt-1">{{ startInfo }}</p>
          </div>
          <div class="dc-swap">
            <button type="button" class="dc-btn" title="開始日と終了日を入れ替え" @click="swapDates">⇅ 入れ替え</button>
          </div>
          <div class="dc-field">
            <label class="block font-bold mb-1" for="dc-end">終了日</label>
            <div class="flex flex-wrap items-center gap-2">
              <input id="dc-end" v-model="endDate" type="date" min="0001-01-01" max="9999-12-31" class="border rounded-md p-2" />
              <input v-if="useTime" v-model="endTime" type="time" step="1" class="border rounded-md p-2" aria-label="終了時刻" />
              <button type="button" class="dc-btn" @click="endDate = todayISO()">今日</button>
            </div>
            <p v-if="endInfo" class="hint mt-1">{{ endInfo }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-2 mt-4">
          <label class="inline-flex items-center gap-1">
            <input v-model="useTime" type="checkbox" />
            時刻も指定する
          </label>
          <label class="inline-flex items-center gap-1">
            <input v-model="excludeHolidays" type="checkbox" />
            営業日から祝日を除く
          </label>
        </div>
      </section>

      <p v-if="!diffResult" class="error">開始日と終了日を正しく入力してください（西暦1〜9999年）。</p>
      <template v-else>
        <p v-if="diffResult.reversed" class="notice mb-3">終了日が開始日より前のため、期間を逆向きにして計算しています（差はマイナスで表示）。</p>
        <section class="mb-6">
          <table class="outputs">
            <tbody>
              <tr v-for="row in diffRows" :key="row.label">
                <th class="pr-4 text-left align-top">{{ row.label }}</th>
                <td class="pr-2">
                  <span class="font-bold">{{ row.value }}</span>
                  <span v-if="row.note" class="hint block">{{ row.note }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <p v-if="holidayNotice" class="notice mb-3">{{ holidayNotice }}</p>

        <section v-if="excludeHolidays && periodHolidays.length" class="mb-6">
          <h2 class="section-title">期間内の祝日（{{ periodHolidays.length }}件）</h2>
          <ul class="dc-holidays">
            <li v-for="h in periodHolidays" :key="h.n">
              <span class="font-mono">{{ h.label }}</span>
              {{ h.name }}
              <span v-if="h.onWeekend" class="hint">（土日と重なるため営業日数には影響なし）</span>
            </li>
          </ul>
        </section>
      </template>
    </div>

    <!-- 日付の加減算 -->
    <div v-else class="dc-panel">
      <section class="mb-6">
        <label class="block font-bold mb-1" for="dc-base">基準日</label>
        <div class="flex flex-wrap items-center gap-2">
          <input id="dc-base" v-model="baseDate" type="date" min="0001-01-01" max="9999-12-31" class="border rounded-md p-2" />
          <button type="button" class="dc-btn" @click="baseDate = todayISO()">今日</button>
        </div>
        <p v-if="baseInfo" class="hint mt-1">{{ baseInfo }}</p>

        <div class="flex flex-wrap items-center gap-2 mt-4">
          <select v-model="sign" class="border rounded-md p-2" aria-label="足す / 引く">
            <option value="1">＋（後）</option>
            <option value="-1">－（前）</option>
          </select>
          <input v-model.number="amount" type="number" min="0" step="1" class="border rounded-md p-2 w-28" aria-label="数" />
          <select v-model="unit" class="border rounded-md p-2" aria-label="単位">
            <option v-for="u in units" :key="u.value" :value="u.value">{{ u.label }}</option>
          </select>
        </div>
        <label v-if="unit === 'business'" class="inline-flex items-center gap-1 mt-3">
          <input v-model="excludeHolidays" type="checkbox" />
          祝日も休みとして扱う
        </label>
        <p class="hint mt-2">{{ unitHint }}</p>
      </section>

      <p v-if="addResult && addResult.error" class="error">{{ addResult.error }}</p>
      <section v-else-if="addResult" class="mb-6">
        <div class="dc-result">
          <div class="hint">{{ addResult.expression }}</div>
          <div class="dc-result-date">{{ addResult.dateLabel }}</div>
          <div>{{ addResult.wareki }}</div>
          <div class="hint mt-1">基準日から {{ addResult.daysLabel }}</div>
        </div>
        <p v-if="addResult.clampedNote" class="notice mt-3">{{ addResult.clampedNote }}</p>
        <p v-if="holidayNotice" class="notice mt-3">{{ holidayNotice }}</p>
      </section>
    </div>

    <p class="hint mt-6">
      祝日は <a href="https://holidays-jp.github.io/" target="_blank" rel="noopener" class="underline">holidays-jp</a>
      のデータ（祝日タイマーと同じ提供元。前年〜翌年分）を使います。
      <template v-if="holidayStatus === 'loading'">読み込み中…</template>
      <template v-else-if="holidayStatus === 'ok'">収録: {{ coveredRangeLabel }}</template>
    </p>
  </div>
</template>

<script>
import axios from 'axios';
import { formatDate } from '@/utilities/japaneseEra';
import {
  WEEKDAYS_JA,
  MAX_BUSINESS_STEPS,
  parseDate,
  formatISO,
  toDayNumber,
  fromDayNumber,
  weekdayOf,
  inSupportedRange,
  addMonths,
  diffYMD,
  buildHolidayMap,
  countBusinessDays,
  holidaysBetween,
  addBusinessDays,
  uncoveredYears,
  coveredYearsOf,
} from '@/utilities/dateCalc';

// 前年〜翌年の祝日をまとめて返すエンドポイント（年ごとの取得はしないので、入力した日付は送信されない）
const HOLIDAYS_URL = 'https://holidays-jp.github.io/api/v1/date.json';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseTime(str) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(str || '');
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] || 0);
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function num(n) {
  return n.toLocaleString('ja-JP');
}

export default {
  name: 'DateCalculator',
  data() {
    const today = todayISO();
    return {
      tabs: [
        { value: 'diff', label: '日付の差' },
        { value: 'add', label: '日付の加減算' },
      ],
      tab: 'diff',
      startDate: today,
      endDate: `${today.slice(0, 4)}-12-31`,
      useTime: false,
      startTime: '00:00:00',
      endTime: '00:00:00',
      excludeHolidays: true,
      baseDate: today,
      sign: '1',
      amount: 100,
      unit: 'day',
      units: [
        { value: 'day', label: '日' },
        { value: 'week', label: '週' },
        { value: 'month', label: 'か月' },
        { value: 'year', label: '年' },
        { value: 'business', label: '営業日' },
      ],
      holidayMap: new Map(),
      holidayStatus: 'loading',
      abortController: null,
    };
  },
  computed: {
    coveredYears() {
      return coveredYearsOf(this.holidayMap);
    },
    coveredRangeLabel() {
      const years = [...this.coveredYears].sort((a, b) => a - b);
      if (!years.length) return 'なし';
      return `${years[0]}年〜${years[years.length - 1]}年`;
    },
    activeHolidayMap() {
      return this.excludeHolidays ? this.holidayMap : null;
    },
    startInfo() {
      return this.dateInfo(this.startDate);
    },
    endInfo() {
      return this.dateInfo(this.endDate);
    },
    baseInfo() {
      return this.dateInfo(this.baseDate);
    },
    diffResult() {
      const a = parseDate(this.startDate);
      const b = parseDate(this.endDate);
      if (!a || !b) return null;
      let from = toDayNumber(a);
      let to = toDayNumber(b);
      let seconds = (to - from) * 86400;
      if (this.useTime) seconds += parseTime(this.endTime) - parseTime(this.startTime);
      const reversed = to < from;
      if (reversed) [from, to] = [to, from];
      const days = to - from;
      return {
        from,
        to,
        reversed,
        days,
        ymd: diffYMD(fromDayNumber(from), fromDayNumber(to)),
        business: countBusinessDays(from, to, this.activeHolidayMap),
        seconds,
      };
    },
    diffRows() {
      const r = this.diffResult;
      const s = r.reversed ? '-' : '';
      const rows = [
        { label: '日数（終了日を含まない）', value: `${s}${num(r.days)}日`, note: '例: 今日→明日 は 1日' },
        { label: '日数（終了日を含む）', value: `${s}${num(r.days + 1)}日`, note: '開始日と終了日の両方を数えます' },
        {
          label: '週数',
          value: `${s}${num(Math.floor(r.days / 7))}週${r.days % 7}日`,
          note: `${s}${(r.days / 7).toFixed(2)}週`,
        },
        {
          label: '年月日',
          value: `${s}${num(r.ymd.years)}年${r.ymd.months}か月${r.ymd.days}日`,
          note: '月末の日付は、足した先の月に同じ日が無ければ月末日として数えます',
        },
        {
          label: '営業日数',
          value: `${num(r.business)}日`,
          note: `開始日・終了日を含む期間の${this.excludeHolidays ? '土日・祝日' : '土日'}を除いた日数`,
        },
      ];
      if (this.useTime) {
        const sign = r.seconds < 0 ? '-' : '';
        const abs = Math.abs(r.seconds);
        const d = Math.floor(abs / 86400);
        const h = Math.floor((abs % 86400) / 3600);
        const m = Math.floor((abs % 3600) / 60);
        const sec = abs % 60;
        rows.push(
          { label: '経過時間', value: `${sign}${num(d)}日 ${h}時間 ${m}分 ${sec}秒`, note: 'タイムゾーン・夏時間は考慮しません' },
          { label: '時間', value: `${sign}${num(Math.floor(abs / 3600))}時間` },
          { label: '分', value: `${sign}${num(Math.floor(abs / 60))}分` },
          { label: '秒', value: `${sign}${num(abs)}秒` },
        );
      }
      return rows;
    },
    periodHolidays() {
      const r = this.diffResult;
      if (!r) return [];
      return holidaysBetween(r.from, r.to, this.holidayMap).map((h) => ({
        ...h,
        label: this.formatDayLabel(h.n),
      }));
    },
    amountValue() {
      const n = Number(this.amount);
      return Number.isInteger(n) && n >= 0 ? n : null;
    },
    unitHint() {
      if (this.unit === 'month' || this.unit === 'year') {
        return '月末の扱い: 足した先の月に同じ日が無い場合は月末日にします（例: 1/31 + 1か月 → 2/28、閏年は 2/29）。';
      }
      if (this.unit === 'business') {
        return `基準日は数えず、翌（前）営業日から数えます。土日${this.excludeHolidays ? 'と祝日' : ''}を休みとして飛ばします。`;
      }
      return '';
    },
    addResult() {
      const base = parseDate(this.baseDate);
      if (!base) return { error: '基準日を正しく入力してください（西暦1〜9999年）。' };
      const amount = this.amountValue;
      if (amount === null) return { error: '数は 0 以上の整数で入力してください。' };
      if (this.unit === 'business' && amount > MAX_BUSINESS_STEPS) {
        return { error: `営業日は ${num(MAX_BUSINESS_STEPS)} 日までにしてください。` };
      }
      const sign = Number(this.sign);
      const n = sign * amount;
      const baseN = toDayNumber(base);
      let resultN;
      let clampedNote = '';
      if (this.unit === 'day' || this.unit === 'week') {
        resultN = baseN + n * (this.unit === 'week' ? 7 : 1);
      } else if (this.unit === 'month' || this.unit === 'year') {
        const months = this.unit === 'year' ? n * 12 : n;
        const r = addMonths(base, months);
        if (r.date.y < 1 || r.date.y > 9999) return { error: '結果が西暦1〜9999年の範囲外です。' };
        resultN = toDayNumber(r.date);
        if (r.clamped) {
          clampedNote = `${r.date.y}年${r.date.m}月には${base.d}日が無いため、月末の${r.date.m}月${r.date.d}日にしています。`;
        }
      } else {
        // 範囲外の年まで進まないよう、おおよその上限を先に確認する
        const limit = baseN + sign * (Math.ceil(amount * 7 / 5) + 400);
        if (!inSupportedRange(limit)) return { error: '結果が西暦1〜9999年の範囲外です。' };
        resultN = addBusinessDays(baseN, n, this.activeHolidayMap);
      }
      if (!inSupportedRange(resultN)) return { error: '結果が西暦1〜9999年の範囲外です。' };
      const unitLabel = this.units.find((u) => u.value === this.unit).label;
      const diff = resultN - baseN;
      return {
        resultN,
        expression: `${this.formatDayLabel(baseN)} ${sign > 0 ? '＋' : '－'} ${num(amount)}${unitLabel}`,
        dateLabel: this.formatDayLabel(resultN),
        wareki: this.warekiOf(fromDayNumber(resultN)),
        daysLabel: diff === 0 ? '0日' : `${num(Math.abs(diff))}日${diff > 0 ? '後' : '前'}`,
        clampedNote,
      };
    },
    // 祝日データの範囲外の年を使っているときの注意
    holidayNotice() {
      if (!this.excludeHolidays) return '';
      let from;
      let to;
      if (this.tab === 'diff') {
        if (!this.diffResult) return '';
        ({ from, to } = this.diffResult);
      } else {
        if (this.unit !== 'business' || !this.addResult || this.addResult.error) return '';
        from = toDayNumber(parseDate(this.baseDate));
        to = this.addResult.resultN;
      }
      if (this.holidayStatus === 'loading') return '祝日データを読み込み中です。読み込み後に再計算します。';
      if (this.holidayStatus === 'error') return '祝日データを取得できなかったため、祝日は考慮せず土日のみを除いています。';
      const missing = uncoveredYears(from, to, this.coveredYears);
      if (!missing.length) return '';
      const label = missing.length > 3
        ? `${missing[0]}年〜${missing[missing.length - 1]}年のうち ${missing.length} 年分`
        : missing.map((y) => `${y}年`).join('・');
      return `${label}は祝日データ（${this.coveredRangeLabel}）の範囲外のため、その年の祝日は考慮していません（土日のみ除外）。`;
    },
  },
  methods: {
    todayISO,
    swapDates() {
      [this.startDate, this.endDate] = [this.endDate, this.startDate];
      [this.startTime, this.endTime] = [this.endTime, this.startTime];
    },
    // 和暦（既存の和暦ロジックで年を出す）。改暦前（明治5年以前）は旧暦のため表示しない
    warekiOf(date) {
      if (date.y < 1873) return '和暦: 明治6年（1873年）より前は対象外';
      const local = new Date(2000, date.m - 1, date.d);
      local.setFullYear(date.y);
      const year = formatDate(local, false, true).replace(/[()]/g, '');
      return `${year}${date.m}月${date.d}日`;
    },
    formatDayLabel(n) {
      const date = fromDayNumber(n);
      return `${formatISO(date).replace(/-/g, '/')}（${WEEKDAYS_JA[weekdayOf(n)]}）`;
    },
    dateInfo(iso) {
      const date = parseDate(iso);
      if (!date) return '';
      const n = toDayNumber(date);
      const holiday = this.holidayMap.get(n);
      return `${WEEKDAYS_JA[weekdayOf(n)]}曜日 / ${this.warekiOf(date)}${holiday ? ` / ${holiday}` : ''}`;
    },
    async fetchHolidays() {
      this.abortController = new AbortController();
      try {
        const response = await axios.get(HOLIDAYS_URL, { signal: this.abortController.signal });
        this.holidayMap = buildHolidayMap(response.data);
        this.holidayStatus = this.holidayMap.size ? 'ok' : 'error';
      } catch (e) {
        if (axios.isCancel(e)) return;
        this.holidayStatus = 'error';
      } finally {
        this.abortController = null;
      }
    },
  },
  mounted() {
    this.fetchHolidays();
  },
  beforeUnmount() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  },
};
</script>

<style scoped>
.dc-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid #d1d5db;
}

.dc-tab {
  padding: 0.5rem 1rem;
  color: #4b5563;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
  margin-bottom: -1px;
}

.dc-tab-active {
  color: var(--tb-main);
  font-weight: 700;
  border-color: #d1d5db;
  background-color: #fff;
}

.dc-panel {
  padding-top: 1.25rem;
}

.dc-inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
}

.dc-field {
  min-width: 0;
}

.dc-btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--tb-main);
  border-radius: 0.375rem;
  color: var(--tb-main);
  background: #fff;
  font-size: 0.875rem;
  white-space: nowrap;
}

.dc-btn:hover {
  background: var(--tb-main);
  color: #fff;
}

.outputs th,
.outputs td {
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid #f3f4f6;
}

.outputs th {
  font-weight: normal;
  color: #374151;
}

.section-title {
  font-weight: bold;
  font-size: 1.15rem;
  border-left: 4px solid var(--tb-main);
  padding-left: 0.5rem;
  margin-bottom: 1rem;
}

.dc-holidays li {
  padding: 0.2rem 0;
}

.dc-result {
  display: inline-block;
  max-width: 100%;
  padding: 1rem 1.25rem;
  border: 1px solid #e5e7eb;
  border-left: 4px solid var(--tb-main);
  border-radius: 0.375rem;
}

.dc-result-date {
  font-size: 1.5rem;
  font-weight: bold;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.notice {
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.error {
  color: #b91c1c;
}
</style>
