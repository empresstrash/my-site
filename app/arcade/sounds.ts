/**
 * Soft ambient UI tones via Web Audio API (no external files).
 * Gentle click for prev/next; slightly airier chime for reload.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  {
    freq,
    duration,
    type = 'sine',
    gain = 0.08,
    freqEnd,
    delay = 0,
  }: {
    freq: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    freqEnd?: number;
    delay?: number;
  }
) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
  }

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, t0);
  filter.Q.setValueAtTime(0.6, t0);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);

  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Soft tactile tick — prev / next */
export function playNavClick() {
  const ctx = getCtx();
  if (!ctx) return;
  // Warm low body + brief high tick
  tone(ctx, { freq: 420, freqEnd: 280, duration: 0.07, type: 'sine', gain: 0.055 });
  tone(ctx, { freq: 920, freqEnd: 640, duration: 0.045, type: 'triangle', gain: 0.028, delay: 0.008 });
}

/** Airy reload bloom — same family, a bit more space */
export function playReloadSound() {
  const ctx = getCtx();
  if (!ctx) return;
  tone(ctx, { freq: 360, freqEnd: 220, duration: 0.12, type: 'sine', gain: 0.05 });
  tone(ctx, { freq: 720, freqEnd: 540, duration: 0.1, type: 'triangle', gain: 0.032, delay: 0.02 });
  tone(ctx, { freq: 1080, freqEnd: 880, duration: 0.08, type: 'sine', gain: 0.018, delay: 0.04 });
}
