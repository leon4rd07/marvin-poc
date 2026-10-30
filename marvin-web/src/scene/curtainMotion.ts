const bounded = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

// The rail follows scroll exactly. Only the free cloth responds to an impulse,
// so fabric inertia cannot postpone the doorway/camera choreography.
export function createCurtainMotion(initialOpening: number) {
  let previousOpening = initialOpening;
  let displacement = 0;
  let velocity = 0;
  return {
    step(opening: number, elapsed: number) {
      velocity = bounded(velocity + (opening - previousOpening) * 2.8, 1.4);
      previousOpening = opening;
      const dt = Math.max(0, Math.min(elapsed, .05));
      // Exact underdamped oscillator solution: stable across variable frames.
      const damping = 4.8, frequency = 11;
      const decay = Math.exp(-damping * dt);
      const cosine = Math.cos(frequency * dt), sine = Math.sin(frequency * dt);
      const auxiliary = (velocity + damping * displacement) / frequency;
      const next = decay * (displacement * cosine + auxiliary * sine);
      velocity = decay * ((auxiliary * frequency - damping * displacement) * cosine
        - (displacement * frequency + damping * auxiliary) * sine);
      displacement = bounded(next, .13);
      const active = Math.abs(displacement) > .00025 || Math.abs(velocity) > .002;
      if (!active) { displacement = 0; velocity = 0; }
      return { displacement, active };
    },
  };
}

// How far the curtain hangs below its rail (metres). The full length reaches the
// floor (2.77); this leaves a short gap above it.
export const curtainDrop = 2.2;

// A hand moving over the cloth. `u`/`v` follow the pointer on the curtain surface,
// `press` is how firmly it pushes, and `drag` is the sideways swing it leaves behind,
// which keeps oscillating (damped) after the pointer has gone.
export type Hand = { u: number; v: number; press: number; drag: number };
export const noHand: Hand = { u: .5, v: .5, press: 0, drag: 0 };

export function createHandMotion() {
  let rawU = .5, rawV = .5, u = .5, v = .5;
  let hovering = false;
  let effort = 0;
  let press = 0;
  let drag = 0, dragVelocity = 0;
  const bounded = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
  return {
    // Pointer is over the curtain at (u, v); `poke` adds a one-off shove (touch/tap).
    touch(nextU: number, nextV: number, poke = 0) {
      if (hovering) {
        const speed = Math.hypot(nextU - rawU, (nextV - rawV) * .6);
        effort = Math.min(1, effort + speed * 9);
        dragVelocity = bounded(dragVelocity + (nextU - rawU) * 26, 3);
      } else { u = nextU; v = nextV; }
      hovering = true;
      rawU = nextU; rawV = nextV;
      if (poke) { effort = 1; dragVelocity = bounded(dragVelocity + poke, 3); }
    },
    leave() { hovering = false; },
    step(elapsed: number): Hand & { active: boolean } {
      const dt = Math.max(0, Math.min(elapsed, .05));
      effort *= Math.exp(-dt * 2.4);
      const follow = 1 - Math.exp(-dt * 13);
      u += (rawU - u) * follow;
      v += (rawV - v) * follow;
      // Resting contact still presses lightly; moving presses harder.
      const target = hovering ? .3 + .7 * Math.min(1, effort) : 0;
      press += (target - press) * (1 - Math.exp(-dt * 8));
      // Underdamped swing of the whole hem, impulse-driven by the pointer's sideways speed.
      const damping = 3, frequency = 6.5;
      const decay = Math.exp(-damping * dt);
      const cosine = Math.cos(frequency * dt), sine = Math.sin(frequency * dt);
      const auxiliary = (dragVelocity + damping * drag) / frequency;
      const next = decay * (drag * cosine + auxiliary * sine);
      dragVelocity = decay * ((auxiliary * frequency - damping * drag) * cosine
        - (drag * frequency + damping * auxiliary) * sine);
      drag = bounded(next, .45);
      const active = hovering || press > .004 || Math.abs(drag) > .002 || Math.abs(dragVelocity) > .01;
      if (!active) { press = 0; drag = 0; dragVelocity = 0; }
      return { u, v, press, drag, active };
    },
  };
}

export function curtainVertex(u: number, v: number, opening: number, sway = 0, windTime = 0, hand: Hand = noHand) {
  const width = 1 - opening * .81;
  // Nonuniform gathering and a slightly flared hem preserve a fabric silhouette.
  const rail = u + .013 * Math.sin(u * Math.PI * 4) * opening;
  const weight = v * v;
  const foldPhase = u * Math.PI * 14 + v ** 1.5 * (1.2 * Math.sin(u * 11) + .6 * Math.sin(v * 4));
  const fold = Math.cos(foldPhase) + .19 * Math.cos(foldPhase * 2 + .4);
  const amplitude = (.033 + opening * .031) * (.82 + .18 * Math.sin(u * 21 + 1) ** 2);
  const flare = opening * .085 * Math.sin(u * Math.PI) * weight;
  const drape = .025 * Math.sin(v * Math.PI) * Math.sin(u * 7)
    + .055 * Math.sin(opening * Math.PI) * weight * Math.sin(u * Math.PI / 2);
  // Fade secondary movement once gathered, keeping the clear doorway clear.
  const movement = sway * (1 - opening * .65) * weight;
  // Two slow, overlapping waves avoid a mechanical back-and-forth swing.
  // The rail stays pinned; wind is strongest at the hem and softens when gathered.
  const breeze = weight * (1 - opening * .8);
  const gust = Math.sin(windTime * .72 + u * 2.4 - v * 1.1)
    + .3 * Math.sin(windTime * .43 - u * 3 + v * 2);
  // Under a hand the cloth is pushed back, bunches sideways around it and swings.
  const reach = (1 - opening * .75) * Math.min(1, v * 3.2);
  const grip = hand.press > 0 ? hand.press * reach
    * Math.exp(-((u - hand.u) ** 2) / (2 * .17 ** 2) - ((v - hand.v) ** 2) / (2 * .27 ** 2)) : 0;
  const swing = hand.drag * reach * (.35 + .65 * v) * (1 - opening * .6);
  const windX = .016 * breeze * gust * Math.sin(u * Math.PI / 2);
  const windZ = breeze * (.022 * Math.sin(windTime * .72 + u * 3.1 - v * 1.7)
    + .006 * Math.sin(windTime * 1.03 - u * 4 + v * 2.2));
  return {
    x: .44 + rail * width + flare + drape + movement * Math.sin(u * Math.PI / 2) + windX
      + (u - hand.u) * grip * .2 + swing * .2,
    y: 2.99 - v * curtainDrop - .018 * Math.sin(u * Math.PI * 12) ** 2 * (1 - v)
      + (.009 * Math.cos(foldPhase + .5) + .016 * Math.sin(u * 19) + .018 * Math.sin(u * 7 + 1)) * v ** 8
      + Math.abs(movement) * .18 + breeze * .004 * Math.sin(windTime * .72 + u * 2) + grip * .035,
    z: .87 + fold * amplitude * (.65 + .35 * v) * (1 + grip * .9) - grip * .17
      + .012 * Math.sin(v * 8 + u * 11) * v + movement * Math.sin(v * 4 + u * 7) + windZ,
  };
}
