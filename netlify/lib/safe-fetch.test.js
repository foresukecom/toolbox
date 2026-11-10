// 実行: node --test netlify/lib/safe-fetch.test.js
const test = require('node:test');
const assert = require('node:assert');
const { validateUrl, isPublicAddress, corsHeaders, SafeFetchError } = require('./safe-fetch');

test('公開アドレスは許可する', () => {
  for (const ip of ['8.8.8.8', '93.184.215.14', '2606:4700::1111', '::ffff:8.8.8.8']) {
    assert.strictEqual(isPublicAddress(ip), true, ip);
  }
});

test('内部向けのアドレスは拒否する', () => {
  for (const ip of [
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1',
    '0.0.0.0', '224.0.0.1', '255.255.255.255', '::1', '::', 'fe80::1', 'fd00::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', '::7f00:1', '64:ff9b::7f00:1',
    'not-an-ip',
  ]) {
    assert.strictEqual(isPublicAddress(ip), false, ip);
  }
});

test('URL の形式を検査する', () => {
  assert.strictEqual(validateUrl('https://example.com/feed.xml').hostname, 'example.com');
  assert.strictEqual(validateUrl('http://example.com:80/').hostname, 'example.com');

  const rejected = {
    '': 'invalid_url',
    'not a url': 'invalid_url',
    'ftp://example.com/': 'blocked_url',
    'file:///etc/passwd': 'blocked_url',
    'javascript:alert(1)': 'blocked_url',
    'https://user:pass@example.com/': 'blocked_url',
    'http://example.com:8080/': 'blocked_url',
    'http://127.0.0.1/': 'blocked_address',
    'http://[::1]/': 'blocked_address',
    'http://[::ffff:127.0.0.1]/': 'blocked_address',
    'http://169.254.169.254/latest/meta-data/': 'blocked_address',
    'http://2130706433/': 'blocked_address', // 10進表記の 127.0.0.1
    'http://0x7f.1/': 'blocked_address',
  };
  for (const [input, code] of Object.entries(rejected)) {
    assert.throws(() => validateUrl(input), (e) => e instanceof SafeFetchError && e.code === code, input);
  }
  assert.throws(() => validateUrl('https://example.com/' + 'a'.repeat(2048)), /長すぎ/);
});

test('ALLOWED_ORIGINS に含まれる Origin だけを許可する', () => {
  const saved = process.env.ALLOWED_ORIGINS;
  try {
    delete process.env.ALLOWED_ORIGINS;
    assert.strictEqual(corsHeaders({ headers: {} })['Access-Control-Allow-Origin'], '*');

    process.env.ALLOWED_ORIGINS = 'https://a.example, http://localhost:8080';
    assert.strictEqual(
      corsHeaders({ headers: { origin: 'http://localhost:8080' } })['Access-Control-Allow-Origin'],
      'http://localhost:8080',
    );
    assert.strictEqual(
      corsHeaders({ headers: { origin: 'https://evil.example' } })['Access-Control-Allow-Origin'],
      undefined,
    );
  } finally {
    if (saved === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = saved;
  }
});
