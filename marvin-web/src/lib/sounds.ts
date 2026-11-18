// Small synthesized sounds (no audio files): a camera shutter and the whirr of
// an instant-photo printer. Created on demand after a click, so browsers allow them.
let context: AudioContext | null = null;

function audio() {
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    context ??= new Context();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch { return null; }
}

function noise(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A camera shutter, "ka-chak": two crisp mechanical clicks (the shutter opening,
// then closing). Each is a very short burst of bright noise with a small metallic
// ring; there is almost nothing below 1 kHz, so it never sounds soft or blunt.
export function playShutter() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const output = ctx.createGain();
  output.gain.value = .5;
  output.connect(ctx.destination);
  for (const [delay, level, ring] of [[0, 1, 3600], [.062, .8, 2900]] as const) {
    const at = now + delay;
    // The click: 12 ms of noise between 1 and 7 kHz, with a near-instant attack.
    const click = ctx.createBufferSource();
    click.buffer = noise(ctx, .02);
    const bright = ctx.createBiquadFilter();
    bright.type = "highpass";
    bright.frequency.value = 1000;
    const soft = ctx.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 7000;
    const clickLevel = ctx.createGain();
    clickLevel.gain.setValueAtTime(level, at);
    clickLevel.gain.exponentialRampToValueAtTime(.001, at + .012);
    click.connect(bright).connect(soft).connect(clickLevel).connect(output);
    click.start(at);
    click.stop(at + .02);
    // The ring: a narrow band of the same noise, dying away over 35 ms.
    const tail = ctx.createBufferSource();
    tail.buffer = noise(ctx, .05);
    const metal = ctx.createBiquadFilter();
    metal.type = "bandpass";
    metal.frequency.value = ring;
    metal.Q.value = 9;
    const tailLevel = ctx.createGain();
    tailLevel.gain.setValueAtTime(level * 2.2, at);
    tailLevel.gain.exponentialRampToValueAtTime(.001, at + .035);
    tail.connect(metal).connect(tailLevel).connect(output);
    tail.start(at);
    tail.stop(at + .05);
  }
}

// The print motor: a light, high gear whirr (band-passed noise buzzing at the
// gears' rate), in the short stops of the print feeding out. No low hum.
export function playPrinter(seconds = 2.2) {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, seconds + .1);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(2300, now);
  band.frequency.linearRampToValueAtTime(2700, now + seconds);
  band.Q.value = 3;
  // The gears: the level flutters 70 times a second.
  const gears = ctx.createGain();
  gears.gain.value = .5;
  const flutter = ctx.createOscillator();
  flutter.frequency.value = 70;
  const depth = ctx.createGain();
  depth.gain.value = .5;
  flutter.connect(depth).connect(gears.gain);
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, now);
  // Burst pattern matching the print feeding out in stops.
  const bursts = [[0, .55], [.7, 1.2], [1.45, 2.1]];
  for (const [start, end] of bursts) {
    const a = now + start * seconds / 2.2, b = now + end * seconds / 2.2;
    level.gain.linearRampToValueAtTime(.16, a + .04);
    level.gain.setValueAtTime(.16, b - .04);
    level.gain.linearRampToValueAtTime(0, b);
  }
  source.connect(band).connect(gears).connect(level).connect(ctx.destination);
  source.start(now);
  flutter.start(now);
  source.stop(now + seconds + .1);
  flutter.stop(now + seconds + .1);
}

// A light paper swish for putting the photo away.
export function playSwish() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, .45);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(3800, now + .35);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(.18, now + .12);
  envelope.gain.exponentialRampToValueAtTime(.001, now + .42);
  source.connect(filter).connect(envelope).connect(ctx.destination);
  source.start(now);
  source.stop(now + .45);
}
