<template>
  <div class="dev-tool cat-dev">
    <div class="mb-4">
      <label for="jwt-input" class="block mb-1 font-semibold">JWT</label>
      <textarea
        id="jwt-input"
        v-model="input"
        rows="5"
        class="w-full border rounded-md p-3 font-mono text-sm break-all"
        placeholder="eyJhbGciOi... または Bearer eyJhbGciOi..."
        spellcheck="false"
      ></textarea>
      <p v-if="decoded.error" class="mt-1 text-sm text-red-600">{{ decoded.error }}</p>
    </div>

    <template v-if="decoded.ok">
      <div class="flex flex-wrap gap-2 mb-4">
        <span class="badge" :class="status.className">{{ status.label }}</span>
        <span v-if="isAlgNone" class="badge badge-danger">
          ⚠ alg が none です（署名なしトークン）
        </span>
      </div>

      <section class="mb-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="section-title">Header</h2>
          <CopyButton :textToCopy="headerJson" />
        </div>
        <pre class="code-block">{{ headerJson }}</pre>
      </section>

      <section class="mb-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="section-title">Payload</h2>
          <CopyButton :textToCopy="payloadJson" />
        </div>
        <pre class="code-block">{{ payloadJson }}</pre>
      </section>

      <section v-if="timeClaims.length" class="mb-6">
        <h2 class="section-title mb-1">時刻クレーム</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border">
            <thead>
              <tr class="bg-gray-100">
                <th class="border px-2 py-1 text-left">クレーム</th>
                <th class="border px-2 py-1 text-left">UNIX</th>
                <th class="border px-2 py-1 text-left">JST</th>
                <th class="border px-2 py-1 text-left">相対</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="claim in timeClaims" :key="claim.key">
                <td class="border px-2 py-1 font-mono">{{ claim.key }}</td>
                <td class="border px-2 py-1 font-mono">{{ claim.raw }}</td>
                <td class="border px-2 py-1 font-mono">{{ claim.jst }}</td>
                <td class="border px-2 py-1">{{ claim.relative }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="countdown" class="mt-2 text-sm">有効期限まで: <span class="font-mono">{{ countdown }}</span></p>
      </section>

      <section class="mb-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="section-title">Signature</h2>
          <CopyButton :textToCopy="decoded.signature" />
        </div>
        <pre class="code-block break-all whitespace-pre-wrap">{{ decoded.signature || '(なし)' }}</pre>

        <div class="mt-3">
          <template v-if="hmacHash">
            <label for="jwt-secret" class="block mb-1 text-sm font-semibold">シークレット（{{ alg }} 署名検証）</label>
            <input
              id="jwt-secret"
              v-model="secret"
              type="text"
              class="w-full border rounded-md p-2 font-mono text-sm"
              placeholder="your-256-bit-secret"
              spellcheck="false"
              autocomplete="off"
            />
            <p v-if="verifyResult === true" class="mt-1 text-sm text-green-700 font-semibold">✓ 署名一致</p>
            <p v-else-if="verifyResult === false" class="mt-1 text-sm text-red-600 font-semibold">✗ 不一致</p>
            <p v-else-if="verifyError" class="mt-1 text-sm text-red-600">{{ verifyError }}</p>
          </template>
          <p v-else-if="!isAlgNone" class="text-sm text-gray-600">
            署名検証: {{ alg || '(alg 不明)' }} は未対応です（HS256 / HS384 / HS512 のみ対応）
          </p>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ja';
import CopyButton from '@/components/CopyButton.vue';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const TIME_CLAIMS = ['exp', 'iat', 'nbf'];
const HMAC_HASHES = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

function base64UrlToBytes(segment) {
  if (!/^[A-Za-z0-9_-]*$/.test(segment) || segment.length % 4 === 1) {
    throw new Error('invalid base64url');
  }
  let b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  b64 += '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeSegment(segment, label) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(segment));
  } catch (e) {
    throw new Error(`${label} が Base64URL として不正です`);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch (e) {
    throw new Error(`${label} が JSON として不正です: ${e.message}`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} が JSON オブジェクトではありません`);
  }
  return value;
}

export default {
  name: 'JwtDecoder',
  components: { CopyButton },
  data() {
    return {
      input: '',
      secret: '',
      verifyResult: null,
      verifyError: '',
      now: Date.now(),
      timer: null,
    };
  },
  computed: {
    token() {
      return this.input.trim().replace(/^Bearer\s+/i, '').trim();
    },
    decoded() {
      if (!this.token) return { ok: false, error: '' };
      const parts = this.token.split('.');
      if (parts.length !== 3) {
        return {
          ok: false,
          error: `セグメントが3つではありません（${parts.length}個）。JWT は header.payload.signature の形式です`,
        };
      }
      try {
        const header = decodeSegment(parts[0], 'Header');
        const payload = decodeSegment(parts[1], 'Payload');
        if (!/^[A-Za-z0-9_-]*$/.test(parts[2])) {
          throw new Error('Signature が Base64URL として不正です');
        }
        return { ok: true, error: '', header, payload, signature: parts[2], parts };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    headerJson() {
      return this.decoded.ok ? JSON.stringify(this.decoded.header, null, 2) : '';
    },
    payloadJson() {
      return this.decoded.ok ? JSON.stringify(this.decoded.payload, null, 2) : '';
    },
    alg() {
      return this.decoded.ok && typeof this.decoded.header.alg === 'string' ? this.decoded.header.alg : '';
    },
    isAlgNone() {
      return this.alg.toLowerCase() === 'none';
    },
    hmacHash() {
      return HMAC_HASHES[this.alg] || null;
    },
    timeClaims() {
      if (!this.decoded.ok) return [];
      return TIME_CLAIMS.filter((key) => key in this.decoded.payload).map((key) => {
        const raw = this.decoded.payload[key];
        if (typeof raw !== 'number' || !Number.isFinite(raw)) {
          return { key, raw: JSON.stringify(raw), jst: '(数値ではありません)', relative: '-' };
        }
        const d = dayjs(raw * 1000);
        return {
          key,
          raw,
          jst: d.tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
          relative: d.locale('ja').from(dayjs(this.now)),
        };
      });
    },
    numericClaim() {
      return (key) => {
        const v = this.decoded.ok ? this.decoded.payload[key] : undefined;
        return typeof v === 'number' && Number.isFinite(v) ? v : null;
      };
    },
    status() {
      const nowSec = this.now / 1000;
      const exp = this.numericClaim('exp');
      const nbf = this.numericClaim('nbf');
      if (exp !== null && exp <= nowSec) return { label: '期限切れ', className: 'badge-danger' };
      if (nbf !== null && nbf > nowSec) return { label: 'まだ有効でない', className: 'badge-warn' };
      return { label: '有効期間内', className: 'badge-ok' };
    },
    countdown() {
      const exp = this.numericClaim('exp');
      if (exp === null) return '';
      let rest = Math.floor(exp - this.now / 1000);
      if (rest <= 0) return '';
      const days = Math.floor(rest / 86400);
      rest %= 86400;
      const pad = (n) => String(n).padStart(2, '0');
      const hms = `${pad(Math.floor(rest / 3600))}:${pad(Math.floor((rest % 3600) / 60))}:${pad(rest % 60)}`;
      return days > 0 ? `${days}日 ${hms}` : hms;
    },
    verifyKey() {
      return [this.decoded.ok ? this.token : '', this.secret, this.hmacHash].join('\n');
    },
  },
  watch: {
    verifyKey: {
      handler() {
        this.verifySignature();
      },
    },
  },
  mounted() {
    this.timer = setInterval(() => {
      this.now = Date.now();
    }, 1000);
  },
  beforeUnmount() {
    clearInterval(this.timer);
    this.timer = null;
  },
  methods: {
    async verifySignature() {
      this.verifyResult = null;
      this.verifyError = '';
      if (!this.decoded.ok || !this.hmacHash || !this.secret) return;
      const key = this.verifyKey;
      try {
        if (!window.crypto || !window.crypto.subtle) {
          throw new Error('この環境では Web Crypto API が使えません（HTTPS または localhost が必要です）');
        }
        const [h, p, s] = this.decoded.parts;
        const enc = new TextEncoder();
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          enc.encode(this.secret),
          { name: 'HMAC', hash: this.hmacHash },
          false,
          ['verify'],
        );
        const ok = await crypto.subtle.verify('HMAC', cryptoKey, base64UrlToBytes(s), enc.encode(`${h}.${p}`));
        if (key === this.verifyKey) this.verifyResult = ok;
      } catch (e) {
        if (key === this.verifyKey) {
          this.verifyResult = e.message === 'invalid base64url' ? false : null;
          this.verifyError = e.message === 'invalid base64url' ? '' : `検証に失敗しました: ${e.message}`;
        }
      }
    },
  },
};
</script>

<style scoped>
.section-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--tb-main);
}

.code-block {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  background-color: #f6f8fa;
  border: 1px solid #e5e7eb;
  border-left: 4px solid var(--tb-main);
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
}

.badge-ok {
  background-color: var(--tb-main);
}

.badge-warn {
  background-color: #d97706;
}

.badge-danger {
  background-color: #dc2626;
}
</style>
