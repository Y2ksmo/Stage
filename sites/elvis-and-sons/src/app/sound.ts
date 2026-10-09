let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let compressor: DynamicsCompressorNode | undefined;
let muted = false;
let haulGain: GainNode | undefined;
let haulStarted = false;
const listeners = new Set<(value: boolean) => void>();

function context() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function output() {
  const c = context();
  if (!master || !compressor) {
    master = c.createGain();
    master.gain.value = muted ? 0 : 0.9;
    compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 16;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.22;
    master.connect(compressor);
    compressor.connect(c.destination);
  }
  return master;
}

function noise(c: AudioContext, seconds: number) {
  const length = Math.floor(c.sampleRate * seconds);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    data[i] = brown * 3.5;
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function tone(c: AudioContext, destination: AudioNode, frequency: number, when: number, duration: number, gain: number, type: OscillatorType = "sine") {
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(30, frequency), when);
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), when + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(amp);
  amp.connect(destination);
  osc.start(when);
  osc.stop(when + duration + 0.05);
}

function readStoredMute() {
  try {
    return sessionStorage.getItem("elvis-sound") === "off";
  } catch {
    return false;
  }
}

export function initSound() {
  muted = readStoredMute();
  if (master) master.gain.value = muted ? 0 : 0.9;
  return muted;
}

export function soundMuted() {
  return muted;
}

export function onSoundMute(listener: (value: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSoundMuted(next: boolean) {
  muted = next;
  if (master) master.gain.setValueAtTime(next ? 0 : 0.9, context().currentTime);
  try {
    sessionStorage.setItem("elvis-sound", next ? "off" : "on");
  } catch {
    /* private mode */
  }
  listeners.forEach((listener) => listener(next));
}

export function unlockSound() {
  const c = context();
  if (c.state === "suspended") void c.resume();
  return c;
}

export function endHaul() {
  haulStarted = true;
  if (!haulGain || !ctx) return;
  const now = ctx.currentTime;
  haulGain.gain.cancelScheduledValues(now);
  haulGain.gain.setValueAtTime(Math.max(0.0001, haulGain.gain.value), now);
  haulGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
}

export function playHaul(phase: "load" | "launch") {
  if (muted || haulStarted) return false;
  const c = context();
  if (c.state !== "running") return false;
  haulStarted = true;
  const bus = output();
  const haul = c.createGain();
  haul.gain.value = 1;
  haul.connect(bus);
  haulGain = haul;
  const now = c.currentTime + 0.02;

  if (phase === "load") {
    const engine = noise(c, 2);
    const low = c.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.setValueAtTime(140, now);
    low.frequency.linearRampToValueAtTime(520, now + 1.7);
    const engineAmp = c.createGain();
    engineAmp.gain.setValueAtTime(0.0001, now);
    engineAmp.gain.exponentialRampToValueAtTime(0.22, now + 0.2);
    engineAmp.gain.exponentialRampToValueAtTime(0.08, now + 0.9);
    engineAmp.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);
    engine.connect(low);
    low.connect(engineAmp);
    engineAmp.connect(haul);
    engine.start(now);
    engine.stop(now + 2.4);
    tone(c, haul, 52, now, 0.9, 0.12, "sawtooth");
    [0.18, 0.4, 0.62].forEach((at) => tone(c, haul, 140, now + at, 0.16, 0.2));
  }

  const fly = phase === "load" ? now + 0.75 : now;
  const whoosh = noise(c, 1.4);
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.7;
  band.frequency.setValueAtTime(180, fly);
  band.frequency.exponentialRampToValueAtTime(2400, fly + 0.28);
  band.frequency.exponentialRampToValueAtTime(320, fly + 0.95);
  const whooshAmp = c.createGain();
  whooshAmp.gain.setValueAtTime(0.0001, fly);
  whooshAmp.gain.exponentialRampToValueAtTime(0.34, fly + 0.18);
  whooshAmp.gain.exponentialRampToValueAtTime(0.0001, fly + 1.05);
  const pan = c.createStereoPanner();
  pan.pan.setValueAtTime(-0.95, fly);
  pan.pan.linearRampToValueAtTime(0.95, fly + 0.7);
  whoosh.connect(band);
  band.connect(whooshAmp);
  whooshAmp.connect(pan);
  pan.connect(haul);
  whoosh.start(fly);
  whoosh.stop(fly + 1.15);
  tone(c, haul, 90, fly, 0.55, 0.16, "sawtooth");
  tone(c, haul, 70, fly + 0.32, 0.45, 0.28);
  tone(c, haul, 1800, fly + 0.3, 0.12, 0.05);
  return true;
}

function metal(c: AudioContext, destination: AudioNode, when: number, duration: number, gain: number, frequency: number, q: number) {
  const length = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(frequency, when);
  filter.Q.value = q;
  const amp = c.createGain();
  amp.gain.setValueAtTime(gain, when);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(destination);
  source.start(when);
  source.stop(when + duration + 0.02);
}

function cockRifle() {
  if (muted) return;
  const c = unlockSound();
  if (c.state !== "running") return;
  const bus = output();
  const now = c.currentTime + 0.008;

  metal(c, bus, now, 0.055, 0.42, 2100, 3.4);
  tone(c, bus, 1680, now, 0.03, 0.06, "square");

  const lock = now + 0.078;
  metal(c, bus, lock, 0.04, 0.62, 980, 1.6);
  metal(c, bus, lock, 0.022, 0.38, 3400, 8);
  tone(c, bus, 126, lock, 0.06, 0.2, "triangle");
  tone(c, bus, 540, lock + 0.004, 0.035, 0.14, "square");
}

export function playSpace() {
  cockRifle();
}

export function playShut() {
  cockRifle();
}
