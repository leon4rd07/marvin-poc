import { asset } from "./assets";

// Sounds for the selfie: a real camera shutter (a recording, public/sounds/
// shutter.mp3, from the Android Open Source Project under the Apache License 2.0;
// see public/sounds/NOTICE.txt) and a light paper swish synthesized on the spot.
//
// The shutter plays through an <audio> element rather than Web Audio: phones (an
// iPhone with its ringer switched to silent, especially) keep <audio> audible
// where they mute Web Audio, and it starts on the tap itself, which browsers allow.

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

const shutterSrc = asset("sounds/shutter.mp3");
// A few players, so quick taps each get their own click instead of cutting one off.
const shutters: HTMLAudioElement[] = [];
let nextShutter = 0;

export function playShutter() {
  if (typeof Audio === "undefined") return;
  if (shutters.length < 3) {
    const player = new Audio(shutterSrc);
    player.preload = "auto";
    player.volume = .9;
    shutters.push(player);
  }
  const player = shutters[nextShutter++ % shutters.length];
  try {
    player.currentTime = 0;
    void player.play().catch(() => {});
  } catch { /* no sound is better than an error */ }
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
