// 画像の配色抽出ロジック（DOM に依存しない純粋関数群）
// RGBA のピクセル配列（ImageData.data と同じ並び）を受け取り、
// メディアンカット法で初期パレットを作ってから k-means で仕上げる。

// これ未満のアルファ値のピクセルは透明とみなして除外する
const ALPHA_THRESHOLD = 128;
// ヒストグラムの量子化ビット数（各チャンネル 5 ビット = 32768 ビン）
const BITS = 5;
const SHIFT = 8 - BITS;
const K_MEANS_ITERATIONS = 10;

// ピクセルを量子化したビンに集計する。各ビンは画素数と RGB の合計を持つ
export function buildHistogram(data) {
  const size = 1 << (BITS * 3);
  const count = new Uint32Array(size);
  const sumR = new Float64Array(size);
  const sumG = new Float64Array(size);
  const sumB = new Float64Array(size);
  let total = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < ALPHA_THRESHOLD) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const idx = ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT);
    count[idx]++;
    sumR[idx] += r;
    sumG[idx] += g;
    sumB[idx] += b;
    total++;
  }
  // 空でないビンだけを { r, g, b, n }（平均色と画素数）の配列にする
  const bins = [];
  for (let idx = 0; idx < size; idx++) {
    const n = count[idx];
    if (n === 0) continue;
    bins.push({ r: sumR[idx] / n, g: sumG[idx] / n, b: sumB[idx] / n, n });
  }
  return { bins, total };
}

function boxStats(bins) {
  const min = [255, 255, 255];
  const max = [0, 0, 0];
  let n = 0;
  for (const bin of bins) {
    const c = [bin.r, bin.g, bin.b];
    for (let k = 0; k < 3; k++) {
      if (c[k] < min[k]) min[k] = c[k];
      if (c[k] > max[k]) max[k] = c[k];
    }
    n += bin.n;
  }
  const ranges = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const axis = ranges.indexOf(Math.max(...ranges));
  return { bins, n, axis, range: ranges[axis] };
}

const AXIS_KEYS = ['r', 'g', 'b'];

// メディアンカット法: 「広がり × 画素数」が最大の箱を、最も広いチャンネルの中央値で分割していく
export function medianCut(bins, k) {
  if (bins.length === 0) return [];
  const boxes = [boxStats(bins)];
  while (boxes.length < k) {
    let target = -1;
    let best = 0;
    boxes.forEach((box, i) => {
      if (box.bins.length < 2) return;
      const score = box.range * box.n;
      if (score > best) {
        best = score;
        target = i;
      }
    });
    if (target < 0) break; // これ以上分割できない（色の種類が k 未満）
    const box = boxes[target];
    const key = AXIS_KEYS[box.axis];
    const sorted = box.bins.slice().sort((a, b) => a[key] - b[key]);
    // 画素数で重み付けした中央値の位置で切る（両側に最低 1 ビン残す）
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      acc += sorted[i].n;
      cut = i + 1;
      if (acc >= box.n / 2) break;
    }
    boxes.splice(target, 1, boxStats(sorted.slice(0, cut)), boxStats(sorted.slice(cut)));
  }
  return boxes.map((box) => mean(box.bins));
}

function mean(bins) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const bin of bins) {
    r += bin.r * bin.n;
    g += bin.g * bin.n;
    b += bin.b * bin.n;
    n += bin.n;
  }
  return { r: r / n, g: g / n, b: b / n };
}

// 重み付き k-means（Lloyd 法）。centers を初期値として、各色とその画素数を返す
export function kMeans(bins, centers, iterations = K_MEANS_ITERATIONS) {
  let current = centers.map((c) => ({ ...c }));
  let counts = [];
  for (let iter = 0; iter <= iterations; iter++) {
    const sums = current.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (const bin of bins) {
      let nearest = 0;
      let bestDist = Infinity;
      for (let j = 0; j < current.length; j++) {
        const dr = bin.r - current[j].r;
        const dg = bin.g - current[j].g;
        const db = bin.b - current[j].b;
        const d = dr * dr + dg * dg + db * db;
        if (d < bestDist) {
          bestDist = d;
          nearest = j;
        }
      }
      const s = sums[nearest];
      s.r += bin.r * bin.n;
      s.g += bin.g * bin.n;
      s.b += bin.b * bin.n;
      s.n += bin.n;
    }
    counts = sums.map((s) => s.n);
    if (iter === iterations) break;
    let moved = false;
    current = current.map((c, j) => {
      const s = sums[j];
      if (s.n === 0) return c; // 空になったクラスタはそのまま
      const next = { r: s.r / s.n, g: s.g / s.n, b: s.b / s.n };
      if (Math.abs(next.r - c.r) + Math.abs(next.g - c.g) + Math.abs(next.b - c.b) > 0.01) moved = true;
      return next;
    });
    if (!moved) {
      // 収束したら最終の割り当てだけ数え直して終わる
      iterations = iter + 1;
    }
  }
  return current.map((c, j) => ({ ...c, n: counts[j] }));
}

// RGBA 配列から最大 k 色のパレットを抽出する。占有率（0〜1）の降順で返す
export function extractPalette(data, k) {
  const { bins, total } = buildHistogram(data);
  if (total === 0) return [];
  const initial = medianCut(bins, k);
  return kMeans(bins, initial)
    .filter((c) => c.n > 0)
    .map((c) => {
      const r = Math.round(c.r);
      const g = Math.round(c.g);
      const b = Math.round(c.b);
      return { r, g, b, hex: rgbToHex(r, g, b), ratio: c.n / total };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

// 長辺が maxSide 以下になる縮小後のサイズ
export function fitSize(width, height, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// 0〜255 の RGB から [色相(度), 彩度(%), 明度(%)]
export function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, Math.round(l * 100)];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h = Math.round(((h * 60) + 360) % 360);
  return [h === 360 ? 0 : h, Math.round(s * 100), Math.round(l * 100)];
}

// コピー用テキスト
export function toCssVariables(palette) {
  const lines = palette.map((c, i) => `  --color-${i + 1}: ${c.hex};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

export function toJson(palette) {
  return JSON.stringify(palette.map((c) => c.hex), null, 2);
}

export function toTailwindConfig(palette) {
  const lines = palette.map((c, i) => `        'palette-${i + 1}': '${c.hex}',`);
  return [
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    '      colors: {',
    ...lines,
    '      },',
    '    },',
    '  },',
    '};',
  ].join('\n');
}
