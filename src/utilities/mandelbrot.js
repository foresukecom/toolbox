// マンデルブロ集合の計算ロジック（DOM に依存しない純粋関数群）
// Web Worker とメインスレッドの両方から使い、Node でもそのまま検証できる。

// 発散判定の半径。大きめにするとスムーズカラーリングの段差が目立たない
const BAILOUT = 256;
const BAILOUT_SQ = BAILOUT * BAILOUT;
// 周期検出で「同じ点に戻った」とみなす距離の 2 乗
const PERIOD_EPS_SQ = 1e-28;

// 集合の内側を表す値（反復値の配列に書き込む）
export const INSIDE = -1;

// 全体が見える初期表示（中心と複素平面上の横幅）
export const HOME_VIEW = Object.freeze({ cx: -0.6, cy: 0, width: 3.6 });

// 倍精度の限界の手前とみなす横幅。これより細かくするとピクセルが粗く見えてくる
export const MIN_WIDTH = 4e-12;

// 主カージオイドと周期 2 の円の内側か（反復せずに内側と判定できる）
export function inMainBulbs(x, y) {
  const xq = x - 0.25;
  const q = xq * xq + y * y;
  if (q * (q + xq) <= 0.25 * y * y) return true;
  const xp = x + 1;
  return xp * xp + y * y <= 0.0625;
}

// c = x + yi について、発散までの滑らかな反復値を返す。集合の内側なら INSIDE
// 滑らかな反復値: n + 1 - log2(ln|z|)（整数の反復回数の段差を消す）
export function escapeValue(x, y, maxIter) {
  if (inMainBulbs(x, y)) return INSIDE;
  let zx = 0;
  let zy = 0;
  let zx2 = 0;
  let zy2 = 0;
  // 周期検出用に保存した点（Brent 法の簡易版: 保存間隔を倍々にする）
  let px = 0;
  let py = 0;
  let period = 8;
  let k = 0;
  for (let n = 0; n < maxIter; n++) {
    zy = 2 * zx * zy + y;
    zx = zx2 - zy2 + x;
    zx2 = zx * zx;
    zy2 = zy * zy;
    if (zx2 + zy2 > BAILOUT_SQ) {
      const logZn = Math.log(zx2 + zy2) / 2;
      const nu = n + 1 - Math.log(logZn / Math.LN2) / Math.LN2;
      return nu > 0 ? nu : 0;
    }
    const dx = zx - px;
    const dy = zy - py;
    if (dx * dx + dy * dy < PERIOD_EPS_SQ) return INSIDE;
    if (++k === period) {
      k = 0;
      period *= 2;
      px = zx;
      py = zy;
    }
  }
  return INSIDE;
}

// 表示範囲の行 y0..y1-1 を計算して out（長さ (y1-y0)*gw）に書き込む
// 画面の上が虚部の大きい側。width は複素平面上の横幅、gw×gh は計算する格子の大きさ
export function renderRows({ cx, cy, width, gw, gh, maxIter }, y0, y1, out) {
  const step = width / gw;
  const left = cx - (gw / 2) * step + step / 2;
  const top = cy + (gh / 2) * step - step / 2;
  let i = 0;
  for (let py = y0; py < y1; py++) {
    const y = top - py * step;
    for (let px = 0; px < gw; px++) {
      out[i++] = escapeValue(left + px * step, y, maxIter);
    }
  }
  return out;
}

// 横幅に応じた最大反復回数（深く潜るほど多く必要になる）
export function maxIterFor(width) {
  const depth = Math.max(0, Math.log10(HOME_VIEW.width / width));
  return Math.round(250 + 160 * depth);
}

// ---- 配色 ----

// パレット: 色の stops を一周させて使う（反復値が大きくなっても循環する）
export const PALETTES = [
  {
    key: 'classic',
    label: 'クラシック',
    inside: [0, 0, 0],
    stops: [[0, 7, 100], [32, 107, 203], [237, 255, 255], [255, 170, 0], [0, 2, 0]],
  },
  {
    key: 'fire',
    label: '炎',
    inside: [0, 0, 0],
    stops: [[20, 0, 0], [140, 10, 0], [235, 90, 0], [255, 200, 40], [255, 250, 220], [120, 20, 0]],
  },
  {
    key: 'ocean',
    label: '海',
    inside: [2, 10, 30],
    stops: [[4, 20, 60], [0, 90, 140], [40, 190, 200], [220, 250, 255], [20, 120, 170], [10, 40, 90]],
  },
  {
    key: 'rainbow',
    label: '虹',
    inside: [0, 0, 0],
    stops: [[230, 50, 50], [240, 200, 40], [60, 200, 80], [40, 170, 230], [100, 70, 220], [220, 60, 180]],
  },
  {
    key: 'mono',
    label: 'モノクロ',
    inside: [0, 0, 0],
    stops: [[20, 20, 20], [245, 245, 245]],
  },
];

// 反復値何回分でパレットを一周するか
const CYCLE = 48;
const LUT_SIZE = 1024;

// 色 (r, g, b) を ImageData の Uint32 表現（リトルエンディアン: ABGR）に変換
function packColor([r, g, b]) {
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

// パレットの色の対応表を作る。戻り値の lut[LUT_SIZE] には内側の色を入れる
export function buildLut(palette) {
  const lut = new Uint32Array(LUT_SIZE + 1);
  const stops = palette.stops;
  const n = stops.length;
  for (let i = 0; i < LUT_SIZE; i++) {
    const pos = (i / LUT_SIZE) * n;
    const k = Math.floor(pos);
    // 隣の色との補間を滑らかにする（smoothstep）
    const t0 = pos - k;
    const t = t0 * t0 * (3 - 2 * t0);
    const a = stops[k];
    const b = stops[(k + 1) % n];
    lut[i] = packColor([0, 1, 2].map((j) => Math.round(a[j] + (b[j] - a[j]) * t)));
  }
  lut[LUT_SIZE] = packColor(palette.inside);
  return lut;
}

// 反復値の配列を色に変換して pixels（Uint32Array）に書き込む
export function colorize(values, lut, pixels) {
  const scale = LUT_SIZE / CYCLE;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < 0) {
      pixels[i] = lut[LUT_SIZE];
    } else {
      pixels[i] = lut[Math.floor(v * scale) % LUT_SIZE];
    }
  }
  return pixels;
}

// ---- 自動ズームの見どころ ----
// 境界上の座標。有名な場所の近くから、MIN_WIDTH まで潜っても模様が続くように
// 発散の遅い点を辿って補正してある（maxIterFor の反復回数で確認済み）
export const SPOTS = [
  { label: 'シーホースの谷', cx: -0.74393826109417716, cy: 0.13158305537138512 },
  { label: 'ゾウの谷', cx: 0.29239713845300358, cy: -0.014998541207508747 },
  { label: '三重らせん', cx: -0.088264288806958954, cy: 0.65459272857303552 },
  { label: '左の円のつなぎ目', cx: -1.2500895279273854, cy: 0.020053223717844775 },
  { label: '上端の枝', cx: -0.16093133030752896, cy: 1.038062518316375 },
  { label: 'アンテナの小さな分身', cx: -1.7683711120333461, cy: -0.0024316166505354733 },
];

// ---- 表示範囲のアニメーション ----

// 表示範囲 a から b へ移る経路を作る。t (0..1) に対する表示範囲を返す関数
// 横幅を対数的に変えつつ、ある不動点を中心に拡大縮小するので、
// 目的地の点が画面上を滑らかに中央へ寄っていく。
export function zoomPath(a, b) {
  const r = b.width / a.width;
  const logR = Math.log(r);
  if (Math.abs(logR) < 1e-6) {
    // 倍率がほぼ同じなら単純な平行移動
    return (t) => ({
      cx: a.cx + (b.cx - a.cx) * t,
      cy: a.cy + (b.cy - a.cy) * t,
      width: a.width,
    });
  }
  // 不動点 f: b.c - f = (a.c - f) * r を満たす
  const fx = (b.cx - r * a.cx) / (1 - r);
  const fy = (b.cy - r * a.cy) / (1 - r);
  return (t) => {
    if (t >= 1) return { cx: b.cx, cy: b.cy, width: b.width };
    const s = Math.exp(logR * t);
    return {
      cx: fx + (a.cx - fx) * s,
      cy: fy + (a.cy - fy) * s,
      width: a.width * s,
    };
  };
}
