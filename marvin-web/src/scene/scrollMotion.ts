import { clamp } from "../lib/timeline";

// A short, frame-rate-independent response turns wheel/touch increments into
// continuous camera and curtain movement. Snap at rest so rendering can stop.
// `response` is the time constant in seconds: larger glides for longer.
export function createScrollMotion(initialProgress: number, response = .075) {
  let progress = clamp(initialProgress);
  return {
    step(target: number, elapsed: number) {
      const goal = clamp(target);
      const dt = Math.max(0, Math.min(elapsed, .05));
      progress += (goal - progress) * (1 - Math.exp(-dt / response));
      const active = Math.abs(goal - progress) > .00005;
      if (!active) progress = goal;
      return { progress, active };
    },
  };
}
