<template>
  <div class="dev-tool cat-dev">
    <!-- 入力 -->
    <section class="mb-6">
      <label for="cron-input" class="block text-sm font-bold mb-1">cron 式</label>
      <input
        id="cron-input"
        v-model="expression"
        type="text"
        spellcheck="false"
        autocomplete="off"
        placeholder="例: 0 9 * * 1-5"
        class="cron-input w-full border rounded-md px-3 py-2 text-lg"
      />
      <p v-if="parsed.error" class="text-red-600 text-sm mt-1">{{ parsed.error }}</p>

      <div class="flex flex-wrap gap-2 mt-3">
        <button
          v-for="preset in presets"
          :key="preset.expr"
          type="button"
          class="preset-btn text-sm rounded-md px-3 py-1"
          :class="{ active: expression.trim() === preset.expr }"
          @click="expression = preset.expr"
        >
          {{ preset.label }}
          <code class="ml-1 opacity-75">{{ preset.expr }}</code>
        </button>
      </div>
    </section>

    <template v-if="parsed.ok">
      <!-- 説明文 -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-1">
          <h2 class="text-sm font-bold">説明</h2>
          <CopyButton :textToCopy="description" />
        </div>
        <p class="description text-xl font-bold">{{ description }}</p>
        <p v-if="parsed.macro" class="text-sm text-gray-600 mt-1">
          マクロ <code>{{ parsed.macro }}</code> は <code>{{ parsed.normalized }}</code> として解釈しています。
        </p>
        <p v-if="parsed.hasSeconds" class="text-sm text-gray-600 mt-1">
          6フィールドの式のため、先頭を「秒」として解釈しています。
        </p>
        <p v-if="bothDaySpecified" class="text-sm text-gray-600 mt-1">
          「日」と「曜日」の両方が指定されているため、どちらかに一致すれば実行されます（OR 条件）。
        </p>
      </section>

      <!-- フィールド分解表 -->
      <section class="mb-6">
        <h2 class="text-sm font-bold mb-1">フィールド分解</h2>
        <table class="field-table w-full text-sm">
          <thead>
            <tr>
              <th>フィールド</th>
              <th>値</th>
              <th>意味</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in fieldRows" :key="row.key">
              <td>{{ row.label }}</td>
              <td><code>{{ row.value }}</code></td>
              <td>{{ row.meaning }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 次回実行日時 -->
      <section class="mb-6">
        <div class="flex flex-wrap items-center gap-3 mb-2">
          <h2 class="text-sm font-bold">次回実行日時（直近{{ runCount }}件）</h2>
          <div class="flex gap-1">
            <button
              v-for="tz in timezones"
              :key="tz.value"
              type="button"
              class="tz-btn text-sm rounded-md px-3 py-1"
              :class="{ active: timezone === tz.value }"
              @click="timezone = tz.value"
            >
              {{ tz.label }}
            </button>
          </div>
          <button type="button" class="text-sm underline" @click="baseTime = new Date()">
            今を基準に再計算
          </button>
          <CopyButton :textToCopy="nextRunsText" />
        </div>
        <p class="text-xs text-gray-600 mb-2">
          式を <strong>{{ timezoneLabel }}</strong> として解釈 / 基準時刻: {{ formatDate(baseTime, 'Asia/Tokyo') }} (JST)
        </p>

        <div
          v-if="timezone === 'UTC'"
          class="gha-note text-sm rounded-md p-3 mb-3"
        >
          <p>
            GitHub Actions の <code>schedule</code> は <strong>UTC</strong> で解釈されます。
            JST 9:00 に動かしたいなら <code>0 0 * * *</code> のように、JST から 9 時間引いた時刻を書きます。
          </p>
          <p v-if="ghaHint" class="mt-1">{{ ghaHint }}</p>
        </div>

        <p v-if="nextRuns.error" class="text-red-600 text-sm">{{ nextRuns.error }}</p>
        <table v-else class="field-table w-full text-sm">
          <thead>
            <tr>
              <th>#</th>
              <th :class="{ primary: timezone === 'Asia/Tokyo' }">JST (Asia/Tokyo)</th>
              <th :class="{ primary: timezone === 'UTC' }">UTC</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(run, i) in nextRuns.items" :key="i">
              <td>{{ i + 1 }}</td>
              <td class="mono" :class="{ primary: timezone === 'Asia/Tokyo' }">{{ run.jst }}</td>
              <td class="mono" :class="{ primary: timezone === 'UTC' }">{{ run.utc }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<script>
import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue';
import 'cronstrue/locales/ja';
import CopyButton from '@/components/CopyButton.vue';

const MACROS = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

const FIELD_DEFS = {
  second: { label: '秒', unit: '秒' },
  minute: { label: '分', unit: '分' },
  hour: { label: '時', unit: '時間' },
  dayOfMonth: { label: '日', unit: '日' },
  month: { label: '月', unit: 'か月' },
  dayOfWeek: { label: '曜日', unit: '曜日' },
};

const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土', '日'];
const DOW_ALIASES = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const MONTH_ALIASES = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const RUN_COUNT = 10;
const formatters = {};

function getFormatter(timeZone) {
  if (!formatters[timeZone]) {
    formatters[timeZone] = new Intl.DateTimeFormat('ja-JP', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  }
  return formatters[timeZone];
}

// 単一の値を人間向けの表記にする
function valueLabel(key, raw) {
  const upper = String(raw).toUpperCase();
  if (key === 'dayOfWeek') {
    const n = upper in DOW_ALIASES ? DOW_ALIASES[upper] : Number(upper);
    return Number.isInteger(n) && n >= 0 && n <= 7 ? `${DOW_NAMES[n]}曜` : raw;
  }
  if (key === 'month') {
    const n = upper in MONTH_ALIASES ? MONTH_ALIASES[upper] : Number(upper);
    return Number.isInteger(n) ? `${n}月` : raw;
  }
  const suffix = { second: '秒', minute: '分', hour: '時', dayOfMonth: '日' }[key];
  return /^\d+$/.test(upper) ? `${Number(upper)}${suffix}` : raw;
}

function describePart(key, part) {
  const unit = FIELD_DEFS[key].unit;
  if (part === '*' || part === '?') return key === 'dayOfWeek' ? 'すべての曜日' : `毎${FIELD_DEFS[key].label}`;
  if (part === 'L') return key === 'dayOfMonth' ? '月末日' : '最終';
  if (/^L-\d+$/.test(part)) return `月末日の${part.slice(2)}日前`;
  if (/^\d+W$/.test(part)) return `${part.slice(0, -1)}日に最も近い平日`;
  if (/^\w+L$/.test(part) && key === 'dayOfWeek') return `月の最終${valueLabel(key, part.slice(0, -1))}`;
  if (/^\w+#\d$/.test(part) && key === 'dayOfWeek') {
    const [d, nth] = part.split('#');
    return `第${nth}${valueLabel(key, d)}`;
  }

  const [range, step] = part.split('/');
  let rangeText;
  if (range === '*') {
    rangeText = '';
  } else if (range.includes('-')) {
    const [a, b] = range.split('-');
    rangeText = `${valueLabel(key, a)}〜${valueLabel(key, b)}`;
  } else {
    rangeText = valueLabel(key, range);
  }

  if (step !== undefined) {
    if (!rangeText) return `${step}${unit}ごと`;
    if (!range.includes('-')) return `${rangeText}から${step}${unit}ごと`;
    return `${rangeText}の間で${step}${unit}ごと`;
  }
  return rangeText;
}

function describeField(key, value) {
  return value.split(',').map((p) => describePart(key, p)).join('、');
}

export default {
  name: 'CronExplainer',
  components: { CopyButton },
  data() {
    return {
      expression: '0 9 * * 1-5',
      timezone: 'Asia/Tokyo',
      baseTime: new Date(),
      runCount: RUN_COUNT,
      timezones: [
        { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
        { value: 'UTC', label: 'UTC' },
      ],
      presets: [
        { label: '毎分', expr: '* * * * *' },
        { label: '毎時0分', expr: '0 * * * *' },
        { label: '毎日0時', expr: '0 0 * * *' },
        { label: '平日9時', expr: '0 9 * * 1-5' },
        { label: '毎月1日', expr: '0 0 1 * *' },
        { label: '15分ごと', expr: '*/15 * * * *' },
      ],
    };
  },
  computed: {
    // 入力を正規化して構文チェックまで行う
    parsed() {
      const input = this.expression.trim();
      if (!input) return { ok: false, error: '' };

      const macroKey = input.toLowerCase();
      const macro = MACROS[macroKey] ? macroKey : null;
      if (input.startsWith('@') && !macro) {
        return { ok: false, error: `未対応のマクロです: ${input}（対応: ${Object.keys(MACROS).join(' / ')}）` };
      }
      const normalized = macro ? MACROS[macro] : input.split(/\s+/).join(' ');
      const parts = normalized.split(' ');
      if (parts.length !== 5 && parts.length !== 6) {
        return {
          ok: false,
          error: `フィールド数が ${parts.length} 個です。5個（分 時 日 月 曜日）または 6個（秒 分 時 日 月 曜日）で指定してください。`,
        };
      }

      try {
        CronExpressionParser.parse(normalized);
      } catch (e) {
        return { ok: false, error: `不正な cron 式です: ${(e && e.message) || String(e)}` };
      }

      const hasSeconds = parts.length === 6;
      const keys = hasSeconds
        ? ['second', 'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
        : ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];
      const fields = {};
      keys.forEach((k, i) => {
        fields[k] = parts[i];
      });
      return { ok: true, error: '', normalized, macro, hasSeconds, keys, fields };
    },
    description() {
      if (!this.parsed.ok) return '';
      try {
        return cronstrue.toString(this.parsed.normalized, { locale: 'ja', use24HourTimeFormat: true });
      } catch (e) {
        return '（説明文を生成できませんでした）';
      }
    },
    fieldRows() {
      if (!this.parsed.ok) return [];
      return this.parsed.keys.map((key) => ({
        key,
        label: FIELD_DEFS[key].label,
        value: this.parsed.fields[key],
        meaning: describeField(key, this.parsed.fields[key]),
      }));
    },
    bothDaySpecified() {
      if (!this.parsed.ok) return false;
      const { dayOfMonth, dayOfWeek } = this.parsed.fields;
      const isAll = (v) => v === '*' || v === '?';
      return !isAll(dayOfMonth) && !isAll(dayOfWeek);
    },
    timezoneLabel() {
      return this.timezone === 'UTC' ? 'UTC' : 'JST (Asia/Tokyo)';
    },
    nextRuns() {
      if (!this.parsed.ok) return { items: [], error: '' };
      try {
        const interval = CronExpressionParser.parse(this.parsed.normalized, {
          tz: this.timezone,
          currentDate: this.baseTime,
        });
        const items = [];
        for (let i = 0; i < RUN_COUNT && interval.hasNext(); i++) {
          const date = interval.next().toDate();
          items.push({
            jst: this.formatDate(date, 'Asia/Tokyo'),
            utc: this.formatDate(date, 'UTC'),
          });
        }
        return { items, error: items.length ? '' : '該当する実行日時がありません。' };
      } catch (e) {
        return { items: [], error: `次回実行日時を計算できませんでした: ${(e && e.message) || String(e)}` };
      }
    },
    nextRunsText() {
      return this.nextRuns.items.map((r) => `${r.jst} JST / ${r.utc} UTC`).join('\n');
    },
    // UTC 選択時、時刻が単純な指定なら JST との対応を具体的に示す
    ghaHint() {
      if (!this.parsed.ok) return '';
      const { minute, hour, dayOfMonth, month, dayOfWeek } = this.parsed.fields;
      if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour)) return '';
      const m = String(Number(minute)).padStart(2, '0');
      const h = Number(hour);
      const jstHour = (h + 9) % 24;
      const utcHourForJst = (h + 15) % 24;
      const crossesDay = h + 9 >= 24 || h - 9 < 0;
      const restrictedDay = dayOfMonth !== '*' || month !== '*' || !['*', '?'].includes(dayOfWeek);
      let text = `この式は UTC ${h}:${m} = JST ${jstHour}:${m} に実行されます。`;
      if (!restrictedDay) {
        const sec = this.parsed.hasSeconds ? `${this.parsed.fields.second} ` : '';
        text += ` JST ${h}:${m} に実行したい場合は ${sec}${Number(minute)} ${utcHourForJst} * * * です。`;
      } else if (crossesDay) {
        text += ' 日付をまたぐため、日・曜日の指定も1日ずれる点に注意してください。';
      }
      return text;
    },
  },
  methods: {
    formatDate(date, timeZone) {
      const parts = {};
      getFormatter(timeZone)
        .formatToParts(date)
        .forEach((p) => {
          parts[p.type] = p.value;
        });
      const time = `${parts.hour}:${parts.minute}${this.parsed.hasSeconds ? `:${parts.second}` : ''}`;
      return `${parts.year}-${parts.month}-${parts.day} (${parts.weekday}) ${time}`;
    },
  },
};
</script>

<style scoped>
.cron-input,
code,
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.cron-input:focus {
  outline: 2px solid var(--tb-main);
  outline-offset: -1px;
}

.preset-btn,
.tz-btn {
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  background: transparent;
}

.preset-btn:hover,
.tz-btn:hover,
.preset-btn.active,
.tz-btn.active {
  background: var(--tb-main);
  color: #fff;
}

.description {
  border-left: 4px solid var(--tb-main);
  padding-left: 0.75rem;
}

.field-table th,
.field-table td {
  border: 1px solid #e5e7eb;
  padding: 0.35rem 0.6rem;
  text-align: left;
}

.field-table th {
  background: #f9fafb;
}

.field-table .primary {
  font-weight: bold;
  color: var(--tb-main);
}

.gha-note {
  border: 1px solid var(--tb-main);
  background: rgba(22, 160, 133, 0.08);
}
</style>
