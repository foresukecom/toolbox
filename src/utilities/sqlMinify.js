// SQL を 1 行に圧縮するためのユーティリティ
// 文字列リテラル・クォート付き識別子の中身は変えず、空白とコメントだけを詰める。

// 方言ごとの字句の違い
const DIALECT_RULES = {
  // バックスラッシュで ' や " をエスケープできる方言
  backslashEscapes: ['mysql', 'mariadb', 'tidb', 'singlestoredb', 'bigquery', 'spark', 'hive', 'clickhouse', 'n1ql'],
  // # を行コメントとして扱う方言
  hashComments: ['mysql', 'mariadb', 'tidb', 'singlestoredb', 'bigquery', 'hive', 'clickhouse'],
  // [識別子] を使う方言
  bracketIdentifiers: ['transactsql', 'sql', 'sqlite'],
  // $tag$ ... $tag$ のドル記号クォートを使う方言
  dollarQuotes: ['postgresql', 'redshift', 'duckdb', 'snowflake'],
  // ''' ... ''' / """ ... """ の三重クォートを使う方言
  tripleQuotes: ['bigquery'],
  // ブロックコメントの入れ子を許す方言
  nestedComments: ['postgresql', 'duckdb'],
};

function rulesFor(language) {
  const rules = {};
  for (const [key, list] of Object.entries(DIALECT_RULES)) {
    rules[key] = list.includes(language);
  }
  return rules;
}

// クォートで始まる部分の終わりの位置（閉じクォートの次）を返す。閉じていなければ -1
function scanQuoted(sql, start, quote, backslash) {
  let i = start + 1;
  while (i < sql.length) {
    const c = sql[i];
    if (backslash && c === '\\') {
      i += 2;
      continue;
    }
    if (c === quote) {
      // 'it''s' のような重ねたクォートはエスケープ
      if (sql[i + 1] === quote) {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i++;
  }
  return -1;
}

// SQL を「空白」「コメント」「その他の字句」に分ける。
// 文字列やクォート付き識別子は 1 つの字句として扱う。
export function splitSql(sql, language = 'sql') {
  const rules = rulesFor(language);
  const parts = [];
  let i = 0;
  let text = '';
  const flushText = () => {
    if (text) {
      parts.push({ type: 'text', value: text });
      text = '';
    }
  };
  const push = (type, end) => {
    flushText();
    parts.push({ type, value: sql.slice(i, end) });
    i = end;
  };

  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];

    if (/\s/.test(c)) {
      let end = i + 1;
      while (end < sql.length && /\s/.test(sql[end])) end++;
      push('space', end);
      continue;
    }

    // 行コメント
    if ((c === '-' && next === '-') || (c === '#' && rules.hashComments)) {
      let end = sql.indexOf('\n', i);
      if (end < 0) end = sql.length;
      push('lineComment', end);
      continue;
    }

    // ブロックコメント
    if (c === '/' && next === '*') {
      let depth = 1;
      let end = i + 2;
      while (end < sql.length && depth > 0) {
        if (sql.startsWith('*/', end)) {
          depth--;
          end += 2;
        } else if (rules.nestedComments && sql.startsWith('/*', end)) {
          depth++;
          end += 2;
        } else {
          end++;
        }
      }
      if (depth > 0) throw new Error('閉じられていないコメント（/* … */）があります');
      push('blockComment', end);
      continue;
    }

    // 三重クォート（BigQuery）
    if (rules.tripleQuotes && (c === "'" || c === '"') && sql.startsWith(c.repeat(3), i)) {
      const close = sql.indexOf(c.repeat(3), i + 3);
      if (close < 0) throw new Error('閉じられていない文字列があります');
      push('quoted', close + 3);
      continue;
    }

    // ドル記号クォート（PostgreSQL など）
    if (rules.dollarQuotes && c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      // 直前が識別子の文字なら $ は識別子の一部
      if (m && !/[A-Za-z0-9_]$/.test(text)) {
        const close = sql.indexOf(m[0], i + m[0].length);
        if (close < 0) throw new Error('閉じられていないドル記号クォート（$$ … $$）があります');
        push('quoted', close + m[0].length);
        continue;
      }
    }

    if (c === "'" || c === '"' || c === '`' || (c === '[' && rules.bracketIdentifiers)) {
      const closeChar = c === '[' ? ']' : c;
      // E'...'（PostgreSQL）はバックスラッシュでエスケープする
      const escapePrefix = c === "'" && /(^|[^A-Za-z0-9_])[eE]$/.test(text);
      const backslash = c !== '`' && c !== '[' && (rules.backslashEscapes || escapePrefix);
      const end = c === '[' ? sql.indexOf(']', i) + 1 : scanQuoted(sql, i, closeChar, backslash);
      if (end <= 0) {
        throw new Error(c === "'" ? '閉じられていない文字列があります' : `閉じられていない識別子（${c} … ${closeChar}）があります`);
      }
      // 接頭辞（N'..' / E'..' / b'..' など）とつなげて 1 つの字句にする
      text += sql.slice(i, end);
      i = end;
      continue;
    }

    text += c;
    i++;
  }
  flushText();
  return parts;
}

// 前後の空白を省いてよい記号
const TIGHT_CHARS = new Set(['(', ')', ',', ';']);

// SQL を 1 行に圧縮する。keepComments が true なら行コメントを /* */ に変えて残す
export function minifySql(sql, { language = 'sql', keepComments = false } = {}) {
  const parts = splitSql(sql, language);
  const tokens = [];
  for (const part of parts) {
    if (part.type === 'space') {
      tokens.push(' ');
    } else if (part.type === 'lineComment' || part.type === 'blockComment') {
      if (keepComments) {
        let body = part.type === 'lineComment' ? part.value.replace(/^(--|#)/, '').trim() : part.value;
        if (part.type === 'lineComment') body = `/* ${body.replace(/\*\//g, '* /')} */`;
        // 複数行のコメントも 1 行にする
        tokens.push(' ', body.replace(/\s+/g, ' '), ' ');
      } else {
        // コメントを消すと前後の字句がくっつくので空白に置き換える（例: 5 -/*c*/-3）
        tokens.push(' ');
      }
    } else {
      tokens.push(part.value);
    }
  }

  // 空白を 1 つにまとめ、括弧・カンマ・セミコロンの前後の空白は取る
  let out = '';
  let pendingSpace = false;
  for (const t of tokens) {
    if (t === ' ') {
      pendingSpace = out !== '';
      continue;
    }
    if (pendingSpace) {
      const prev = out[out.length - 1];
      const first = t[0];
      const tightPrev = TIGHT_CHARS.has(prev) && prev !== ')' && prev !== ';';
      const tightNext = TIGHT_CHARS.has(first) && first !== '(';
      if (!tightPrev && !tightNext) out += ' ';
      pendingSpace = false;
    }
    out += t;
  }
  return out;
}
