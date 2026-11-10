<template>
  <div class="dev-tool cat-dev">
    <!-- 8 進数・記号表記の入力 -->
    <section class="mb-6">
      <div class="inputs">
        <div>
          <label for="octal-input" class="block text-sm font-bold mb-1">8進数</label>
          <input
            id="octal-input"
            :value="octalText"
            type="text"
            inputmode="numeric"
            spellcheck="false"
            autocomplete="off"
            placeholder="例: 755"
            class="mode-input mono w-full border rounded-md px-3 py-2 text-xl"
            @input="onOctalInput($event.target.value)"
          />
          <p v-if="octalError" class="text-red-600 text-sm mt-1">{{ octalError }}</p>
        </div>
        <div>
          <label for="symbolic-input" class="block text-sm font-bold mb-1">記号表記</label>
          <input
            id="symbolic-input"
            :value="symbolicText"
            type="text"
            spellcheck="false"
            autocomplete="off"
            placeholder="例: rwxr-xr-x"
            maxlength="10"
            class="mode-input mono w-full border rounded-md px-3 py-2 text-xl"
            @input="onSymbolicInput($event.target.value)"
          />
          <p v-if="symbolicError" class="text-red-600 text-sm mt-1">{{ symbolicError }}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-4">
        <button
          v-for="preset in presets"
          :key="preset.mode"
          type="button"
          class="preset-btn text-sm rounded-md px-3 py-1"
          :class="{ active: mode === preset.mode, danger: preset.danger }"
          :title="preset.note"
          @click="setMode(preset.mode)"
        >
          <span class="mono font-bold">{{ modeToOctalText(preset.mode) }}</span>
          <span class="ml-1 opacity-75">{{ preset.label }}</span>
        </button>
      </div>
    </section>

    <!-- チェックボックス表 -->
    <section class="mb-6">
      <h2 class="section-title">権限</h2>
      <div class="overflow-x-auto">
        <table class="perm-table text-sm">
          <thead>
            <tr>
              <th></th>
              <th v-for="p in perms" :key="p.key">
                {{ p.label }}<br />
                <span class="mono sub">{{ p.key }} ({{ p.value }})</span>
              </th>
              <th>値</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in classes" :key="c.key">
              <th class="row-head">
                {{ c.label }}<br />
                <span class="mono sub">{{ c.en }} ({{ c.key }})</span>
              </th>
              <td v-for="p in perms" :key="p.key" class="cell">
                <label class="check">
                  <input
                    type="checkbox"
                    :checked="hasBit(p.value << c.shift)"
                    :aria-label="`${c.label}の${p.label}`"
                    @change="toggleBit(p.value << c.shift)"
                  />
                </label>
              </td>
              <td class="mono digit">{{ (mode >> c.shift) & 7 }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="text-sm font-bold mt-4 mb-2">特殊ビット <span class="mono sub">({{ (mode >> 9) & 7 }})</span></h3>
      <div class="flex flex-wrap gap-x-6 gap-y-2">
        <label v-for="s in specials" :key="s.key" class="inline-flex items-center gap-1" :title="s.note">
          <input type="checkbox" :checked="hasBit(s.value)" @change="toggleBit(s.value)" />
          {{ s.label }} <span class="mono sub">({{ s.value.toString(8) }})</span>
        </label>
      </div>
    </section>

    <!-- 意味と注意 -->
    <section class="mb-6">
      <ul class="meaning text-sm">
        <li v-for="line in meaningLines" :key="line.label">
          <span class="font-bold">{{ line.label }}:</span> {{ line.text }}
        </li>
      </ul>
      <ul v-if="warnings.length" class="warnings text-sm mt-3">
        <li v-for="w in warnings" :key="w">⚠ {{ w }}</li>
      </ul>
    </section>

    <!-- コマンド例 -->
    <section class="mb-6">
      <h2 class="section-title">コマンド</h2>
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <label for="file-name" class="text-sm font-bold">対象</label>
        <input
          id="file-name"
          v-model="fileName"
          type="text"
          spellcheck="false"
          autocomplete="off"
          class="mono border rounded-md px-2 py-1 text-sm file-input"
        />
      </div>
      <table class="cmd-table text-sm">
        <tbody>
          <tr v-for="cmd in commands" :key="cmd.label">
            <th class="pr-3 text-left whitespace-nowrap">{{ cmd.label }}</th>
            <td class="mono pr-2 break-all"><code>{{ cmd.value }}</code></td>
            <td><CopyButton :textToCopy="cmd.value" /></td>
          </tr>
        </tbody>
      </table>
      <p v-if="mode & 0o6000" class="hint mt-2">
        GNU chmod はディレクトリの setuid / setgid を 8 進数指定では消さずに残します。消すときは
        <code>chmod 00{{ octalPlain }} …</code> や <code>chmod u-s,g-s …</code> を使います。
      </p>
    </section>

    <!-- ls -l の解析 -->
    <section>
      <h2 class="section-title">ls -l の表記を解析</h2>
      <label for="ls-input" class="block text-sm mb-1">
        <code>ls -l</code> の出力を貼り付けてください（複数行可）
      </label>
      <textarea
        id="ls-input"
        v-model="lsText"
        rows="4"
        spellcheck="false"
        placeholder="drwxr-xr-x  5 user  staff  160 Nov 10 12:34 src&#10;-rw-r--r--  1 user  staff  512 Nov 10 12:34 README.md"
        class="mono w-full border rounded-md px-3 py-2 text-sm"
      ></textarea>
      <div v-if="lsResults.length" class="overflow-x-auto mt-2">
        <table class="ls-table text-sm">
          <thead>
            <tr>
              <th>パーミッション</th>
              <th>8進数</th>
              <th>種別</th>
              <th>名前</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in lsResults" :key="i">
              <template v-if="r.error">
                <td class="mono">{{ r.line.slice(0, 11) }}</td>
                <td colspan="4" class="text-red-600">{{ r.error }}</td>
              </template>
              <template v-else>
                <td class="mono whitespace-nowrap">{{ r.typeChar }}{{ symbolic(r.mode) }}{{ r.marker }}</td>
                <td class="mono font-bold">{{ modeToOctalText(r.mode) }}</td>
                <td>{{ r.type }}</td>
                <td class="mono name-cell">{{ r.name }}</td>
                <td>
                  <button type="button" class="apply-btn text-xs rounded-md px-2 py-1" @click="applyLs(r)">
                    反映
                  </button>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="lsHasMarker" class="hint mt-2">
        末尾の <code>+</code> は ACL、<code>@</code> は拡張属性（macOS）、<code>.</code> は SELinux コンテキストがあることを示します。
      </p>
    </section>
  </div>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue';
import {
  CLASSES,
  PERMS,
  SETUID,
  SETGID,
  STICKY,
  modeToOctal,
  parseOctal,
  modeToSymbolic,
  parseSymbolic,
  modeToChmodSymbolic,
  parseLsLine,
} from '@/utilities/chmod';

const PRESETS = [
  { mode: 0o644, label: '通常ファイル' },
  { mode: 0o755, label: '実行ファイル・ディレクトリ' },
  { mode: 0o600, label: '秘密鍵など' },
  { mode: 0o700, label: '自分専用ディレクトリ' },
  { mode: 0o664, label: 'グループで共有' },
  { mode: 0o775, label: 'グループ共有ディレクトリ' },
  { mode: 0o400, label: '読み取り専用' },
  { mode: 0o777, label: '全員に全権限', danger: true, note: '誰でも書き換えられるため通常は使いません' },
  { mode: 0o1777, label: '/tmp（sticky）' },
  { mode: 0o2775, label: '共有ディレクトリ（setgid）' },
  { mode: 0o4755, label: 'setuid 実行ファイル' },
];

export default {
  name: 'ChmodCalculator',
  components: { CopyButton },
  data() {
    return {
      mode: 0o755,
      octalText: '755',
      symbolicText: 'rwxr-xr-x',
      octalError: null,
      symbolicError: null,
      fileName: 'file',
      lsText: '',
      classes: CLASSES,
      perms: PERMS,
      presets: PRESETS,
      specials: [
        { key: 'setuid', label: 'setuid', value: SETUID, note: '実行時に所有者の権限で動く' },
        { key: 'setgid', label: 'setgid', value: SETGID, note: '実行時にグループの権限で動く / ディレクトリ内の新規ファイルがグループを引き継ぐ' },
        { key: 'sticky', label: 'sticky', value: STICKY, note: 'ディレクトリ内のファイルを所有者しか削除・改名できない' },
      ],
    };
  },
  computed: {
    octalPlain() {
      return (this.mode & 0o777).toString(8).padStart(3, '0');
    },
    target() {
      const name = this.fileName.trim() || 'file';
      // 空白や記号を含む名前はシングルクォートで囲む
      return /^[\w./~-]+$/.test(name) ? name : `'${name.replace(/'/g, "'\\''")}'`;
    },
    commands() {
      return [
        { label: '8進数', value: `chmod ${modeToOctal(this.mode)} ${this.target}` },
        { label: '記号モード', value: `chmod ${modeToChmodSymbolic(this.mode)} ${this.target}` },
      ];
    },
    meaningLines() {
      const lines = CLASSES.map((c) => {
        const bits = (this.mode >> c.shift) & 7;
        const names = PERMS.filter((p) => bits & p.value).map((p) => p.label);
        return { label: c.label, text: names.length ? names.join('・') : '権限なし' };
      });
      const sp = [];
      if (this.mode & SETUID) sp.push('setuid（所有者の権限で実行）');
      if (this.mode & SETGID) sp.push('setgid（グループの権限で実行 / グループを継承）');
      if (this.mode & STICKY) sp.push('sticky（所有者だけが削除・改名できる）');
      if (sp.length) lines.push({ label: '特殊', text: sp.join('、') });
      return lines;
    },
    warnings() {
      const m = this.mode;
      const list = [];
      if ((m & 0o777) === 0o777) {
        list.push('777 は誰でも読み書き・実行できます。共有ディレクトリなら sticky 付きの 1777 や、グループ権限（775 など）を検討してください。');
      } else if (m & 0o002) {
        list.push('その他のユーザーに書き込み権限があります。');
      }
      if ((m & SETUID) && !(m & 0o100)) list.push('setuid が付いていますが所有者の実行権限がありません（S 表示）。');
      if ((m & SETGID) && !(m & 0o010)) list.push('setgid が付いていますがグループの実行権限がありません（S 表示）。');
      if ((m & STICKY) && !(m & 0o001)) list.push('sticky が付いていますがその他の実行権限がありません（T 表示）。');
      if ((m & SETUID) && (m & 0o022)) list.push('setuid のファイルに所有者以外の書き込み権限があるのは危険です。');
      return list;
    },
    lsResults() {
      return this.lsText
        .split('\n')
        .map((l) => l.trim())
        // 「total 48」「合計 48」の行は読み飛ばす
        .filter((l) => l !== '' && !/^(total|合計)\s+\d/.test(l))
        .map(parseLsLine);
    },
    lsHasMarker() {
      return this.lsResults.some((r) => !r.error && r.marker);
    },
  },
  methods: {
    modeToOctalText(mode) {
      return modeToOctal(mode);
    },
    symbolic(mode) {
      return modeToSymbolic(mode);
    },
    hasBit(bit) {
      return (this.mode & bit) !== 0;
    },
    toggleBit(bit) {
      this.setMode(this.mode ^ bit);
    },
    // モードを確定し、編集元（source）以外の表示を更新する
    setMode(mode, source = null) {
      this.mode = mode;
      if (source !== 'octal') {
        this.octalText = modeToOctal(mode);
        this.octalError = null;
      }
      if (source !== 'symbolic') {
        this.symbolicText = modeToSymbolic(mode);
        this.symbolicError = null;
      }
    },
    onOctalInput(value) {
      this.octalText = value;
      const r = parseOctal(value);
      this.octalError = r.error;
      if (r.mode !== null) this.setMode(r.mode, 'octal');
    },
    onSymbolicInput(value) {
      this.symbolicText = value;
      // ls -l からコピーした 10 文字（先頭に種別）も受け付ける
      const s = value.trim();
      const body = s.length === 10 && /^[-dlcbpsD]/.test(s) ? s.slice(1) : s;
      const r = parseSymbolic(body);
      this.symbolicError = r.error;
      if (r.mode !== null) this.setMode(r.mode, 'symbolic');
    },
    applyLs(r) {
      this.setMode(r.mode);
      if (r.name) this.fileName = r.name.replace(/\s+->\s+.*$/, '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  },
};
</script>

<style scoped>
.mono,
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
  max-width: 32rem;
}

.mode-input:focus,
.file-input:focus,
#ls-input:focus {
  outline: 2px solid var(--tb-main);
  outline-offset: -1px;
}

.file-input {
  width: 14rem;
  max-width: 100%;
}

.section-title {
  font-weight: bold;
  font-size: 1.15rem;
  border-left: 4px solid var(--tb-main);
  padding-left: 0.5rem;
  margin-bottom: 1rem;
}

.preset-btn {
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  background: transparent;
}

.preset-btn:hover,
.preset-btn.active {
  background: var(--tb-main);
  color: #fff;
}

.preset-btn.danger {
  border-color: #b91c1c;
  color: #b91c1c;
}

.preset-btn.danger:hover,
.preset-btn.danger.active {
  background: #b91c1c;
  color: #fff;
}

.sub {
  font-weight: normal;
  font-size: 0.75rem;
  color: #6b7280;
}

.perm-table th,
.perm-table td {
  border: 1px solid #e5e7eb;
  padding: 0.4rem 0.75rem;
  text-align: center;
}

.perm-table thead th,
.perm-table .row-head {
  background: #f9fafb;
}

.perm-table .row-head {
  text-align: left;
  white-space: nowrap;
}

.perm-table .cell {
  padding: 0;
}

/* セル全体をクリックできるようにする */
.perm-table .check {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
}

.perm-table .check input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--tb-main);
  cursor: pointer;
}

.perm-table .digit {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--tb-main);
}

input[type='checkbox'] {
  accent-color: var(--tb-main);
}

.meaning li {
  margin-bottom: 0.2rem;
}

.warnings {
  border: 1px solid #f59e0b;
  background: #fffbeb;
  color: #92400e;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
}

.cmd-table th,
.cmd-table td {
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
  vertical-align: middle;
}

.cmd-table code {
  background: #f3f4f6;
  border-radius: 0.25rem;
  padding: 0.15rem 0.4rem;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.ls-table th,
.ls-table td {
  border: 1px solid #e5e7eb;
  padding: 0.3rem 0.6rem;
  text-align: left;
}

.ls-table th {
  background: #f9fafb;
  white-space: nowrap;
}

.ls-table .name-cell {
  min-width: 6rem;
  overflow-wrap: anywhere;
}

.apply-btn {
  border: 1px solid var(--tb-main);
  color: var(--tb-main);
  white-space: nowrap;
}

.apply-btn:hover {
  background: var(--tb-main);
  color: #fff;
}
</style>
