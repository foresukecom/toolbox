// JSON から TypeScript の型定義を生成するロジック（DOM に依存しない純粋関数群）
// JSON.parse はエラー位置の表し方がブラウザごとに違い、整数風のキーの順序も入れ替えるため、
// 位置付きのエラーを返す小さなパーサーを自前で持つ。

// ---- パーサー ----

// パース結果のノード: { kind: 'object', entries: [[key, node], ...] } / { kind: 'array', items: [...] }
// / { kind: 'string' | 'number' | 'boolean' | 'null' }（型推論には値そのものは不要）
export class JsonParseError extends Error {
  constructor(message, pos, line, column) {
    super(message);
    this.pos = pos;
    this.line = line;
    this.column = column;
  }
}

// sticky で現在位置から照合する（slice すると大きな入力で遅くなるため）
const NUMBER = /-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/y;

export function parseJson(text) {
  let i = 0;

  function fail(message, at = i) {
    let line = 1;
    let lineStart = 0;
    for (let k = 0; k < at && k < text.length; k++) {
      if (text[k] === '\n') {
        line++;
        lineStart = k + 1;
      }
    }
    throw new JsonParseError(message, at, line, at - lineStart + 1);
  }

  function found(ch) {
    return ch === undefined ? '入力が途中で終わっています' : `「${ch}」があります`;
  }

  function skipWs() {
    while (i < text.length && ' \t\n\r'.includes(text[i])) i++;
  }

  function parseValue() {
    skipWs();
    const ch = text[i];
    if (ch === '{') return parseObject();
    if (ch === '[') return parseArray();
    if (ch === '"') {
      parseString();
      return { kind: 'string' };
    }
    if (ch === '-' || (ch >= '0' && ch <= '9')) return parseNumber();
    for (const [word, node] of [
      ['true', { kind: 'boolean' }],
      ['false', { kind: 'boolean' }],
      ['null', { kind: 'null' }],
    ]) {
      if (text.startsWith(word, i)) {
        i += word.length;
        return node;
      }
    }
    fail(`値が必要ですが、${found(ch)}`);
  }

  function parseObject() {
    i++; // {
    const entries = [];
    const index = new Map();
    skipWs();
    if (text[i] === '}') {
      i++;
      return { kind: 'object', entries };
    }
    for (;;) {
      skipWs();
      if (text[i] !== '"') fail(`キー（ダブルクォートの文字列）が必要ですが、${found(text[i])}`);
      const key = parseString();
      skipWs();
      if (text[i] !== ':') fail(`「:」が必要ですが、${found(text[i])}`);
      i++;
      const value = parseValue();
      // 重複キーは JSON.parse と同じく後勝ち。並び順は最初に出た位置のまま
      if (index.has(key)) entries[index.get(key)][1] = value;
      else {
        index.set(key, entries.length);
        entries.push([key, value]);
      }
      skipWs();
      if (text[i] === ',') {
        i++;
        continue;
      }
      if (text[i] === '}') {
        i++;
        return { kind: 'object', entries };
      }
      fail(`「,」か「}」が必要ですが、${found(text[i])}`);
    }
  }

  function parseArray() {
    i++; // [
    const items = [];
    skipWs();
    if (text[i] === ']') {
      i++;
      return { kind: 'array', items };
    }
    for (;;) {
      items.push(parseValue());
      skipWs();
      if (text[i] === ',') {
        i++;
        continue;
      }
      if (text[i] === ']') {
        i++;
        return { kind: 'array', items };
      }
      fail(`「,」か「]」が必要ですが、${found(text[i])}`);
    }
  }

  function parseString() {
    const start = i;
    i++; // "
    let out = '';
    for (;;) {
      const ch = text[i];
      if (ch === undefined) fail('文字列が閉じられていません', start);
      if (ch === '"') {
        i++;
        return out;
      }
      if (ch < ' ') fail('文字列の中に改行などの制御文字があります');
      if (ch === '\\') {
        const e = text[i + 1];
        const map = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
        if (e in map) {
          out += map[e];
          i += 2;
        } else if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
          out += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16));
          i += 6;
        } else {
          fail('不正なエスケープシーケンスです');
        }
      } else {
        out += ch;
        i++;
      }
    }
  }

  function parseNumber() {
    NUMBER.lastIndex = i;
    const m = NUMBER.exec(text);
    if (!m) fail('数値の形式が不正です');
    i += m[0].length;
    if (/[0-9.eE]/.test(text[i] || '')) fail('数値の形式が不正です');
    return { kind: 'number' };
  }

  const root = parseValue();
  skipWs();
  if (i < text.length) fail(`値のあとに余分な文字「${text[i]}」があります`);
  return root;
}

// ---- 型の推論 ----

// 型（ユニオン）: { prims: Set<'string'|'number'|'boolean'|'null'>, obj: Shape|null, arr: ArrayType|null }
// Shape: { count: マージしたオブジェクト数, fields: Map<key, { type, count }> }
// ArrayType: { elem: 型|null（要素が一つも無ければ null） }
function emptyType() {
  return { prims: new Set(), obj: null, arr: null };
}

function addNode(t, node) {
  if (node.kind === 'object') {
    if (!t.obj) t.obj = { count: 0, fields: new Map() };
    t.obj.count++;
    for (const [key, value] of node.entries) {
      let f = t.obj.fields.get(key);
      if (!f) {
        f = { type: emptyType(), count: 0 };
        t.obj.fields.set(key, f);
      }
      f.count++;
      addNode(f.type, value);
    }
  } else if (node.kind === 'array') {
    if (!t.arr) t.arr = { elem: null };
    for (const item of node.items) {
      if (!t.arr.elem) t.arr.elem = emptyType();
      addNode(t.arr.elem, item);
    }
  } else {
    t.prims.add(node.kind);
  }
  return t;
}

export function inferType(node) {
  return addNode(emptyType(), node);
}

// ---- 名前とキー ----

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// TypeScript の予約語（型名に使えないもの）
const RESERVED = new Set(
  ('break case catch class const continue debugger default delete do else enum export extends false finally for ' +
    'function if import in instanceof new null return super switch this throw true try typeof var void while with ' +
    'any boolean number string symbol never unknown object undefined')
    .split(' '),
);

export function formatKey(key) {
  return IDENT.test(key) ? key : JSON.stringify(key);
}

// キーから PascalCase の型名を作る（英数字以外は区切りとして扱う）。作れなければ空文字
export function toPascalCase(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

// 配列の要素の型名用に、英語の複数形を素朴に単数形にする
export function singularize(name) {
  if (/ies$/.test(name) && name.length > 3) return name.slice(0, -3) + 'y';
  if (/(ss|us|is)$/.test(name)) return name;
  if (/(sh|ch|x|z)es$/.test(name)) return name.slice(0, -2);
  if (/s$/.test(name) && name.length > 1) return name.slice(0, -1);
  return name;
}

function sanitizeTypeName(name, fallback) {
  let n = name || fallback;
  if (/^[0-9]/.test(n)) n = '_' + n;
  if (!IDENT.test(n)) n = fallback;
  if (RESERVED.has(n.toLowerCase())) n = n + 'Type';
  return n;
}

// ---- 出力 ----

export const DEFAULT_OPTIONS = {
  rootName: 'Root',
  declaration: 'interface', // 'interface' | 'type'
  exportTypes: true,
  readonly: false,
  optional: 'question', // 'question'（key?: T） | 'undefined'（key: T | undefined） | 'required'（区別しない）
};

const PRIM_ORDER = ['string', 'number', 'boolean', 'null'];

export function generateTypescript(rootType, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rootName = sanitizeTypeName(toPascalCase(opts.rootName.trim()) || opts.rootName.trim(), 'Root');

  const used = new Set();
  const decls = []; // { name, body }
  const byBody = new Map(); // 本文が同じ型は同じ名前を使い回す

  function uniqueName(base) {
    let name = base;
    for (let n = 2; used.has(name); n++) name = base + n;
    used.add(name);
    return name;
  }

  // オブジェクトの形を宣言として登録し、その型名を返す
  function declareShape(shape, baseName) {
    // 先に名前を予約して、親の宣言が子より先に並ぶようにする
    const slot = { name: null, body: null };
    const reserved = uniqueName(baseName);
    decls.push(slot);

    const lines = [];
    for (const [key, f] of shape.fields) {
      const childBase = sanitizeTypeName(toPascalCase(key), baseName + 'Child');
      let t = renderType(f.type, childBase);
      const missing = f.count < shape.count;
      let mark = '';
      if (missing && opts.optional === 'question') mark = '?';
      if (missing && opts.optional === 'undefined') t += ' | undefined';
      lines.push(`  ${opts.readonly ? 'readonly ' : ''}${formatKey(key)}${mark}: ${t};`);
    }
    const body = lines.join('\n');

    if (byBody.has(body)) {
      used.delete(reserved);
      decls.splice(decls.indexOf(slot), 1);
      return byBody.get(body);
    }
    slot.name = reserved;
    slot.body = body;
    byBody.set(body, reserved);
    return reserved;
  }

  // 型をユニオンの文字列にする。nameHint はオブジェクトが現れたときの型名の候補
  function renderType(t, nameHint) {
    const parts = [];
    if (t.obj) {
      parts.push(t.obj.fields.size === 0 ? 'Record<string, unknown>' : declareShape(t.obj, nameHint));
    }
    if (t.arr) {
      if (!t.arr.elem) parts.push('unknown[]');
      else {
        const itemHint = singularize(nameHint) === nameHint ? nameHint + 'Item' : singularize(nameHint);
        const elem = renderType(t.arr.elem, itemHint);
        parts.push(/[|&]/.test(elem) ? `(${elem})[]` : `${elem}[]`);
      }
    }
    for (const p of PRIM_ORDER) if (t.prims.has(p)) parts.push(p);
    return parts.length ? parts.join(' | ') : 'unknown';
  }

  const ex = opts.exportTypes ? 'export ' : '';
  let rootLine = null;
  // ルートが「オブジェクトだけ」なら宣言そのものを Root にし、それ以外は type エイリアスにする
  if (rootType.obj && rootType.obj.fields.size > 0 && !rootType.arr && rootType.prims.size === 0) {
    declareShape(rootType.obj, rootName);
  } else {
    used.add(rootName);
    const hint = rootName;
    rootLine = `${ex}type ${rootName} = ${renderType(rootType, hint)};`;
  }

  const blocks = decls.map(({ name, body }) => {
    const inner = body ? `{\n${body}\n}` : '{}';
    return opts.declaration === 'type' ? `${ex}type ${name} = ${inner};` : `${ex}interface ${name} ${inner}`;
  });
  if (rootLine) blocks.unshift(rootLine);
  return blocks.join('\n\n') + '\n';
}

// テキストから一気に変換する。成功時は { code }、パースエラー時は { error }
export function jsonToTypescript(text, options) {
  try {
    const node = parseJson(text);
    return { code: generateTypescript(inferType(node), options), error: null };
  } catch (e) {
    if (e instanceof JsonParseError) return { code: '', error: e };
    throw e;
  }
}
