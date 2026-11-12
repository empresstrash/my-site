export type SoundKind =
  | "tick"
  | "soft"
  | "spray"
  | "squeak"
  | "chalk"
  | "wax"
  | "boing"
  | "honk"
  | "thwack"
  | "pour"
  | "scratch"
  | "undo"
  | "redo"
  | "boom"
  | "whir"
  | "slide"
  | "van"
  | "click"
  | "zip"
  | "type"
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
  if ((kind === "tick" || kind === "soft" || kind === "spray" || kind === "scratch" || kind === "chalk" || kind === "wax" || kind === "squeak") && now - lastNoise < 55) return;
  lastNoise = now;
  if (kind === "tick") {
    noise(0.04, 0.045, 2200);
    tone(1500, 0.03, "square", 0.02);
  } else if (kind === "soft") tone(170, 0.08, "sine", 0.05, 0, -50);
  else if (kind === "spray") noise(0.07, 0.05, 2400);
  else if (kind === "squeak") tone(1700, 0.07, "square", 0.03, 0, -700);
  else if (kind === "chalk") noise(0.06, 0.05, 700);
  else if (kind === "wax") {
    noise(0.06, 0.04, 480);
    tone(150, 0.07, "sawtooth", 0.02);
  }   else if (kind === "boing") {
    if (Math.random() < 0.4) {
      tone(280, 0.1, "square", 0.04);
      tone(360, 0.1, "square", 0.03);
    } else tone(720, 0.22, "sine", 0.07, 0, -520);
  } else if (kind === "honk") {
    tone(280, 0.12, "square", 0.04);
    tone(360, 0.12, "square", 0.03);
  } else if (kind === "thwack") {
    noise(0.09, 0.09, 240);
    tone(110, 0.1, "triangle", 0.08);
  } else if (kind === "pour") {
    tone(260, 0.12, "sine", 0.05);
    tone(150, 0.16, "sine", 0.05, 0.08);
  } else if (kind === "scratch") noise(0.08, 0.045, 500);
  else if (kind === "undo") {
    tone(494, 0.1, "square", 0.04);
    tone(247, 0.16, "square", 0.04, 0.08);
  } else if (kind === "redo") {
    tone(247, 0.08, "square", 0.04);
    tone(494, 0.14, "square", 0.04, 0.07);
  } else if (kind === "boom") {
    tone(880, 0.08, "square", 0.03, 0, -400);
    noise(0.42, 0.14, 140);
    tone(70, 0.36, "sine", 0.1, 0.06);
  } else if (kind === "whir") tone(140, 0.28, "sawtooth", 0.035, 0, 380);
  else if (kind === "slide") tone(860, 0.26, "sine", 0.05, 0, -620);
  else if (kind === "van") {
    tone(196, 0.16, "square", 0.045);
    tone(247, 0.16, "square", 0.03);
  } else if (kind === "zip") tone(240, 0.09, "square", 0.04, 0, 700);
  else if (kind === "type") tone(1800, 0.03, "square", 0.03);
  else if (kind === "drop") tone(980, 0.05, "square", 0.04);
  else if (kind === "click") tone(520, 0.08, "sine", 0.06, 0, -260);
  else tone(440, 0.05, "square", 0.04);
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
      const wave = Math.sin((2 * Math.PI * freq * n) / rate);
      data[start + n] += Math.sign(wave) * env * 0.12 + wave * env * 0.05;
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
