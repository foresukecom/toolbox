<template>
  <div class="dev-tool cat-date">
    <div class="layout">
      <section class="timer-card" :class="'phase-' + timer.phase">
        <div class="phase-tabs" aria-label="フェーズ">
          <span
            v-for="p in phaseList"
            :key="p.key"
            class="phase-tab"
            :class="{ active: timer.phase === p.key }"
          >{{ p.label }}</span>
        </div>

        <div class="dial-wrap">
          <svg class="dial" viewBox="0 0 220 220" role="img" :aria-label="`${phaseLabel} 残り ${remainingText}`">
            <circle class="dial-track" cx="110" cy="110" :r="ringRadius" />
            <circle
              class="dial-bar"
              cx="110"
              cy="110"
              :r="ringRadius"
              :stroke-dasharray="ringCircumference"
              :stroke-dashoffset="ringOffset"
              transform="rotate(-90 110 110)"
            />
          </svg>
          <div class="dial-center">
            <div class="dial-phase">{{ phaseLabel }}</div>
            <div class="dial-time font-mono" aria-live="off">{{ remainingText }}</div>
            <div class="dial-status">{{ statusText }}</div>
          </div>
        </div>

        <div class="controls">
          <button type="button" class="ctrl-button primary" @click="toggleRunning">
            {{ timer.status === 'running' ? '一時停止' : timer.status === 'paused' ? '再開' : '開始' }}
          </button>
          <button type="button" class="ctrl-button" :disabled="timer.status === 'idle'" @click="resetTimer">リセット</button>
          <button type="button" class="ctrl-button" @click="skip">スキップ</button>
        </div>

        <div class="cycle">
          <span class="cycle-label">長い休憩まで</span>
          <span class="cycle-dots" :aria-label="`${settings.longEvery}回中${cycleDone}回完了`">
            <span v-for="i in settings.longEvery" :key="i" class="cycle-dot" :class="{ done: i <= cycleDone }"></span>
          </span>
          <span class="cycle-text font-mono">{{ cycleDone }} / {{ settings.longEvery }}</span>
        </div>

        <p class="today">
          今日完了したポモドーロ: <span class="today-count font-mono">{{ today }}</span> 回
        </p>
      </section>

      <section class="panel">
        <h2 class="section-title">設定</h2>
        <div class="settings-grid">
          <label v-for="f in settingFields" :key="f.key" class="setting">
            <span class="setting-label">{{ f.label }}</span>
            <span class="setting-input">
              <input
                v-model.number="form[f.key]"
                type="number"
                class="border rounded-md p-1 w-20 font-mono"
                :min="limits[f.key].min"
                :max="limits[f.key].max"
                step="1"
                @change="applySettings"
              />
              <span class="setting-unit">{{ f.unit }}</span>
            </span>
          </label>
        </div>
        <p v-if="timer.status !== 'idle'" class="hint mt-2">時間の変更は、計測中のフェーズには反映されず次のフェーズから使われます。</p>

        <div class="options">
          <label class="inline-flex items-center gap-2">
            <input v-model="autoStart" type="checkbox" />
            終わったら自動で次のフェーズを開始する
          </label>
          <div class="inline-flex items-center gap-2">
            <label class="inline-flex items-center gap-2">
              <input v-model="sound" type="checkbox" />
              終了時に音を鳴らす
            </label>
            <button type="button" class="mini-button" @click="playBeep">試聴</button>
          </div>
          <label class="inline-flex items-center gap-2">
            <input v-model="showTitle" type="checkbox" />
            タブのタイトルに残り時間を表示する
          </label>
        </div>

        <div class="notify">
          <span class="notify-label">デスクトップ通知:</span>
          <template v-if="notifyPermission === 'unsupported'">
            <span class="hint">このブラウザでは使えません</span>
          </template>
          <template v-else-if="notifyPermission === 'granted'">
            <span class="ok">許可済み（終了時に通知します）</span>
          </template>
          <template v-else-if="notifyPermission === 'denied'">
            <span class="hint">ブロックされています（ブラウザのサイト設定から変更できます）</span>
          </template>
          <button v-else type="button" class="mini-button" @click="requestNotification">通知を許可する</button>
        </div>
        <p class="hint mt-1">通知・音・タイトル表示はこのブラウザの中だけで動き、どこにも送信しません。</p>

        <h2 class="section-title mt-8">使い方</h2>
        <p class="explain">
          {{ settings.workMinutes }}分の作業と{{ settings.shortMinutes }}分の短い休憩を繰り返し、作業を{{ settings.longEvery }}回終えるごとに{{ settings.longMinutes }}分の長い休憩をとります。<!--
          -->「スキップ」は今のフェーズを終えたことにせず次へ進みます（作業をスキップしても完了数には数えません）。<!--
          -->残り時間は終了予定時刻から計算するので、別のタブを見ていてもずれません。
        </p>
      </section>
    </div>
  </div>
</template>

<script>
import {
  PHASES,
  SETTING_LIMITS,
  normalizeSettings,
  createTimer,
  getRemaining,
  start,
  pause,
  reset,
  advance,
  update,
  todayCount,
  addToday,
  formatRemaining,
} from '@/utilities/pomodoro.js';

const STORAGE_KEY = 'toolbox.pomodoro.settings';
const TODAY_KEY = 'toolbox.pomodoro.today';
// 表示更新の間隔（ms）。残り時間そのものは Date.now() から計算する
const TICK_MS = 250;
const RING_RADIUS = 100;

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (e) {
    return {};
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // 保存できなくても動作には影響しない
  }
}

function currentPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export default {
  name: 'PomodoroTimer',
  beforeRouteLeave() {
    // afterEach で次の画面のタイトルが付く前に元に戻す
    this.leaving = true;
    this.restoreTitle();
  },
  data() {
    const saved = loadJson(STORAGE_KEY);
    const settings = normalizeSettings(saved);
    return {
      settings,
      form: { ...settings },
      limits: SETTING_LIMITS,
      autoStart: saved.autoStart === true,
      sound: saved.sound !== false,
      showTitle: saved.showTitle !== false,
      timer: createTimer(settings),
      now: Date.now(),
      todayRecord: loadJson(TODAY_KEY),
      notifyPermission: currentPermission(),
      phaseList: Object.keys(PHASES).map((key) => ({ key, label: PHASES[key].label })),
      settingFields: [
        { key: 'workMinutes', label: '作業', unit: '分' },
        { key: 'shortMinutes', label: '短い休憩', unit: '分' },
        { key: 'longMinutes', label: '長い休憩', unit: '分' },
        { key: 'longEvery', label: '長い休憩までの作業回数', unit: '回' },
      ],
      ringRadius: RING_RADIUS,
      ringCircumference: 2 * Math.PI * RING_RADIUS,
    };
  },
  computed: {
    remaining() {
      return getRemaining(this.timer, this.now);
    },
    remainingText() {
      return formatRemaining(this.remaining);
    },
    phaseLabel() {
      return PHASES[this.timer.phase].label;
    },
    statusText() {
      if (this.timer.status === 'running') return '計測中';
      if (this.timer.status === 'paused') return '一時停止中';
      return '未開始';
    },
    // 経過の割合だけリングを塗る
    ringOffset() {
      const progress = this.timer.duration > 0 ? 1 - this.remaining / this.timer.duration : 0;
      return this.ringCircumference * (1 - Math.min(1, Math.max(0, progress)));
    },
    // 長い休憩中はセットを終えたので全部埋める
    cycleDone() {
      if (this.timer.phase === 'long') return this.settings.longEvery;
      return this.timer.cycleCount % this.settings.longEvery;
    },
    today() {
      return todayCount(this.todayRecord, this.now);
    },
  },
  watch: {
    autoStart: 'saveSettings',
    sound: 'saveSettings',
    showTitle() {
      this.saveSettings();
      this.updateTitle();
    },
  },
  created() {
    this.intervalId = null;
    this.audioCtx = null;
    this.leaving = false;
    this.originalTitle = '';
  },
  mounted() {
    this.originalTitle = document.title;
    this.onVisibility = () => this.tick();
    document.addEventListener('visibilitychange', this.onVisibility);
  },
  beforeUnmount() {
    this.stopTicking();
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (!this.leaving) this.restoreTitle();
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  },
  methods: {
    saveSettings() {
      saveJson(STORAGE_KEY, {
        ...this.settings,
        autoStart: this.autoStart,
        sound: this.sound,
        showTitle: this.showTitle,
      });
    },
    applySettings() {
      this.settings = normalizeSettings(this.form);
      // 範囲外の入力は丸めた値で表示し直す
      this.form = { ...this.settings };
      // 未開始なら今のフェーズの長さにもすぐ反映する
      if (this.timer.status === 'idle') this.timer = reset(this.timer, this.settings);
      this.saveSettings();
    },
    startTicking() {
      if (this.intervalId !== null) return;
      this.intervalId = setInterval(this.tick, TICK_MS);
    },
    stopTicking() {
      clearInterval(this.intervalId);
      this.intervalId = null;
    },
    toggleRunning() {
      this.now = Date.now();
      if (this.timer.status === 'running') {
        this.timer = pause(this.timer, this.now);
        this.stopTicking();
      } else {
        // ユーザー操作のタイミングで音声を使えるようにしておく（自動再生の制限対策）
        this.ensureAudio();
        this.timer = start(this.timer, this.now);
        this.startTicking();
      }
      this.updateTitle();
    },
    resetTimer() {
      this.timer = reset(this.timer, this.settings);
      this.stopTicking();
      this.now = Date.now();
      this.updateTitle();
    },
    // 今のフェーズを終えたことにせず次へ。計測中かつ自動開始なら次もすぐ始める
    skip() {
      this.now = Date.now();
      const keepRunning = this.autoStart && this.timer.status === 'running';
      this.timer = advance(this.timer, this.settings, keepRunning ? this.now : null);
      if (!keepRunning) this.stopTicking();
      this.updateTitle();
    },
    tick() {
      this.now = Date.now();
      if (this.timer.status !== 'running') return;
      const { timer, finished } = update(this.timer, this.settings, this.now, this.autoStart);
      if (finished.length > 0) {
        this.timer = timer;
        const works = finished.filter((p) => p === 'work').length;
        if (works > 0) {
          this.todayRecord = addToday(this.todayRecord, this.now, works);
          saveJson(TODAY_KEY, this.todayRecord);
        }
        if (timer.status !== 'running') this.stopTicking();
        this.notifyFinished(finished[finished.length - 1]);
      }
      this.updateTitle();
    },
    notifyFinished(phase) {
      if (this.sound) this.playBeep();
      if (this.notifyPermission !== 'granted') return;
      const next = this.timer;
      const nextText = `次は${PHASES[next.phase].label}（${Math.round(next.duration / 60000)}分）`;
      const body = `${PHASES[phase].label}が終わりました。${nextText}${next.status === 'running' ? 'を開始しました。' : 'です。'}`;
      try {
        // eslint-disable-next-line no-new
        new Notification('ポモドーロタイマー', { body, tag: 'pomodoro-timer' });
      } catch (e) {
        // Android の Chrome などコンストラクタが使えない環境では通知しない
      }
    },
    async requestNotification() {
      if (this.notifyPermission === 'unsupported') return;
      try {
        this.notifyPermission = await Notification.requestPermission();
      } catch (e) {
        this.notifyPermission = currentPermission();
      }
    },
    ensureAudio() {
      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
        return this.audioCtx;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try {
        this.audioCtx = new Ctx();
      } catch (e) {
        this.audioCtx = null;
      }
      return this.audioCtx;
    },
    // 「ピピピッ」と短い音を 3 回鳴らす
    playBeep() {
      const ctx = this.ensureAudio();
      if (!ctx) return;
      const t0 = ctx.currentTime + 0.05;
      for (let i = 0; i < 3; i++) {
        const t = t0 + i * 0.22;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i === 2 ? 1320 : 880;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      }
    },
    updateTitle() {
      if (this.leaving) return;
      if (this.showTitle && this.timer.status !== 'idle') {
        const mark = this.timer.status === 'paused' ? '⏸ ' : '';
        document.title = `${mark}${this.remainingText} ${this.phaseLabel} - ${this.originalTitle}`;
      } else {
        this.restoreTitle();
      }
    },
    restoreTitle() {
      if (this.originalTitle) document.title = this.originalTitle;
    },
  },
};
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .layout {
    grid-template-columns: minmax(0, 400px) minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
  }
}

/* フェーズごとの色（作業: 赤系、短い休憩: 緑系、長い休憩: 青系） */
.timer-card {
  --phase: #dc2626;
  --phase-soft: #fef2f2;
  border: 1px solid var(--phase);
  border-radius: 0.75rem;
  background: var(--phase-soft);
  padding: 1.25rem 1rem;
  text-align: center;
  transition: background-color 0.3s, border-color 0.3s;
}

.timer-card.phase-short {
  --phase: #16a34a;
  --phase-soft: #f0fdf4;
}

.timer-card.phase-long {
  --phase: #2563eb;
  --phase-soft: #eff6ff;
}

.phase-tabs {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.phase-tab {
  padding: 0.15rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  color: #6b7280;
  border: 1px solid transparent;
}

.phase-tab.active {
  background: var(--phase);
  color: #fff;
  font-weight: bold;
}

.dial-wrap {
  position: relative;
  width: 100%;
  max-width: 280px;
  margin: 1rem auto;
}

.dial {
  display: block;
  width: 100%;
  height: auto;
}

.dial-track {
  fill: #fff;
  stroke: #e5e7eb;
  stroke-width: 12;
}

.dial-bar {
  fill: none;
  stroke: var(--phase);
  stroke-width: 12;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.25s linear, stroke 0.3s;
}

.dial-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.dial-phase {
  color: var(--phase);
  font-weight: bold;
}

.dial-time {
  font-size: 3.25rem;
  font-weight: bold;
  line-height: 1.1;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
}

.dial-status {
  color: #6b7280;
  font-size: 0.875rem;
}

.controls {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ctrl-button {
  padding: 0.45rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: #fff;
}

.ctrl-button:hover:not(:disabled) {
  border-color: var(--phase);
}

.ctrl-button.primary {
  min-width: 6.5rem;
  background: var(--phase);
  border-color: var(--phase);
  color: #fff;
  font-weight: bold;
}

.ctrl-button.primary:hover {
  filter: brightness(0.92);
}

.ctrl-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cycle {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.cycle-dots {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.cycle-dot {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 9999px;
  border: 2px solid var(--phase);
  background: #fff;
}

.cycle-dot.done {
  background: var(--phase);
}

.today {
  margin-top: 0.5rem;
  color: #4b5563;
}

.today-count {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
}

.panel {
  min-width: 0;
}

.section-title {
  font-weight: bold;
  font-size: 1.15rem;
  border-left: 4px solid var(--tb-main);
  padding-left: 0.5rem;
  margin-bottom: 1rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
}

.setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  max-width: 22rem;
}

.setting-input {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.setting-unit {
  width: 1.25rem;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.options input[type='checkbox'] {
  accent-color: var(--tb-main);
}

.mini-button {
  padding: 0.1rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: #fff;
  font-size: 0.8rem;
}

.mini-button:hover {
  border-color: var(--tb-main);
}

.notify {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.ok {
  color: #15803d;
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}

.explain {
  line-height: 1.8;
}

@media (prefers-reduced-motion: reduce) {
  .timer-card,
  .dial-bar {
    transition: none;
  }
}
</style>
