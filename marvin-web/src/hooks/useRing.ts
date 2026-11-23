import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { wrap } from "../lib/timeline";

// A ring of cards you spin: drag or swipe it, use the arrows or keys, or click a
// card at the side. Used for an event's photos on the monitor. What is drawn eases
// towards `angle` (a damped spring), so every turn and snap glides; while dragging
// it follows the pointer directly.
export function useRing(count: number) {
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [shown, setShown] = useState(0);
  const motion = useRef({ value: 0, velocity: 0 });
  useEffect(() => {
    if (dragging) { motion.current = { value: angle, velocity: 0 }; return; }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      const state = motion.current;
      const stiffness = 90, damping = 19;
      state.velocity += ((angle - state.value) * stiffness - state.velocity * damping) * dt;
      state.value += state.velocity * dt;
      if (Math.abs(angle - state.value) < .05 && Math.abs(state.velocity) < .05) { state.value = angle; state.velocity = 0; setShown(angle); return; }
      setShown(state.value);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [angle, dragging]);

  const drag = useRef<{ x: number; y: number; angle: number; lastX: number; lastT: number; speed: number; moved: boolean; id: number } | null>(null);
  const stepAngle = 360 / count;
  const frontIndex = wrap(Math.round(-angle / stepAngle), count);
  const snap = (value: number) => Math.round(value / stepAngle) * stepAngle;
  const spin = (delta: 1 | -1) => setAngle(value => snap(value) - delta * stepAngle);
  function pick(order: number) {
    // Turn the shortest way round to the clicked card.
    const offset = wrap(order - frontIndex + Math.floor(count / 2), count) - Math.floor(count / 2);
    setAngle(value => snap(value) - offset * stepAngle);
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY, angle, lastX: event.clientX, lastT: performance.now(), speed: 0, moved: false, id: event.pointerId };
  }
  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x, dy = event.clientY - state.y;
    if (!state.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
      state.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const now = performance.now();
    const width = event.currentTarget.clientWidth || 600;
    const degreesPerPixel = 220 / width;
    state.speed = (event.clientX - state.lastX) / Math.max(1, now - state.lastT) * degreesPerPixel;
    state.lastX = event.clientX; state.lastT = now;
    setAngle(state.angle + dx * degreesPerPixel);
  }
  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state || !state.moved) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    // A flick carries on a little before settling on the nearest card.
    setAngle(value => snap(value + state.speed * 260));
  }
  function onPointerCancel() {
    drag.current = null;
    setDragging(false);
    setAngle(value => snap(value));
  }
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") { event.preventDefault(); spin(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); spin(-1); }
  }
  // Each card rides round a circle seen from the front: across by sin, nearer
  // (larger, brighter, on top) by cos.
  function styleFor(order: number): CSSProperties {
    const turn = ((dragging ? angle : shown) + order * stepAngle) * Math.PI / 180;
    const across = Math.sin(turn), near = Math.cos(turn);
    return {
      transform: `translateX(${(across * 118).toFixed(2)}%) scale(${(.7 + .3 * near).toFixed(4)})`,
      zIndex: Math.round(near * 100) + 100,
      filter: `brightness(${(.6 + .4 * near).toFixed(3)}) saturate(${(.55 + .45 * near).toFixed(3)})`,
      opacity: near < -.25 ? Math.max(0, (near + .7) / .45) : 1,
    };
  }

  return {
    angle, setAngle, dragging, frontIndex, snap, spin, pick, styleFor, onKeyDown,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
