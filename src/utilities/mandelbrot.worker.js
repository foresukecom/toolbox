/* eslint-env worker */
// マンデルブロ集合の計算用 Web Worker
// 受け取った表示範囲の行 y0..y1-1 を計算し、反復値の配列を転送して返す。
import { renderRows } from './mandelbrot.js';

self.onmessage = (e) => {
  const { jobId, params, y0, y1 } = e.data;
  const values = new Float32Array((y1 - y0) * params.gw);
  renderRows(params, y0, y1, values);
  self.postMessage({ jobId, y0, y1, values }, [values.buffer]);
};
