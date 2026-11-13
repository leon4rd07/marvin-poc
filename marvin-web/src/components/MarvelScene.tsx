import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { marvelItems } from "../data/marvel";
import { sectionFromHash } from "../lib/sections";
import { clamp } from "../lib/timeline";
import { createScrollMotion } from "../scene/scrollMotion";
import DriftWall, { type DriftWallItem, type DriftWallPose } from "./DriftWall";

// The opening scene: a still wall of pictures turned 30 degrees to one side, which
// swings round to face you as you scroll and then gives way to the booth. It lies over the booth and keeps its
// own scroll position (the page itself does not move), so the booth's entrance
// below is untouched.

// Pacing. How much scrolling the whole scene takes, and how long it glides.
const wheelTravel = 2600;   // wheel pixels from start to end (a mouse notch is about 100)
const touchTravel = 2.4;    // the same in screen heights of swiping
const keyStep = .14;        // one PageDown / arrow / space
const response = .28;       // seconds; larger is a longer, softer glide
// The wall is upright at `straightAt`; the rest of the scroll fades it into the booth.
const straightAt = .8;
// Positive `turn` puts the left side nearer; make it negative for the other way.
const leaning: DriftWallPose = { tilt: 0, turn: 30, roll: 0, depth: 120 };
const upright: DriftWallPose = { tilt: 0, turn: 0, roll: 0, depth: 0 };
// The wall is finished once it can no longer be seen; the long easing tail after
// that is not worth waiting for.
const doneAt = .985;
// After that the booth takes over, and scrolling simply carries on into it. This
// short pause only keeps the very same wheel tick from doing both.
const handoffMs = 250;
// Bringing the wall back from in front of the booth takes a deliberate upward
// scroll, not the few pixels a trackpad gives back at the end of a gesture.
const wheelBackPx = 150;
const touchBackPx = 40;

const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (from: number, to: number, t: number) => from + (to - from) * t;

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
// Enough tiles for every column, ordered so neighbours differ.
function fillWall(items: DriftWallItem[], columns: number, rows: number) {
  const step = [5, 7, 3, 11, 1].find(candidate => gcd(candidate, items.length) === 1) ?? 1;
  return Array.from({ length: columns * rows }, (_, index) =>
    items[((index % columns) * 3 + Math.floor(index / columns) * step) % items.length]);
}
function layoutFor(width: number) {
  const tileWidth = width < 640 ? 118 : width < 1100 ? 160 : 190;
  const gap = width < 640 ? 12 : 18;
  // Spare columns keep the far side covered while the wall is turned away.
  const columns = Math.max(5, Math.ceil(width / ((tileWidth + gap) * 1.18)) + 10);
  return { tileWidth, tileHeight: Math.round(tileWidth * 4 / 3), gap, columns };
}

export function MarvelScene({ activeRef, startActive }: {
  /** True while this scene owns wheel, touch and keys; the booth waits for false. */
  activeRef: RefObject<boolean>;
  /** False when the page opened straight inside the booth: the scene is skipped. */
  startActive: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const wall = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  const pose = useRef<DriftWallPose>({ ...leaning });
  const [gone, setGone] = useState(!startActive);
  const [width, setWidth] = useState(() => innerWidth);
  const layout = useMemo(() => layoutFor(width), [width]);
  const items = useMemo(() => fillWall(marvelItems, layout.columns, 5), [layout.columns]);

  useEffect(() => {
    const onResize = () => setWidth(innerWidth);
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let target = startActive ? 0 : 1;
    let progress = target;
    const motion = { current: createScrollMotion(progress, response) };
    let frame = 0;
    let last = 0;
    let arrivedAt = -Infinity;
    let handoff = 0;
    let upward = 0;
    let lastUpward = -Infinity;
    let touch: { y: number; from: number; owned: boolean } | null = null;

    const settled = () => progress === 1 && target === 1;
    const handingOff = () => performance.now() - arrivedAt < handoffMs;
    // The booth is at rest at its front, the only place the wall can come back from.
    const atBoothHome = () => scrollY === 0 && document.documentElement.dataset.locked !== "true";
    // Input goes to the booth from here on (unless a finger is still down).
    function release() {
      handoff = 0;
      if (settled() && !touch) activeRef.current = false;
    }
    function paint() {
      const straighten = ease(clamp(progress / straightAt));
      const reveal = ease(clamp((progress - straightAt) / (1 - straightAt)));
      pose.current = {
        tilt: mix(leaning.tilt, upright.tilt, straighten),
        turn: mix(leaning.turn, upright.turn, straighten),
        roll: mix(leaning.roll, upright.roll, straighten),
        depth: mix(leaning.depth, upright.depth, straighten),
      };
      if (root.current) {
        root.current.style.opacity = String(1 - reveal);
        root.current.dataset.progress = progress.toFixed(3);
      }
      if (wall.current) wall.current.style.transform = `scale(${(1 + .1 * reveal).toFixed(4)})`;
      if (hint.current) hint.current.style.opacity = String(1 - clamp(progress / .06));
      setGone(settled());
    }
    function tick(now: number) {
      const step = motion.current.step(target, (now - last) / 1000);
      last = now;
      progress = step.progress;
      const arrived = target === 1 && progress > doneAt;
      if (arrived) {
        progress = 1;
        motion.current = createScrollMotion(1, response);
        arrivedAt = performance.now();
        window.clearTimeout(handoff);
        handoff = window.setTimeout(release, handoffMs);
      }
      paint();
      frame = step.active && !arrived ? requestAnimationFrame(tick) : 0;
    }
    function moveTo(next: number) {
      target = clamp(next);
      activeRef.current = true;
      upward = 0;
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (settled()) {
        if (handingOff()) { event.preventDefault(); return; }
        activeRef.current = false;
        if (delta > 0 || !atBoothHome()) { upward = 0; return; }
        const now = performance.now();
        if (now - lastUpward > 600) upward = 0;
        lastUpward = now;
        upward -= delta;
        if (upward < wheelBackPx) return;
      }
      event.preventDefault();
      moveTo(target + delta / wheelTravel);
    };
    const onTouchStart = (event: TouchEvent) => {
      touch = event.touches.length === 1 ? { y: event.touches[0].clientY, from: target, owned: !settled() } : null;
      activeRef.current = touch?.owned ?? false;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1) return;
      const dy = touch.y - event.touches[0].clientY;
      if (!touch.owned) {
        // A clear downward pull in front of the booth brings the wall back.
        if (dy > -touchBackPx || !atBoothHome()) return;
        touch = { y: event.touches[0].clientY, from: 1, owned: true };
        activeRef.current = true;
        return;
      }
      event.preventDefault();
      moveTo(touch.from + dy / (innerHeight * touchTravel));
    };
    const onTouchEnd = () => {
      touch = null;
      if (!handoff) release();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target instanceof HTMLElement ? event.target : null;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || element?.isContentEditable
        || element?.matches("input, textarea, select, video, button, [role='tab']")) return;
      const down = event.key === "PageDown" || event.key === "ArrowDown" || event.key === " " && !event.shiftKey;
      const up = event.key === "PageUp" || event.key === "ArrowUp" || event.key === " " && event.shiftKey;
      if (!down && !up) return;
      if (settled()) {
        if (handingOff()) { event.preventDefault(); return; }
        activeRef.current = false;
        if (!up || !atBoothHome()) return;
      }
      event.preventDefault();
      moveTo(target + (down ? keyStep : -keyStep));
    };
    // A link straight into the booth (or Back/Forward to one) closes the scene.
    const onHashChange = () => {
      if (sectionFromHash(location.hash) === null || settled()) return;
      cancelAnimationFrame(frame);
      window.clearTimeout(handoff);
      frame = handoff = 0;
      target = progress = 1;
      motion.current = createScrollMotion(1, response);
      activeRef.current = false;
      paint();
    };

    // Capture phase: these run before the booth's own listeners, so `activeRef`
    // is already right when the booth looks at it for the same event.
    const capture = { capture: true, passive: false } as const;
    addEventListener("wheel", onWheel, capture);
    addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    addEventListener("touchmove", onTouchMove, capture);
    addEventListener("touchend", onTouchEnd, true);
    addEventListener("touchcancel", onTouchEnd, true);
    addEventListener("keydown", onKeyDown, true);
    addEventListener("hashchange", onHashChange);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(handoff);
      removeEventListener("wheel", onWheel, capture);
      removeEventListener("touchstart", onTouchStart, true);
      removeEventListener("touchmove", onTouchMove, capture);
      removeEventListener("touchend", onTouchEnd, true);
      removeEventListener("touchcancel", onTouchEnd, true);
      removeEventListener("keydown", onKeyDown, true);
      removeEventListener("hashchange", onHashChange);
    };
  }, [activeRef, startActive]);

  return (
    <div className="marvel" ref={root} data-gone={gone} aria-hidden="true">
      <div className="marvel-wall" ref={wall}>
        <DriftWall items={items} poseRef={pose} paused={gone} interactive={false}
          columns={layout.columns} tileWidth={layout.tileWidth} tileHeight={layout.tileHeight} gap={layout.gap}
          radius={10} perspective={1200} speed={0} parallax={0} lift={40} fade={.55} dim={1} overlayColor="transparent" />
      </div>
      <p className="marvel-hint" ref={hint}><span className="stack-sub">Scroll</span></p>
    </div>
  );
}
