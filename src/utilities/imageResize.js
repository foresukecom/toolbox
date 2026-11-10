// 画像変換のサイズ計算・ファイル名生成のロジック（DOM に依存しない純粋関数群）
// Node でもそのまま検証できるようにしてある。

// 出力形式の定義
export const OUTPUT_FORMATS = [
  { mime: 'image/jpeg', label: 'JPEG', ext: 'jpg', lossy: true },
  { mime: 'image/png', label: 'PNG', ext: 'png', lossy: false },
  { mime: 'image/webp', label: 'WebP', ext: 'webp', lossy: true },
];

export function formatByMime(mime) {
  return OUTPUT_FORMATS.find((f) => f.mime === mime) || null;
}

// 正の整数に丸める（最低 1px）
function toPx(v) {
  return Math.max(1, Math.round(v));
}

function positive(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// 元画像の寸法とリサイズ設定から出力寸法を求める
// options:
//   mode: 'none' | 'size'（幅・高さ指定） | 'longEdge'（長辺の最大値） | 'scale'（拡大縮小率%）
//   width, height: mode=size のときの指定値（片方だけでもよい）
//   keepAspect: mode=size で縦横比を維持するか（両方指定時は枠に収める）
//   longEdge: mode=longEdge の長辺の最大値
//   scale: mode=scale の率（%）
//   noUpscale: 元より大きくしない
export function computeTargetSize(srcW, srcH, options) {
  const { mode = 'none', keepAspect = true, noUpscale = true } = options || {};
  let w = srcW;
  let h = srcH;

  if (mode === 'size') {
    const tw = positive(options.width);
    const th = positive(options.height);
    if (keepAspect) {
      // 指定された辺から倍率を決め、両方指定なら小さいほう（枠内に収める）
      const ratios = [];
      if (tw) ratios.push(tw / srcW);
      if (th) ratios.push(th / srcH);
      if (ratios.length) {
        let r = Math.min(...ratios);
        if (noUpscale) r = Math.min(r, 1);
        w = srcW * r;
        h = srcH * r;
      }
    } else {
      // 縦横比を無視。未指定の辺は元のまま
      w = tw || srcW;
      h = th || srcH;
      if (noUpscale) {
        w = Math.min(w, srcW);
        h = Math.min(h, srcH);
      }
    }
  } else if (mode === 'longEdge') {
    const max = positive(options.longEdge);
    if (max) {
      let r = max / Math.max(srcW, srcH);
      if (noUpscale) r = Math.min(r, 1);
      w = srcW * r;
      h = srcH * r;
    }
  } else if (mode === 'scale') {
    const s = positive(options.scale);
    if (s) {
      let r = s / 100;
      if (noUpscale) r = Math.min(r, 1);
      w = srcW * r;
      h = srcH * r;
    }
  }

  return { width: toPx(w), height: toPx(h) };
}

// 出力ファイル名: 元の名前_幅x高さ.拡張子
export function outputFileName(originalName, width, height, ext) {
  const dot = originalName.lastIndexOf('.');
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  return `${base}_${width}x${height}.${ext}`;
}

// 削減率（%）。正なら小さくなった、負なら大きくなった
export function reductionRate(before, after) {
  if (!before) return 0;
  return ((before - after) / before) * 100;
}

// バイト数を読みやすい表記にする
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
