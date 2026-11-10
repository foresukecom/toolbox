// ランダムウォークのロジック（DOM に依存しない純粋関数群）
// 乱数関数を引数で差し替えられるようにしてあるので、Node でもそのまま検証できる。

export const MODES = ['lattice', 'continuous', 'line'];

// 連続方向モードで「原点に戻った」とみなす半径（1 歩の長さは 1）
export const CONTINUOUS_RETURN_RADIUS = 0.5;

// count 個の粒子を原点に置いた状態を作る
export function createWalkers(count) {
  return {
    count,
    steps: 0,
    x: new Float64Array(count),
    y: new Float64Array(count),
    // 粒子ごとの原点に戻った回数
    returns: new Uint32Array(count),
  };
}

// 粒子 i を 1 歩動かす。原点に戻ったら true を返す
// lattice: 上下左右のどれか / continuous: ランダムな角度へ長さ 1 / line: 左右のどれか（y は使わない）
export function stepWalker(state, i, mode, rng = Math.random) {
  const { x, y } = state;
  if (mode === 'lattice') {
    const d = Math.floor(rng() * 4);
    if (d === 0) x[i] += 1;
    else if (d === 1) x[i] -= 1;
    else if (d === 2) y[i] += 1;
    else y[i] -= 1;
    return x[i] === 0 && y[i] === 0;
  }
  if (mode === 'continuous') {
    const a = rng() * Math.PI * 2;
    x[i] += Math.cos(a);
    y[i] += Math.sin(a);
    return x[i] * x[i] + y[i] * y[i] < CONTINUOUS_RETURN_RADIUS * CONTINUOUS_RETURN_RADIUS;
  }
  x[i] += rng() < 0.5 ? -1 : 1;
  return x[i] === 0;
}

// すべての粒子を 1 歩ずつ動かす
// onMove(i, x, y) を渡すと粒子ごとに移動後の座標で呼ばれる（描画用）
export function stepAll(state, mode, rng = Math.random, onMove = null) {
  for (let i = 0; i < state.count; i++) {
    if (stepWalker(state, i, mode, rng)) state.returns[i]++;
    if (onMove) onMove(i, state.x[i], state.y[i]);
  }
  state.steps++;
}

// 平均二乗変位 ⟨x² + y²⟩
export function meanSquaredDisplacement(state) {
  if (state.count === 0) return 0;
  let sum = 0;
  for (let i = 0; i < state.count; i++) sum += state.x[i] * state.x[i] + state.y[i] * state.y[i];
  return sum / state.count;
}

// 理論値: 1 歩の長さが 1 で向きが独立なら、どのモードでも MSD = ステップ数
export function theoreticalMsd(steps) {
  return steps;
}

export function totalReturns(state) {
  let sum = 0;
  for (let i = 0; i < state.count; i++) sum += state.returns[i];
  return sum;
}

// 原点からの最大距離（ビューを広げる判定用）。line モードは |x| のみ
export function maxExtent(state) {
  let m = 0;
  for (let i = 0; i < state.count; i++) {
    m = Math.max(m, Math.abs(state.x[i]), Math.abs(state.y[i]));
  }
  return m;
}

// n 歩までに原点へ戻る回数の期待値（1 粒子あたり）を逐次計算する
// 2k 歩目に原点にいる確率 u は、1 次元で C(2k,k)/4^k、2 次元格子でその 2 乗
// ステップ数は単調に増えるので、前回の続きから足していく
export function createReturnTheory() {
  return { k: 0, u: 1, line: 0, lattice: 0 };
}

export function expectedReturns(theory, mode, steps) {
  const m = Math.floor(steps / 2);
  if (m < theory.k) {
    // 巻き戻ったときは最初から
    Object.assign(theory, createReturnTheory());
  }
  while (theory.k < m) {
    theory.k++;
    // u_{2k} = u_{2k-2} × (2k-1) / (2k)
    theory.u *= (2 * theory.k - 1) / (2 * theory.k);
    theory.line += theory.u;
    theory.lattice += theory.u * theory.u;
  }
  if (mode === 'line') return theory.line;
  if (mode === 'lattice') return theory.lattice;
  return null;
}

// グラフ用の履歴。件数が上限を超えたら 1 つおきに間引き、記録間隔を 2 倍にする
export function createHistory(limit = 400) {
  return { limit, interval: 1, points: [] };
}

export function recordHistory(history, steps, msd) {
  if (steps % history.interval !== 0) return false;
  history.points.push({ steps, msd });
  if (history.points.length > history.limit) {
    history.interval *= 2;
    history.points = history.points.filter((p) => p.steps % history.interval === 0);
  }
  return true;
}

// 1 次元の位置のヒストグラム
// n 歩後の位置は n と同じ偶奇なので、幅 2 の倍数のビンを偶奇に合わせて並べる
// 返す density は「1 あたりの確率密度」に換算したもの（ガウス曲線と同じ縦軸で比べられる）
export function lineHistogram(positions, steps, maxBins = 31) {
  const sigma = Math.sqrt(Math.max(steps, 1));
  const range = Math.max(4, Math.ceil(3.5 * sigma));
  let width = 2;
  while ((2 * range) / width > maxBins) width += 2;
  // 1 ビンに入る格子点は width/2 個。奇数個なら格子点を中心に、偶数個なら格子点の間を中心にする
  const offset = (steps % 2) + ((width / 2) % 2 === 0 ? 1 : 0);
  const half = Math.ceil(range / width);
  const bins = [];
  for (let b = -half; b <= half; b++) {
    const center = b * width + offset;
    bins.push({ center, from: center - width / 2, to: center + width / 2, count: 0 });
  }
  const n = positions.length;
  for (let i = 0; i < n; i++) {
    const b = Math.round((positions[i] - offset) / width) + half;
    if (b >= 0 && b < bins.length) bins[b].count++;
  }
  for (const bin of bins) bin.density = n > 0 ? bin.count / n / width : 0;
  return { width, bins, sigma };
}

// 平均 0、分散 steps の正規分布の密度
export function gaussianDensity(x, steps) {
  const v = Math.max(steps, 1);
  return Math.exp((-x * x) / (2 * v)) / Math.sqrt(2 * Math.PI * v);
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
