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

// Two quick mechanical clicks (mirror up, shutter down) with a bright edge.
export function playShutter() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const output = ctx.createGain();
  output.gain.value = .55;
  output.connect(ctx.destination);
  for (const [delay, level, tone] of [[0, 1, 3200], [.075, .75, 2200]] as const) {
    const source = ctx.createBufferSource();
    source.buffer = noise(ctx, .09);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = tone;
    filter.Q.value = 1.1;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, now + delay);
    envelope.gain.linearRampToValueAtTime(level, now + delay + .003);
    envelope.gain.exponentialRampToValueAtTime(.001, now + delay + .07);
    source.connect(filter).connect(envelope).connect(output);
    source.start(now + delay);
    source.stop(now + delay + .09);
  }
}

// A soft motor whirr that pushes the print out, in short bursts.
export function playPrinter(seconds = 2.2) {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const motor = ctx.createOscillator();
  motor.type = "sawtooth";
  motor.frequency.setValueAtTime(92, now);
  motor.frequency.linearRampToValueAtTime(118, now + seconds);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 520;
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, now);
  // Burst pattern matching the print feeding out in stops.
  const bursts = [[0, .55], [.7, 1.2], [1.45, 2.1]];
  for (const [start, end] of bursts) {
    const a = now + start * seconds / 2.2, b = now + end * seconds / 2.2;
    level.gain.linearRampToValueAtTime(.09, a + .04);
    level.gain.setValueAtTime(.09, b - .04);
    level.gain.linearRampToValueAtTime(0, b);
  }
  motor.connect(filter).connect(level).connect(ctx.destination);
  motor.start(now);
  motor.stop(now + seconds + .1);
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
