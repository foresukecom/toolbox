// 数学定数の桁を 1 桁ずつ計算する生成器（DOM に依存しないので Node でもそのまま検証できる）。
// どの生成器も take(maxDigits, deadline) で「小数点以下の桁」を最大 maxDigits 桁返し、
// deadline（performance.now() の値）を過ぎたら途中で打ち切る。整数部は intPart に持つ。

// --- 級数のスピゴット ---
// 定数を入れ子の形 c = z0(L1(L2(L3(...)))) で表す。Lk(x) = (A x + B) / C は 1 次分数変換で、
// 尻尾の値 x は常に [1, 2] に収まるように選んである。現在の変換 z(x) = (q x + r) / t について
// z(1) と z(2) の整数部が一致すれば、その桁は確定（Gibbons の無限スピゴットと同じ考え方）。
class SeriesSpigot {
  // term(k) は k 番目の変換の係数 [A, B, C]（BigInt）を返す
  constructor(q, r, t, term) {
    this.q = q;
    this.r = r;
    this.t = t;
    this.k = 1n;
    this.term = term;
    this.intPart = null; // 最初に確定する桁は整数部
  }

  take(maxDigits, deadline) {
    const out = [];
    let { q, r, t, k } = this;
    while (out.length < maxDigits && performance.now() < deadline) {
      const lo = (q + r) / t;
      if (lo === (2n * q + r) / t) {
        // 桁 lo が確定した。z ← 10 (z − lo)
        if (this.intPart === null) this.intPart = Number(lo);
        else out.push(Number(lo));
        r = 10n * (r - lo * t);
        q *= 10n;
      } else {
        // 次の項を取り込む: z ← z ∘ Lk
        const [a, b, c] = this.term(k);
        r = q * b + r * c;
        q *= a;
        t *= c;
        k += 1n;
      }
    }
    Object.assign(this, { q, r, t, k });
    return out;
  }
}

// e = 1 + 1/1 (1 + 1/2 (1 + 1/3 (…)))。Lk(x) = 1 + x/k = (x + k) / k
function eSpigot() {
  return new SeriesSpigot(1n, 0n, 1n, k => [1n, k, k]);
}

// ln 2 = 2 artanh(1/3) = Σ 2 / ((2k+1) 3^(2k+1))（k = 0, 1, …）。Σ 1/(k 2^k) より項が速く小さくなるので BigInt が膨らみにくい。
// 隣り合う項の比は (2k−1) / (9(2k+1)) なので ln 2 = 2/3 (1 + 1/27 (1 + 3/45 (…)))、Lk(x) = 1 + (2k−1) x / (9(2k+1))
function ln2Spigot() {
  return new SeriesSpigot(2n, 0n, 3n, k => [2n * k - 1n, 9n * (2n * k + 1n), 9n * (2n * k + 1n)]);
}

// --- 開平法（筆算の平方根） ---
// √n を 1 桁ずつ確定させる。p はここまでの根（整数として）、rem は余り。
// 次の桁 x は (20p + x) x ≤ 100 rem を満たす最大の 0〜9。
class SqrtDigits {
  constructor(n) {
    let p = 0n;
    while ((p + 1n) * (p + 1n) <= n) p += 1n;
    this.p = p;
    this.rem = n - p * p;
    this.intPart = Number(p);
  }

  next() {
    const c = 100n * this.rem;
    const base = 20n * this.p;
    // 割り算で見当を付けてから、はみ出していれば 1 ずつ下げる
    let x = c / base;
    if (x > 9n) x = 9n;
    while ((base + x) * x > c) x -= 1n;
    this.rem = c - (base + x) * x;
    this.p = this.p * 10n + x;
    return Number(x);
  }

  take(maxDigits, deadline) {
    const out = [];
    while (out.length < maxDigits && performance.now() < deadline) out.push(this.next());
    return out;
  }
}

// φ = (1 + √5) / 2。√5 の桁列に 1 を足した 3.236… を、筆算の割り算で左から 2 で割っていく。
// 2 で割る筆算は先の桁を見なくても確定するので、√5 の桁が出るたびに φ の桁が 1 つ決まる
class GoldenRatioDigits {
  constructor() {
    this.sqrt5 = new SqrtDigits(5n);
    const head = this.sqrt5.intPart + 1; // 1 + √5 の整数部 = 3
    this.intPart = Math.floor(head / 2);
    this.carry = head % 2;
  }

  take(maxDigits, deadline) {
    const out = [];
    while (out.length < maxDigits && performance.now() < deadline) {
      const v = this.carry * 10 + this.sqrt5.next();
      out.push(Math.floor(v / 2));
      this.carry = v % 2;
    }
    return out;
  }
}

// 画面で選べる定数。notes は「pos 桁目まで出たら出す一言」
export const CONSTANTS = [
  {
    key: 'e',
    symbol: 'e',
    intPart: 2, // 表示用の整数部
    label: 'ネイピア数 e',
    method: '級数 e = 1 + 1/1! + 1/2! + … を入れ子の 1 次分数変換として BigInt で持ち、桁が確定するたびに取り出すスピゴット・アルゴリズム',
    normalNote: 'e の各数字も同じくらいの割合（10%）で現れると予想されていますが、まだ証明されていません。',
    create: eSpigot,
    notes: [
      { pos: 9, text: '「1828」が 2 回続きます（2.7 1828 1828）。覚えやすい並びとして有名です。' },
      { pos: 15, text: '続く「45 90 45」は直角二等辺三角形の角度と同じ並び（2.718281828 459045）。' },
      { pos: 108, text: '99〜108桁目の「7427466391」は、e の中に連続して現れる最初の 10 桁の素数。2004 年に Google がこの数を答えにした謎解き看板を出しました。' },
    ],
  },
  {
    key: 'sqrt2',
    symbol: '√2',
    intPart: 1, // 表示用の整数部
    label: '√2',
    method: '筆算の平方根（開平法）を BigInt で 1 桁ずつ進めています',
    normalNote: '√2 のような無理数の代数的数はどれも正規数だろうと予想されています（未証明）。',
    create: () => new SqrtDigits(2n),
    notes: [
      { pos: 1, text: '√2 は辺 1 の正方形の対角線の長さ。分数では表せない（無理数である）ことが古代ギリシャで示されました。' },
      { pos: 4, text: 'A 判・B 判の紙の縦横比は 1 : √2。半分に折っても同じ形になります。' },
      { pos: 8, text: '1.41421356 —「一夜一夜に人見頃（ひとよひとよにひとみごろ）」で覚えられるのはここまで。' },
    ],
  },
  {
    key: 'phi',
    symbol: 'φ',
    intPart: 1, // 表示用の整数部
    label: '黄金比 φ',
    method: '開平法で √5 を 1 桁ずつ求め、1 を足して筆算で 2 で割る形で φ = (1 + √5) / 2 の桁を確定させています',
    normalNote: 'φ は √5 から作られる代数的数で、各数字は同じくらいの割合で現れると予想されています（未証明）。',
    create: () => new GoldenRatioDigits(),
    notes: [
      { pos: 3, text: 'φ は x² = x + 1 の解。φ² = 2.618…、1/φ = 0.618… と、小数部分がどれも同じになります。' },
      { pos: 10, text: 'フィボナッチ数列の隣り合う項の比（13/8、21/13、…）はこの値に近づいていきます。' },
      { pos: 20, text: 'φ の連分数は [1; 1, 1, 1, …] と 1 だけが並び、有理数でもっとも近似しにくい数として知られています。' },
    ],
  },
  {
    key: 'sqrt3',
    symbol: '√3',
    intPart: 1, // 表示用の整数部
    label: '√3',
    method: '筆算の平方根（開平法）を BigInt で 1 桁ずつ進めています',
    normalNote: '√3 も代数的な無理数で、正規数だろうと予想されています（未証明）。',
    create: () => new SqrtDigits(3n),
    notes: [
      { pos: 7, text: '1.7320508 —「人並みに奢れや（ひとなみにおごれや）」で覚えられるのはここまで。' },
      { pos: 12, text: '√3 は 1 辺 2 の正三角形の高さ。正三角形の高さは 1 辺の √3/2 倍です。' },
    ],
  },
  {
    key: 'ln2',
    symbol: 'ln 2',
    intPart: 0, // 表示用の整数部
    label: 'ln 2',
    method: '級数 ln 2 = 2 artanh(1/3) = Σ 2/((2k+1)·3^(2k+1)) を入れ子の 1 次分数変換として BigInt で持ち、桁が確定するたびに取り出すスピゴット・アルゴリズム',
    normalNote: 'ln 2 の各数字も同じくらいの割合で現れると予想されていますが、まだ証明されていません。',
    create: ln2Spigot,
    notes: [
      { pos: 3, text: '「72 の法則」：利率 r% で元本が倍になるのはおよそ 69.3 / r 年。72 は割り切りやすいように丸めた値です。' },
      { pos: 6, text: '放射性物質の半減期 T と崩壊定数 λ は T = ln 2 / λ の関係にあります。' },
      { pos: 10, text: '1 − 1/2 + 1/3 − 1/4 + … と交互に足し引きしても ln 2 になります（ただし収束はとても遅い）。' },
    ],
  },
];

export function findConstant(key) {
  return CONSTANTS.find(c => c.key === key) || CONSTANTS[0];
}
