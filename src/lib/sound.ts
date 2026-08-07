// Minimal synthesised sound effects, standing in for real physical-sounding
// samples (see design spec §8 / handoff README "Not implemented"). Kept
// deliberately quiet and simple; a mute toggle lives in setup.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

function beep(freq: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  const c = getCtx();
  if (!c) return;
  // iOS creates AudioContexts suspended until a user gesture. Most sounds
  // fire from taps, but the very first sound of a session can be a
  // timer-driven auto-skip — resume() here so it isn't silently dropped.
  if (c.state === 'suspended') void c.resume();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);
  const now = c.currentTime;
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.start(now);
  osc.stop(now + dur);
}

export function playCorrect(muted: boolean) {
  if (muted) return;
  beep(880, 0.12, 0.05, 'sine');
}

export function playSkip(muted: boolean) {
  if (muted) return;
  beep(300, 0.22, 0.045, 'sawtooth');
}

export function playTurnExpired(muted: boolean) {
  if (muted) return;
  beep(620, 0.5, 0.06, 'sine');
  setTimeout(() => beep(780, 0.5, 0.05, 'sine'), 180);
}

export function playTokenSpent(muted: boolean) {
  if (muted) return;
  beep(720, 0.35, 0.06, 'triangle');
}
