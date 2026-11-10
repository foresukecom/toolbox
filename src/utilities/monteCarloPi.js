// モンテカルロ法による円周率推定のロジック（DOM に依存しない純粋関数群）
// 乱数関数を引数で差し替えられるようにしてあるので、Node でもそのまま検証できる。

// 推定値の理論上の標準偏差の係数: 4 * sqrt(p(1-p))、p = π/4
const SIGMA_COEF = 4 * Math.sqrt((Math.PI / 4) * (1 - Math.PI / 4));

// 単位正方形 [0,1)×[0,1) 内の点が、原点中心・半径 1 の四分円の内側か
export function isInside(x, y) {
  return x * x + y * y <= 1;
}

// count 個の点を打ち、四分円の内側に入った数を返す
// onPoint(x, y, inside) を渡すと 1 点ごとに呼ばれる（描画用）
export function throwPoints(count, rng = Math.random, onPoint = null) {
  let inside = 0;
  for (let i = 0; i < count; i++) {
    const x = rng();
    const y = rng();
    const hit = isInside(x, y);
    if (hit) inside++;
    if (onPoint) onPoint(x, y, hit);
  }
  return inside;
}

// π ≈ 4 × (内側の点 / 全体の点)
export function estimatePi(inside, total) {
  return total > 0 ? (4 * inside) / total : 0;
}

// total 個の点でまとめて推定する
export function simulate(total, rng = Math.random) {
  const inside = throwPoints(total, rng);
  return { total, inside, estimate: estimatePi(inside, total) };
}

// 点の数が n のときの推定値の標準偏差（理論値）
export function theoreticalSigma(n) {
  return n > 0 ? SIGMA_COEF / Math.sqrt(n) : Infinity;
}

// 表示用の文字列と、本物の π と先頭から一致している文字数を返す
// 例: 3.141600 → { text: '3.141600', matched: 5 }（'3.141' まで一致）
export function compareWithPi(estimate, decimals = 6) {
  const text = estimate.toFixed(decimals);
  // π 側は四捨五入せず切り捨てた桁で比べる（桁がそのまま並ぶように）
  const piText = Math.PI.toFixed(15).slice(0, text.length);
  let matched = 0;
  while (matched < text.length && text[matched] === piText[matched]) matched++;
  // 小数点だけ一致して終わる場合は数えない（'3.' より '3' のほうが自然）
  if (text[matched - 1] === '.') matched--;
  return { text, matched };
}

// 推定値の推移を対数間隔で間引いて記録する
// 点の数が ratio 倍になるごとに 1 件だけ記録するので、件数は log(N) に比例する
export function createHistory(ratio = 1.02) {
  return { ratio, next: 1, points: [] };
}

export function recordHistory(history, total, estimate) {
  if (total < history.next) return false;
  history.points.push({ n: total, estimate });
  history.next = Math.max(total + 1, Math.ceil(total * history.ratio));
  return true;
}

// テスト用の再現性のある乱数（mulberry32）
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
