/**
 * Lightweight Web Audio API sound effects (muted-safe, zero external audio assets).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(
  enabled: boolean,
  freq: number,
  durationMs: number,
  type: OscillatorType = 'sine',
  gainValue = 0.08,
): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Ignore audio errors on restricted browsers
  }
}

export function playSpinLandingChime(enabled: boolean): void {
  if (!enabled) return;
  playTone(true, 523.25, 160, 'triangle', 0.09);
  setTimeout(() => playTone(true, 659.25, 220, 'triangle', 0.08), 90);
}

export function playStampSound(enabled: boolean, positive: boolean): void {
  if (!enabled) return;
  playTone(true, positive ? 440 : 220, 140, 'sine', 0.07);
}
