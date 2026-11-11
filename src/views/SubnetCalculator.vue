<template>
  <div class="dev-tool cat-dev">
    <section class="mb-8">
      <label class="block font-bold mb-2" for="subnet-input">IP アドレスとプレフィックス長（またはサブネットマスク）</label>
      <input
        id="subnet-input"
        v-model="input"
        type="text"
        class="border rounded-md p-2 w-full max-w-md font-mono"
        placeholder="192.168.1.10/24 / 10.0.0.1 255.0.0.0 / 2001:db8::1/64"
        spellcheck="false"
        autocomplete="off"
      />
      <div class="flex flex-wrap gap-2 mt-3">
        <button
          v-for="ex in examples"
          :key="ex"
          type="button"
          class="example font-mono"
          @click="input = ex"
        >{{ ex }}</button>
      </div>
      <p class="hint mt-2">
        「アドレス/プレフィックス長」「アドレス/サブネットマスク」「アドレス サブネットマスク」の形式に対応。プレフィックス長を省略すると単一アドレス（/32・/128）として扱います。IPv6 は基本情報のみ。
      </p>
      <p v-if="parsed.error" class="error mt-2">{{ parsed.error }}</p>
    </section>

    <template v-if="info">
      <section class="mb-8">
        <h2 class="section-title">基本情報</h2>
        <table class="outputs">
          <tbody>
            <tr v-for="row in infoRows" :key="row.label">
              <th class="pr-4 text-left align-top">{{ row.label }}</th>
              <td class="font-mono pr-2 wrap-any">
                {{ row.value }}
                <span v-if="row.note" class="hint font-sans block">{{ row.note }}</span>
              </td>
              <td><CopyButton v-if="row.copy !== false" :textToCopy="row.value" /></td>
            </tr>
          </tbody>
        </table>
        <ul v-if="uses.length > 1" class="hint mt-3 list-disc pl-5">
          <li v-for="u in uses" :key="u.cidr">{{ u.cidr }}: {{ u.label }}</li>
        </ul>
      </section>

      <section v-if="parsed.version === 4" class="mb-8">
        <h2 class="section-title">2進数表示</h2>
        <p class="hint mb-3">
          <span class="legend legend-net"></span>ネットワーク部（{{ parsed.prefix }} ビット）
          <span class="legend legend-host ml-3"></span>ホスト部（{{ 32 - parsed.prefix }} ビット）
        </p>
        <div class="binary-table">
          <div v-for="row in binaryRows" :key="row.label" class="binary-row">
            <div class="binary-label">{{ row.label }}</div>
            <div class="binary-bits font-mono">
              <span v-for="(group, gi) in row.groups" :key="gi" class="octet">
                <span
                  v-for="(b, bi) in group"
                  :key="bi"
                  :class="b.network ? 'bit-net' : 'bit-host'"
                >{{ b.bit }}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="section-title">サブネット分割</h2>
        <div v-if="parsed.prefix < bits" class="flex flex-wrap items-center gap-2 mb-3">
          <label for="split-prefix">分割後のプレフィックス長</label>
          <select id="split-prefix" v-model.number="splitPrefix" class="border rounded-md p-2 font-mono">
            <option v-for="p in splitOptions" :key="p" :value="p">/{{ p }}</option>
          </select>
          <span v-if="split" class="hint">
            {{ formatCount(split.count) }} 個のサブネット（各 {{ formatCount(splitSize) }} アドレス）
          </span>
        </div>
        <p v-else class="hint">/{{ bits }} はこれ以上分割できません。</p>
        <template v-if="split">
          <div class="split-wrap">
            <table class="split-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ネットワーク</th>
                  <th>{{ parsed.version === 4 ? '利用可能なホスト' : 'アドレス範囲' }}</th>
                  <th v-if="parsed.version === 4">ブロードキャスト</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in splitRows" :key="row.index" :class="{ current: row.current }">
                  <td class="text-right">{{ row.index }}</td>
                  <td class="font-mono">{{ row.cidr }}</td>
                  <td class="font-mono">{{ row.range }}</td>
                  <td v-if="parsed.version === 4" class="font-mono">{{ row.broadcast }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="splitTruncated" class="hint mt-2">
            先頭 {{ split.rows.length }} 件を表示しています（全 {{ formatCount(split.count) }} 件）。
          </p>
          <p class="hint mt-1">入力したアドレスを含むサブネットは強調表示しています。</p>
        </template>
      </section>

      <section>
        <h2 class="section-title">包含チェック</h2>
        <label class="block mb-2" for="contains-input">
          このアドレスが <span class="font-mono">{{ networkCidr }}</span> に含まれるか
        </label>
        <input
          id="contains-input"
          v-model="checkInput"
          type="text"
          class="border rounded-md p-2 w-full max-w-md font-mono"
          :placeholder="parsed.version === 4 ? '192.168.1.200' : '2001:db8::abcd'"
          spellcheck="false"
          autocomplete="off"
        />
        <p v-if="containsResult" class="mt-3" :class="containsResult.className">{{ containsResult.text }}</p>
      </section>
    </template>
  </div>
</template>

<script>
/* global BigInt */
import CopyButton from '@/components/CopyButton.vue';
import {
  parseNetworkInput,
  parseAddress,
  subnetInfo,
  formatAddress,
  expandIPv6,
  ipv4Class,
  specialUses,
  addressScope,
  contains,
  splitSubnets,
  binaryGroups,
  formatCount,
} from '@/utilities/subnet.js';

export default {
  name: 'SubnetCalculator',
  components: { CopyButton },
  data() {
    return {
      input: '192.168.1.130/26',
      checkInput: '192.168.1.150',
      splitPrefix: null,
      examples: ['192.168.1.130/26', '172.16.5.4/20', '10.0.0.0/8', '203.0.113.6/31', '2001:db8:abcd:12::1/64'],
    };
  },
  computed: {
    parsed() {
      return parseNetworkInput(this.input);
    },
    bits() {
      return this.parsed.version === 6 ? 128 : 32;
    },
    info() {
      const p = this.parsed;
      if (p.error || p.empty) return null;
      return subnetInfo(p.address, p.prefix, p.version);
    },
    uses() {
      return specialUses(this.parsed.address, this.parsed.version);
    },
    networkCidr() {
      return `${formatAddress(this.info.network, this.parsed.version)}/${this.parsed.prefix}`;
    },
    infoRows() {
      const { version, prefix, address } = this.parsed;
      const i = this.info;
      const fmt = (v) => formatAddress(v, version);
      const rows = [
        { label: 'ネットワーク', value: this.networkCidr },
        { label: 'ネットワークアドレス', value: fmt(i.network) },
      ];
      if (version === 4) {
        rows.push(
          {
            label: 'ブロードキャスト',
            value: i.broadcast === null ? 'なし' : fmt(i.broadcast),
            copy: i.broadcast !== null,
            note: prefix === 31 ? '/31 はポイントツーポイント用（RFC 3021）。ブロードキャストは無く 2 アドレスとも使えます。' : prefix === 32 ? '/32 は単一ホストです。' : '',
          },
          { label: 'サブネットマスク', value: fmt(i.mask) },
          { label: 'ワイルドカードマスク', value: fmt(i.wildcard) },
          { label: '利用可能なホスト', value: `${fmt(i.firstHost)} 〜 ${fmt(i.lastHost)}` },
          { label: 'ホスト数', value: formatCount(i.usable), note: `アドレス総数 ${formatCount(i.total)}` },
          { label: 'クラス', value: ipv4Class(address), copy: false },
        );
      } else {
        rows.push(
          { label: 'アドレス範囲', value: `${fmt(i.firstHost)} 〜 ${fmt(i.lastHost)}` },
          { label: 'アドレス数', value: `2^${128 - prefix}`, note: formatCount(i.total) },
          { label: '省略なし表記', value: expandIPv6(address) },
        );
      }
      rows.push({ label: '種別', value: addressScope(address, version), copy: false });
      return rows;
    },
    binaryRows() {
      const { address, prefix } = this.parsed;
      const i = this.info;
      const rows = [
        { label: 'アドレス', value: address },
        { label: 'サブネットマスク', value: i.mask },
        { label: 'ネットワーク', value: i.network },
      ];
      if (i.broadcast !== null) rows.push({ label: 'ブロードキャスト', value: i.broadcast });
      return rows.map((r) => ({ label: r.label, groups: binaryGroups(r.value, prefix, 4) }));
    },
    splitOptions() {
      const opts = [];
      for (let p = this.parsed.prefix + 1; p <= this.bits; p++) opts.push(p);
      return opts;
    },
    // 選択中の分割プレフィックスが範囲外になったら既定値（+2、無理なら最大）に戻す
    effectiveSplitPrefix() {
      const opts = this.splitOptions;
      if (opts.length === 0) return null;
      if (opts.includes(this.splitPrefix)) return this.splitPrefix;
      return opts[Math.min(1, opts.length - 1)];
    },
    split() {
      if (!this.info || this.effectiveSplitPrefix === null) return null;
      const { address, prefix, version } = this.parsed;
      return splitSubnets(address, prefix, version, this.effectiveSplitPrefix);
    },
    splitTruncated() {
      return this.split.count > BigInt(this.split.rows.length);
    },
    splitSize() {
      return 1n << BigInt(this.bits - this.effectiveSplitPrefix);
    },
    splitRows() {
      const { version, address } = this.parsed;
      const p = this.effectiveSplitPrefix;
      const fmt = (v) => formatAddress(v, version);
      return this.split.rows.map((r) => ({
        index: r.index,
        cidr: `${fmt(r.network)}/${p}`,
        range: r.firstHost === r.lastHost ? fmt(r.firstHost) : `${fmt(r.firstHost)} 〜 ${fmt(r.lastHost)}`,
        broadcast: r.broadcast === null ? '—' : fmt(r.broadcast),
        current: contains(r.network, p, version, address),
      }));
    },
    containsResult() {
      const s = this.checkInput.trim();
      if (s === '') return null;
      const a = parseAddress(s);
      if (!a) return { text: `アドレスとして解釈できません: ${s}`, className: 'error' };
      if (a.version !== this.parsed.version) {
        return { text: `IPv${a.version} のアドレスです。IPv${this.parsed.version} のネットワークとは比較できません。`, className: 'error' };
      }
      const { prefix, version } = this.parsed;
      if (contains(this.info.network, prefix, version, a.value)) {
        let note = '';
        if (version === 4 && this.info.broadcast !== null) {
          if (a.value === this.info.network) note = '（ネットワークアドレス）';
          else if (a.value === this.info.broadcast) note = '（ブロードキャストアドレス）';
        }
        return { text: `✓ ${formatAddress(a.value, version)} は ${this.networkCidr} に含まれます${note}`, className: 'ok' };
      }
      return { text: `✗ ${formatAddress(a.value, version)} は ${this.networkCidr} に含まれません`, className: 'ng' };
    },
  },
  watch: {
    // 元のプレフィックス長が変わったら分割の選択は既定値に戻す
    'parsed.prefix'() {
      this.splitPrefix = null;
    },
    effectiveSplitPrefix: {
      handler(p) {
        if (p !== null && this.splitPrefix !== p) this.splitPrefix = p;
      },
      immediate: true,
    },
  },
  methods: {
    formatCount,
  },
};
</script>

<style scoped>
.outputs th,
.outputs td {
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
  vertical-align: middle;
}

.outputs th {
  white-space: nowrap;
}

.wrap-any {
  overflow-wrap: anywhere;
}

.section-title {
  font-weight: bold;
  font-size: 1.15rem;
  border-left: 4px solid var(--tb-main);
  padding-left: 0.5rem;
  margin-bottom: 1rem;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.error {
  color: #b91c1c;
}

.ok {
  color: #047857;
  font-weight: bold;
}

.ng {
  color: #b91c1c;
  font-weight: bold;
}

.example {
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--tb-main);
  border-radius: 9999px;
  color: var(--tb-main-hover);
  background: #fff;
}

.example:hover {
  background: var(--tb-main);
  color: #fff;
}

.legend {
  display: inline-block;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 0.2rem;
  vertical-align: -0.1rem;
  margin-right: 0.25rem;
}

.legend-net,
.bit-net {
  background: #d1f2eb;
  color: #0e6655;
}

.legend-host,
.bit-host {
  background: #fdebd0;
  color: #9c4a00;
}

.binary-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 1rem;
  margin-bottom: 0.6rem;
}

.binary-label {
  width: 8.5rem;
  font-weight: bold;
  font-size: 0.9rem;
}

.binary-bits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.95rem;
}

.octet {
  display: inline-flex;
}

.octet span {
  display: inline-block;
  width: 0.85rem;
  text-align: center;
}

.split-wrap {
  max-height: 24rem;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.split-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.split-table th,
.split-table td {
  padding: 0.3rem 0.6rem;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
  text-align: left;
}

.split-table thead th {
  position: sticky;
  top: 0;
  background: #f9fafb;
}

.split-table tr.current td {
  background: #e8f8f5;
  font-weight: bold;
}

@media (max-width: 480px) {
  .binary-label {
    width: 100%;
  }

  .binary-bits {
    font-size: 0.85rem;
  }

  .octet span {
    width: 0.62rem;
  }
}
</style>
