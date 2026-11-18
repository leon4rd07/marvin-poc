import { asset } from "./assets";

// The selfie's only sound: a real camera shutter (a recording, public/sounds/
// shutter.mp3, from the Android Open Source Project under the Apache License 2.0;
// see public/sounds/NOTICE.txt). The print leaves silently.
//
// The shutter plays through an <audio> element rather than Web Audio: phones (an
// iPhone with its ringer switched to silent, especially) keep <audio> audible
// where they mute Web Audio, and it starts on the tap itself, which browsers allow.

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
