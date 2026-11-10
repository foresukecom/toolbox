// ポモドーロタイマーのロジック（DOM に依存しない純粋関数群）
// 現在時刻 now（ミリ秒）を引数で受け取るので、Node でも時間を差し替えて検証できる。
// 残り時間は終了予定時刻 endAt との差で求め、setInterval のカウントダウンには頼らない。

export const PHASES = {
  work: { label: '作業', settingKey: 'workMinutes' },
  short: { label: '短い休憩', settingKey: 'shortMinutes' },
  long: { label: '長い休憩', settingKey: 'longMinutes' },
};

export const DEFAULT_SETTINGS = {
  workMinutes: 25,
  shortMinutes: 5,
  longMinutes: 15,
  longEvery: 4,
};

// 設定値の範囲（UI の min / max にも使う）
export const SETTING_LIMITS = {
  workMinutes: { min: 1, max: 180 },
  shortMinutes: { min: 1, max: 60 },
  longMinutes: { min: 1, max: 120 },
  longEvery: { min: 1, max: 12 },
};

const MINUTE = 60 * 1000;

// 不正な値は既定値に、範囲外は丸めて整数にする
export function normalizeSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const n = Number(src[key]);
    const { min, max } = SETTING_LIMITS[key];
    out[key] = Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : DEFAULT_SETTINGS[key];
  });
  return out;
}

export function phaseDuration(phase, settings) {
  return settings[PHASES[phase].settingKey] * MINUTE;
}

// status: idle（未開始）/ running（計測中）/ paused（一時停止中）
// cycleCount: 長い休憩の後から数えて終えた作業の回数
export function createTimer(settings, phase = 'work', cycleCount = 0) {
  const duration = phaseDuration(phase, settings);
  return { phase, status: 'idle', duration, remaining: duration, endAt: null, cycleCount };
}

export function getRemaining(timer, now) {
  if (timer.status === 'running') return Math.max(0, timer.endAt - now);
  return timer.remaining;
}

export function start(timer, now) {
  if (timer.status === 'running') return timer;
  return { ...timer, status: 'running', endAt: now + timer.remaining };
}

export function pause(timer, now) {
  if (timer.status !== 'running') return timer;
  return { ...timer, status: 'paused', remaining: getRemaining(timer, now), endAt: null };
}

// 現在のフェーズを最初からやり直す（未開始に戻す）
export function reset(timer, settings) {
  return createTimer(settings, timer.phase, timer.cycleCount);
}

export function isFinished(timer, now) {
  return timer.status === 'running' && now >= timer.endAt;
}

// 作業の後は cycleCount を 1 進め、longEvery の倍数なら長い休憩、そうでなければ短い休憩。
// 休憩の後は作業へ。長い休憩の後は cycleCount を 0 に戻す。
export function nextPhaseOf(phase, cycleCount, settings) {
  if (phase === 'work') {
    const count = cycleCount + 1;
    return { phase: count % settings.longEvery === 0 ? 'long' : 'short', cycleCount: count };
  }
  return { phase: 'work', cycleCount: phase === 'long' ? 0 : cycleCount };
}

// 次のフェーズへ移る。autoStart なら startAt から計測を始める（未指定なら未開始）
export function advance(timer, settings, startAt = null) {
  const next = nextPhaseOf(timer.phase, timer.cycleCount, settings);
  const t = createTimer(settings, next.phase, next.cycleCount);
  return startAt === null ? t : start(t, startAt);
}

// 終了時刻を過ぎていれば次のフェーズへ進める。
// autoStart のときは前のフェーズの終了時刻から次を始めるので、処理が遅れても（バックグラウンドなど）ずれない。
// 戻り値: { timer, finished: 終えたフェーズの配列（古い順）}
export function update(timer, settings, now, autoStart) {
  const finished = [];
  let t = timer;
  // 長時間放置された場合でも無限ループにならないよう上限を設ける
  while (isFinished(t, now) && finished.length < 1000) {
    finished.push(t.phase);
    t = advance(t, settings, autoStart ? t.endAt : null);
  }
  return { timer: t, finished };
}

// ローカル時刻の日付キー（YYYY-MM-DD）
export function dateKey(now) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 今日の完了数の記録 { date, count }。日付が変わっていたら 0 として扱う
export function todayCount(record, now) {
  return record && record.date === dateKey(now) && Number.isFinite(record.count) ? record.count : 0;
}

export function addToday(record, now, n = 1) {
  return { date: dateKey(now), count: todayCount(record, now) + n };
}

// ミリ秒を「mm:ss」（1 時間以上は「h:mm:ss」）に。端数の秒は切り上げる（0.2 秒残りは 0:01）
export function formatRemaining(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
