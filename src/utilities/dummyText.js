// ダミーテキスト・ダミーデータ生成のロジック（DOM に依存しない純粋関数群）
// 文章は下の語彙・文の部品から組み立てる。既存の文章はそのまま埋め込まない。

// ---- 擬似乱数 ----

// 文字列シードを 32bit の整数にする（FNV-1a）
export function hashSeed(seed) {
  let h = 0x811c9dc5;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: 同じシードなら同じ列を返す [0, 1) の乱数関数
export function createRng(seed) {
  let a = hashSeed(seed);
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function chance(rng, p) {
  return rng() < p;
}

// サロゲートペアも 1 文字として数える
export function charLength(text) {
  return Array.from(text).length;
}

// ---- 日本語の文章風 ----

const JA = {
  times: ['今日', '昨日の夕方', '週末', '朝早く', '春になると', '雨の日には', '夜遅く', 'ある晴れた午後', '夏休みの間', '冬の朝', 'しばらくして', '帰り道'],
  places: ['駅前の公園', '小さな図書館', '海沿いの道', '古い喫茶店', '静かな部屋', '山の上の広場', '商店街の角', '川のほとり', '窓際の席', '校舎の屋上', '市場の奥', 'バス停の近く'],
  subjects: ['私', '彼女', '友人', '先生', '子どもたち', '猫', '隣の人', '店主', '旅人', '祖母', '兄', 'クラスの仲間'],
  adjectives: ['新しい', '古い', '静かな', '不思議な', '温かい', '小さな', '大きな', 'きれいな', '懐かしい', '青い', '丸い', '柔らかい', '鮮やかな', '素朴な'],
  objects: ['手紙', '地図', 'ノート', 'コーヒー', '写真', '物語', '計画', 'メロディー', 'カメラ', '花束', '料理', 'パン', 'ピアノ', '帽子', 'ランプ', '鍵', '傘', 'スケッチ', '本', 'カード'],
  verbs: ['読んだ', '書いた', '眺めていた', '探している', '作りました', '見つけた', '運んだ', '選びました', '届けた', '磨いている', '並べた', '思い出した', '包みました', '受け取った'],
  teVerbs: ['歩いて', '立ち止まって', '少し考えて', '空を見上げて', '扉を開けて', '席に座って', '深呼吸をして', '笑って'],
  adverbs: ['ゆっくりと', '静かに', '少しずつ', '何度も', 'いつも', '思わず', 'そっと', '丁寧に', 'のんびりと', 'じっくりと'],
  predicates: ['とても静かだった', '思ったより大きい', '少し不思議な形をしている', 'どこか懐かしい', '今でも大切にしている', '誰にも見せていない', '毎日少しずつ増えている', '驚くほど軽かった'],
  demonstratives: ['その', 'あの', 'この'],
};

// 句読点付きの日本語の文を 1 つ作る
function jaSentence(rng) {
  const adj = () => (chance(rng, 0.6) ? pick(rng, JA.adjectives) : '');
  switch (randInt(rng, 0, 4)) {
    case 0: {
      const head = chance(rng, 0.7) ? `${pick(rng, JA.times)}、` : '';
      const place = chance(rng, 0.6) ? `${pick(rng, JA.places)}で` : '';
      return `${head}${pick(rng, JA.subjects)}は${place}${adj()}${pick(rng, JA.objects)}を${pick(rng, JA.verbs)}。`;
    }
    case 1:
      return `${pick(rng, JA.subjects)}は${pick(rng, JA.adverbs)}${adj()}${pick(rng, JA.objects)}を${pick(rng, JA.verbs)}。`;
    case 2:
      return `${pick(rng, JA.subjects)}は${pick(rng, JA.teVerbs)}、${pick(rng, JA.adverbs)}${pick(rng, JA.objects)}を${pick(rng, JA.verbs)}。`;
    case 3:
      return `${pick(rng, JA.demonstratives)}${adj()}${pick(rng, JA.objects)}は${pick(rng, JA.predicates)}。`;
    default:
      return `${pick(rng, JA.places)}には${adj()}${pick(rng, JA.objects)}があり、${pick(rng, JA.subjects)}はそれを${pick(rng, JA.verbs)}。`;
  }
}

// ---- 英語 Lorem ipsum ----

const LOREM_WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ' +
  'enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in ' +
  'reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa ' +
  'qui officia deserunt mollit anim id est laborum integer porttitor vitae mauris tincidunt suscipit pellentesque habitant ' +
  'morbi tristique senectus netus malesuada fames ac turpis egestas vivamus sagittis lacus vel augue laoreet rutrum faucibus'
).split(' ');

const LOREM_OPENING = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function loremSentence(rng) {
  const count = randInt(rng, 5, 14);
  const words = [];
  for (let i = 0; i < count; i++) words.push(pick(rng, LOREM_WORDS));
  // 長めの文には途中にカンマを 1 つ入れる
  if (count >= 8 && chance(rng, 0.6)) {
    const at = randInt(rng, 2, count - 3);
    words[at] += ',';
  }
  words[0] = capitalize(words[0]);
  return `${words.join(' ')}.`;
}

// ---- 文章の組み立て ----

// 句読点（、。 / , .）を除く。文の区切りは sentenceJoiner が受け持つ
function stripPunctuation(sentence, lang) {
  if (lang === 'ja') return sentence.replace(/、/g, '').replace(/。/g, '');
  return sentence.replace(/[.,]/g, '');
}

function makeSentence(rng, lang, punctuation, isFirst, loremStart) {
  const raw = lang === 'ja' ? jaSentence(rng) : isFirst && loremStart ? LOREM_OPENING : loremSentence(rng);
  return punctuation ? raw : stripPunctuation(raw, lang);
}

// 文と文の間に入れる文字（英語は空白、日本語は句読点ありなら無し・なしなら全角スペース）
function sentenceJoiner(lang, punctuation) {
  if (lang === 'en') return ' ';
  return punctuation ? '' : '\u3000';
}

// 文数指定: 段落ごとに sentences 文
function paragraphsBySentences(rng, opts) {
  const { lang, punctuation, paragraphs, sentences, loremStart } = opts;
  const joiner = sentenceJoiner(lang, punctuation);
  const result = [];
  for (let p = 0; p < paragraphs; p++) {
    const list = [];
    for (let s = 0; s < sentences; s++) {
      list.push(makeSentence(rng, lang, punctuation, p === 0 && s === 0, loremStart));
    }
    result.push(list.join(joiner));
  }
  return result;
}

// 末尾に来ると不自然な文字（読点・空白など）
const BAD_TAIL = /[、,\s\u3000]$/;
const FILLER = { ja: 'の', en: 'e' };

// ちょうど length 文字の段落を作る。足りなくなるまで文を足し、最後の文は切り詰める
function paragraphOfLength(rng, length, opts, isFirst) {
  const { lang, punctuation, loremStart } = opts;
  const joiner = sentenceJoiner(lang, punctuation);
  const period = lang === 'ja' ? '。' : '.';
  let text = '';
  let first = isFirst;
  while (charLength(text) < length) {
    const sentence = makeSentence(rng, lang, punctuation, first, loremStart);
    first = false;
    text = text === '' ? sentence : text + joiner + sentence;
  }
  let chars = Array.from(text);
  if (chars.length === length) return text;

  chars = chars.slice(0, length);
  // 途中で切ったときは、句読点ありなら最後を句点にする（1 文字しかないときはそのまま）
  if (punctuation && length >= 2) {
    chars[length - 1] = period;
    while (chars.length >= 2 && BAD_TAIL.test(chars[chars.length - 2])) {
      chars[chars.length - 2] = FILLER[lang];
    }
  } else {
    while (BAD_TAIL.test(chars[chars.length - 1])) chars[chars.length - 1] = FILLER[lang];
  }
  return chars.join('');
}

// 文字数指定: 合計ちょうど totalChars 文字を paragraphs 段落に配分する（余りは前の段落から 1 文字ずつ）
function paragraphsByChars(rng, opts) {
  const { totalChars, paragraphs } = opts;
  const base = Math.floor(totalChars / paragraphs);
  const extra = totalChars % paragraphs;
  const result = [];
  for (let p = 0; p < paragraphs; p++) {
    result.push(paragraphOfLength(rng, base + (p < extra ? 1 : 0), opts, p === 0));
  }
  return result;
}

// 段落の配列を返す
// opts: { lang: 'ja' | 'en', mode: 'chars' | 'sentences', totalChars, sentences, paragraphs, punctuation, loremStart }
export function generateParagraphs(seed, opts) {
  const rng = createRng(seed);
  return opts.mode === 'chars' ? paragraphsByChars(rng, opts) : paragraphsBySentences(rng, opts);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function paragraphsToText(paragraphs, separator) {
  return paragraphs.join(separator);
}

export function paragraphsToHtml(paragraphs) {
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
}

// ---- ダミーの個人データ ----
// 実在の情報と紛れないよう、メールは example.com 等（RFC 2606 の予約ドメイン）、
// 電話番号は 0x0-0000-xxxx、郵便番号は使われていない 000- で始まる番号、市区町村名は架空のものを使う。

const SURNAMES = [
  ['佐藤', 'さとう', 'sato'], ['鈴木', 'すずき', 'suzuki'], ['高橋', 'たかはし', 'takahashi'], ['田中', 'たなか', 'tanaka'],
  ['伊藤', 'いとう', 'ito'], ['渡辺', 'わたなべ', 'watanabe'], ['山本', 'やまもと', 'yamamoto'], ['中村', 'なかむら', 'nakamura'],
  ['小林', 'こばやし', 'kobayashi'], ['加藤', 'かとう', 'kato'], ['吉田', 'よしだ', 'yoshida'], ['山田', 'やまだ', 'yamada'],
  ['佐々木', 'ささき', 'sasaki'], ['松本', 'まつもと', 'matsumoto'], ['井上', 'いのうえ', 'inoue'], ['木村', 'きむら', 'kimura'],
  ['林', 'はやし', 'hayashi'], ['清水', 'しみず', 'shimizu'], ['森', 'もり', 'mori'], ['池田', 'いけだ', 'ikeda'],
];

const GIVEN_NAMES = [
  ['太郎', 'たろう', 'taro'], ['花子', 'はなこ', 'hanako'], ['翔太', 'しょうた', 'shota'], ['美咲', 'みさき', 'misaki'],
  ['健一', 'けんいち', 'kenichi'], ['陽菜', 'ひな', 'hina'], ['大輔', 'だいすけ', 'daisuke'], ['結衣', 'ゆい', 'yui'],
  ['拓海', 'たくみ', 'takumi'], ['さくら', 'さくら', 'sakura'], ['悠人', 'ゆうと', 'yuto'], ['葵', 'あおい', 'aoi'],
  ['直樹', 'なおき', 'naoki'], ['真由美', 'まゆみ', 'mayumi'], ['蓮', 'れん', 'ren'], ['彩', 'あや', 'aya'],
  ['誠', 'まこと', 'makoto'], ['七海', 'ななみ', 'nanami'], ['和也', 'かずや', 'kazuya'], ['恵', 'めぐみ', 'megumi'],
];

const PREFECTURES = ['東京都', '大阪府', '北海道', '神奈川県', '愛知県', '福岡県', '京都府', '宮城県', '広島県', '長野県', '静岡県', '沖縄県'];

// 架空の市区町村・町名の部品
const CITY_STEMS = ['ダミー', 'サンプル', 'テスト', '架空', '見本', '仮想'];
const CITY_SUFFIXES = ['市', '町', '村'];
const TOWNS = ['みほん台', 'ためし野', 'かりの丘', 'れいだい町', 'ぎじ本町', 'もくし原'];
const BUILDINGS = ['', '', 'ダミーハイツ', 'サンプル荘', 'テストマンション'];

const EMAIL_DOMAINS = ['example.com', 'example.net', 'example.org'];
const MOBILE_PREFIXES = ['090', '080', '070'];

function pad(n, width) {
  return String(n).padStart(width, '0');
}

function dummyPerson(rng, index) {
  const [sei, seiKana, seiRoma] = pick(rng, SURNAMES);
  const [mei, meiKana, meiRoma] = pick(rng, GIVEN_NAMES);
  const building = pick(rng, BUILDINGS);
  const room = building ? ` ${randInt(rng, 1, 9)}0${randInt(rng, 1, 9)}` : '';
  const address =
    pick(rng, PREFECTURES) +
    pick(rng, CITY_STEMS) +
    pick(rng, CITY_SUFFIXES) +
    pick(rng, TOWNS) +
    `${randInt(rng, 1, 9)}-${randInt(rng, 1, 30)}-${randInt(rng, 1, 20)}` +
    (building ? ` ${building}${room}` : '');
  const sep = pick(rng, ['.', '_', '']);
  return {
    id: index + 1,
    name: `${sei} ${mei}`,
    kana: `${seiKana} ${meiKana}`,
    email: `${meiRoma}${sep}${seiRoma}${randInt(rng, 1, 99)}@${pick(rng, EMAIL_DOMAINS)}`,
    phone: `${pick(rng, MOBILE_PREFIXES)}-0000-${pad(randInt(rng, 0, 9999), 4)}`,
    postalCode: `000-${pad(randInt(rng, 0, 9999), 4)}`,
    address,
  };
}

export const PERSON_FIELDS = [
  { key: 'id', label: '番号' },
  { key: 'name', label: '氏名' },
  { key: 'kana', label: 'ふりがな' },
  { key: 'email', label: 'メールアドレス' },
  { key: 'phone', label: '電話番号' },
  { key: 'postalCode', label: '郵便番号' },
  { key: 'address', label: '住所' },
];

// count 件のダミーデータ。fields で指定した項目だけを持つオブジェクトの配列を返す
export function generatePeople(seed, count, fields = PERSON_FIELDS.map((f) => f.key)) {
  const rng = createRng(seed);
  const people = [];
  for (let i = 0; i < count; i++) {
    const full = dummyPerson(rng, i);
    const row = {};
    for (const key of fields) row[key] = full[key];
    people.push(row);
  }
  return people;
}

export function peopleToJson(rows) {
  return JSON.stringify(rows, null, 2);
}

function csvCell(value) {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function peopleToCsv(rows, fields) {
  const lines = [fields.map(csvCell).join(',')];
  for (const row of rows) lines.push(fields.map((key) => csvCell(row[key])).join(','));
  return lines.join('\n');
}
