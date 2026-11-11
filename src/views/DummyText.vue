<template>
  <div class="dev-tool cat-text">
    <section class="mb-6">
      <div class="dt-kinds" role="radiogroup" aria-label="生成する種類">
        <button
          v-for="k in kinds"
          :key="k.value"
          type="button"
          role="radio"
          :aria-checked="kind === k.value"
          :class="['dt-kind', { 'dt-kind-active': kind === k.value }]"
          @click="kind = k.value"
        >
          {{ k.label }}
        </button>
      </div>
    </section>

    <section class="mb-6">
      <template v-if="isText">
        <div class="flex flex-wrap gap-x-6 gap-y-2 mb-3">
          <label class="inline-flex items-center gap-1">
            <input v-model="mode" type="radio" value="chars" />
            文字数で指定
          </label>
          <label class="inline-flex items-center gap-1">
            <input v-model="mode" type="radio" value="sentences" />
            文数で指定
          </label>
        </div>

        <div class="flex flex-wrap items-end gap-4 mb-3">
          <div v-if="mode === 'chars'">
            <label for="dt-chars" class="dt-label">合計文字数</label>
            <input id="dt-chars" v-model.number="totalChars" type="number" min="1" :max="limits.chars" class="dt-input" />
          </div>
          <div v-else>
            <label for="dt-sentences" class="dt-label">1段落あたりの文数</label>
            <input id="dt-sentences" v-model.number="sentences" type="number" min="1" :max="limits.sentences" class="dt-input" />
          </div>
          <div>
            <label for="dt-paragraphs" class="dt-label">段落数</label>
            <input id="dt-paragraphs" v-model.number="paragraphs" type="number" min="1" :max="limits.paragraphs" class="dt-input" />
          </div>
          <div>
            <label for="dt-separator" class="dt-label">段落の区切り（テキスト）</label>
            <select id="dt-separator" v-model="separator" class="dt-select">
              <option v-for="s in separators" :key="s.label" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
        </div>

        <div class="flex flex-wrap gap-x-6 gap-y-2">
          <label class="inline-flex items-center gap-1">
            <input v-model="punctuation" type="checkbox" />
            句読点を入れる
          </label>
          <label v-if="kind === 'en'" class="inline-flex items-center gap-1">
            <input v-model="loremStart" type="checkbox" />
            「Lorem ipsum dolor sit amet…」で始める
          </label>
        </div>
        <p v-if="mode === 'chars'" class="hint mt-2">
          文字数は段落の区切り（改行）を除いた合計です。段落ごとにほぼ均等に配分し、最後の文は文字数に合わせて切り詰めます。
        </p>
      </template>

      <template v-else>
        <div class="flex flex-wrap items-end gap-4 mb-3">
          <div>
            <label for="dt-count" class="dt-label">件数</label>
            <input id="dt-count" v-model.number="count" type="number" min="1" :max="limits.count" class="dt-input" />
          </div>
        </div>
        <fieldset>
          <legend class="dt-label">項目</legend>
          <div class="flex flex-wrap gap-x-5 gap-y-2">
            <label v-for="f in personFields" :key="f.key" class="inline-flex items-center gap-1">
              <input v-model="fields" type="checkbox" :value="f.key" />
              {{ f.label }}
            </label>
          </div>
        </fieldset>
        <p class="hint mt-2">
          すべて架空のデータです。メールは予約ドメイン（example.com / .net / .org）、電話番号は 090・080・070-0000-xxxx、
          郵便番号は使われていない 000-xxxx、市区町村名は「ダミー市」などの架空の名前を使います。
        </p>
      </template>

      <p v-if="error" class="error mt-2">{{ error }}</p>
    </section>

    <section class="mb-6">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label for="dt-seed" class="dt-label">シード値（空欄ならランダム）</label>
          <input
            id="dt-seed"
            v-model="seedInput"
            type="text"
            class="dt-input dt-seed"
            placeholder="例: 1234"
            spellcheck="false"
            autocomplete="off"
          />
        </div>
        <button type="button" class="dt-button" @click="regenerate">再生成</button>
      </div>
      <p v-if="seedInput === ''" class="hint mt-2">
        今回のシード: <span class="font-mono">{{ randomSeed }}</span>
        <button type="button" class="dt-link ml-2" @click="seedInput = randomSeed">このシードを固定する</button>
      </p>
      <p v-else class="hint mt-2">同じシード値と設定なら、いつでも同じ結果になります。</p>
    </section>

    <section v-if="!error">
      <div class="dt-tabs" role="tablist">
        <button
          v-for="f in formats"
          :key="f.value"
          type="button"
          role="tab"
          :aria-selected="currentFormat === f.value"
          :class="['dt-tab', { 'dt-tab-active': currentFormat === f.value }]"
          @click="setFormat(f.value)"
        >
          {{ f.label }}
        </button>
      </div>
      <div class="dt-panel">
        <p class="hint mb-2">{{ summary }}</p>
        <div class="relative">
          <textarea :value="output" class="dt-textarea bg-gray-50" spellcheck="false" readonly aria-label="生成結果"></textarea>
          <div class="absolute top-2 right-2">
            <CopyButton :textToCopy="output" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue';
import {
  charLength,
  generateParagraphs,
  paragraphsToText,
  paragraphsToHtml,
  generatePeople,
  peopleToJson,
  peopleToCsv,
  PERSON_FIELDS,
} from '@/utilities/dummyText.js';

const LIMITS = { chars: 100000, sentences: 100, paragraphs: 100, count: 1000 };

function newRandomSeed() {
  return String(Math.floor(Math.random() * 1000000));
}

// 1 以上 max 以下の整数か
function isValidCount(value, max) {
  return Number.isInteger(value) && value >= 1 && value <= max;
}

export default {
  name: 'DummyText',
  components: { CopyButton },
  data() {
    return {
      kind: 'ja',
      kinds: [
        { value: 'ja', label: '日本語の文章' },
        { value: 'en', label: 'Lorem ipsum（英語）' },
        { value: 'data', label: 'ダミーデータ（氏名・住所など）' },
      ],
      mode: 'chars',
      totalChars: 200,
      sentences: 5,
      paragraphs: 3,
      separator: '\n\n',
      separators: [
        { value: '\n\n', label: '空行' },
        { value: '\n', label: '改行のみ' },
        { value: '', label: 'なし（連結）' },
      ],
      punctuation: true,
      loremStart: true,
      count: 10,
      fields: PERSON_FIELDS.map((f) => f.key),
      personFields: PERSON_FIELDS,
      seedInput: '',
      randomSeed: newRandomSeed(),
      textFormat: 'text',
      dataFormat: 'json',
      limits: LIMITS,
    };
  },
  computed: {
    isText() {
      return this.kind !== 'data';
    },
    seed() {
      return this.seedInput === '' ? this.randomSeed : this.seedInput;
    },
    formats() {
      return this.isText
        ? [
            { value: 'text', label: 'テキスト' },
            { value: 'html', label: 'HTML（<p>）' },
          ]
        : [
            { value: 'json', label: 'JSON' },
            { value: 'csv', label: 'CSV' },
          ];
    },
    currentFormat() {
      return this.isText ? this.textFormat : this.dataFormat;
    },
    error() {
      if (this.isText) {
        if (this.mode === 'chars' && !isValidCount(this.totalChars, LIMITS.chars)) {
          return `合計文字数は 1〜${LIMITS.chars.toLocaleString()} の整数で指定してください`;
        }
        if (this.mode === 'sentences' && !isValidCount(this.sentences, LIMITS.sentences)) {
          return `文数は 1〜${LIMITS.sentences} の整数で指定してください`;
        }
        if (!isValidCount(this.paragraphs, LIMITS.paragraphs)) {
          return `段落数は 1〜${LIMITS.paragraphs} の整数で指定してください`;
        }
        if (this.mode === 'chars' && this.totalChars < this.paragraphs) {
          return '合計文字数は段落数以上にしてください';
        }
        return '';
      }
      if (!isValidCount(this.count, LIMITS.count)) {
        return `件数は 1〜${LIMITS.count.toLocaleString()} の整数で指定してください`;
      }
      if (this.fields.length === 0) return '項目を 1 つ以上選んでください';
      return '';
    },
    // 選択順ではなく定義順に並べた項目
    orderedFields() {
      return PERSON_FIELDS.map((f) => f.key).filter((key) => this.fields.includes(key));
    },
    paragraphList() {
      if (!this.isText || this.error) return [];
      return generateParagraphs(this.seed, {
        lang: this.kind,
        mode: this.mode,
        totalChars: this.totalChars,
        sentences: this.sentences,
        paragraphs: this.paragraphs,
        punctuation: this.punctuation,
        loremStart: this.loremStart,
      });
    },
    people() {
      if (this.isText || this.error) return [];
      return generatePeople(this.seed, this.count, this.orderedFields);
    },
    output() {
      if (this.error) return '';
      if (this.isText) {
        return this.textFormat === 'html'
          ? paragraphsToHtml(this.paragraphList)
          : paragraphsToText(this.paragraphList, this.separator);
      }
      return this.dataFormat === 'csv' ? peopleToCsv(this.people, this.orderedFields) : peopleToJson(this.people);
    },
    summary() {
      if (this.isText) {
        const chars = this.paragraphList.reduce((sum, p) => sum + charLength(p), 0);
        return `${chars.toLocaleString()}文字（段落の区切りを除く）・${this.paragraphList.length}段落`;
      }
      return `${this.people.length.toLocaleString()}件・${this.orderedFields.length}項目`;
    },
  },
  methods: {
    setFormat(value) {
      if (this.isText) this.textFormat = value;
      else this.dataFormat = value;
    },
    // シードが空欄なら新しいランダムなシードに、指定していればその値のまま作り直す（結果は同じ）
    regenerate() {
      if (this.seedInput === '') this.randomSeed = newRandomSeed();
    },
  },
};
</script>

<style scoped>
.dt-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.25rem;
}

.dt-input,
.dt-select {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  width: 8rem;
}

.dt-select {
  padding-right: 2rem;
  width: auto;
}

.dt-seed {
  width: 14rem;
  max-width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.dt-input:focus,
.dt-select:focus,
.dt-textarea:focus {
  outline: none;
  border-color: var(--tb-main);
  box-shadow: 0 0 0 1px var(--tb-main);
}

.dt-kinds {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dt-kind {
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  padding: 0.375rem 0.9rem;
  font-size: 0.875rem;
  color: #374151;
  background: #fff;
}

.dt-kind-active {
  border-color: var(--tb-main);
  background: var(--tb-main);
  color: #fff;
  font-weight: 700;
}

.dt-button {
  border: 1px solid var(--tb-main);
  background: var(--tb-main);
  color: #fff;
  border-radius: 0.375rem;
  padding: 0.375rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.dt-button:hover {
  opacity: 0.85;
}

.dt-link {
  color: var(--tb-main);
  text-decoration: underline;
}

.dt-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid #d1d5db;
}

.dt-tab {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #4b5563;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
  margin-bottom: -1px;
}

.dt-tab-active {
  color: var(--tb-main);
  font-weight: 700;
  border-color: #d1d5db;
  background-color: #fff;
}

.dt-panel {
  padding-top: 0.75rem;
}

.dt-textarea {
  width: 100%;
  min-height: 18rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.75rem 3rem 0.75rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.7;
  resize: vertical;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.error {
  color: #b91c1c;
}
</style>
