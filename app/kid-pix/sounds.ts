export type SoundKind =
  | "tick"
  | "soft"
  | "spray"
  | "boing"
  | "thwack"
  | "pour"
  | "scratch"
  | "undo"
  | "redo"
  | "boom"
  | "whir"
  | "van"
  | "click"
  | "drop";

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let lastNoise = 0;
let music: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let musicBuffer: AudioBuffer | null = null;

function ctor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  const legacy = window as Window & { webkitAudioContext?: AudioCtor };
  return window.AudioContext || legacy.webkitAudioContext || null;
}

export function unlockAudio() {
  const Ctor = ctor();
  if (!Ctor) return;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, gainValue: number, delay = 0, slide = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(gainValue, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, gainValue: number, freq = 800) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const samples = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
}

export function playSound(kind: SoundKind, enabled: boolean) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const now = performance.now();
  if ((kind === "tick" || kind === "soft" || kind === "spray" || kind === "scratch") && now - lastNoise < 55) return;
  lastNoise = now;
  if (kind === "tick") tone(640 + Math.random() * 80, 0.04, "square", 0.03);
  else if (kind === "soft") tone(220, 0.06, "sine", 0.04);
  else if (kind === "spray") noise(0.05, 0.03, 1400);
  else if (kind === "boing") tone(520, 0.18, "sine", 0.06, 0, -280);
  else if (kind === "thwack") {
    noise(0.08, 0.08, 300);
    tone(140, 0.09, "triangle", 0.08);
  } else if (kind === "pour") tone(480, 0.2, "sawtooth", 0.03, 0, -200);
  else if (kind === "scratch") noise(0.07, 0.04, 900);
  else if (kind === "undo") {
    tone(392, 0.12, "triangle", 0.06);
    tone(262, 0.16, "triangle", 0.05, 0.08);
  } else if (kind === "redo") {
    tone(262, 0.1, "triangle", 0.05);
    tone(392, 0.14, "triangle", 0.05, 0.08);
  } else if (kind === "boom") {
    noise(0.35, 0.12, 180);
    tone(90, 0.32, "sine", 0.1);
  } else if (kind === "whir") tone(180, 0.22, "sawtooth", 0.03, 0, 220);
  else if (kind === "van") tone(90, 0.12, "square", 0.04);
  else if (kind === "drop") tone(880, 0.05, "sine", 0.04);
  else tone(520, 0.04, "square", 0.035);
}

function loopBuffer(): AudioBuffer | null {
  if (!ctx) return null;
  if (musicBuffer) return musicBuffer;
  const rate = ctx.sampleRate;
  const seconds = 2.4;
  const buffer = ctx.createBuffer(1, Math.floor(rate * seconds), rate);
  const data = buffer.getChannelData(0);
  const notes = [262, 330, 392, 523, 392, 330];
  notes.forEach((freq, index) => {
    const start = Math.floor((index * seconds * rate) / notes.length);
    const dur = Math.floor(rate * 0.16);
    for (let n = 0; n < dur && start + n < data.length; n++) {
      const env = Math.sin((Math.PI * n) / dur);
      data[start + n] += Math.sin((2 * Math.PI * freq * n) / rate) * env * 0.18;
    }
  });
  musicBuffer = buffer;
  return buffer;
}

export function setMusic(on: boolean) {
  if (!on) {
    music?.src.stop();
    music = null;
    return;
  }
  unlockAudio();
  if (!ctx || music) return;
  const buffer = loopBuffer();
  if (!buffer) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  src.loop = true;
  gain.gain.value = 0.35;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  music = { src, gain };
}

export function stopMusic() {
  setMusic(false);
}
