import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { marvelItems } from "../data/marvel";
import { sectionFromHash } from "../lib/sections";
import { clamp } from "../lib/timeline";
import { createScrollMotion } from "../scene/scrollMotion";
import DriftWall, { type DriftWallItem, type DriftWallPose } from "./DriftWall";

// The opening scene: a wall of pictures leaning back, which stands up straight as
// you scroll and then gives way to the booth. It lies over the booth and keeps its
// own scroll position (the page itself does not move), so the booth's entrance
// below is untouched.

// Pacing. How much scrolling the whole scene takes, and how long it glides.
const wheelTravel = 2600;   // wheel pixels from start to end (a mouse notch is about 100)
const touchTravel = 2.4;    // the same in screen heights of swiping
const keyStep = .14;        // one PageDown / arrow / space
const response = .28;       // seconds; larger is a longer, softer glide
// The wall is upright at `straightAt`; the rest of the scroll fades it into the booth.
const straightAt = .8;
const leaning: DriftWallPose = { tilt: 30, turn: 0, roll: 0, depth: 120 };
const upright: DriftWallPose = { tilt: 0, turn: 0, roll: 0, depth: 0 };
// A wheel gesture (and its trackpad momentum) that finishes the scene must not also
// walk into the booth: the booth gets its turn after this long without wheel input,
// and never sooner than `arrivalHoldMs` after the booth has appeared.
const wheelQuietMs = 400;
const arrivalHoldMs = 600;

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
  // Two extra columns keep the far edges covered while the wall is turned.
  const columns = Math.max(3, Math.ceil(width / ((tileWidth + gap) * 1.18)) + 2);
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
    let lastWheel = -Infinity;
    let arrivedAt = -Infinity;
    let touch: { y: number; from: number; owned: boolean } | null = null;

    const settled = () => progress === 1 && target === 1;
    // The booth is at rest at its front, the only place the wall can come back from.
    const atBoothHome = () => scrollY === 0 && document.documentElement.dataset.locked !== "true";
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
      // The last sliver of the fade is invisible; do not make the booth wait for it.
      const arrived = target === 1 && progress > .997;
      if (arrived) {
        if (progress < 1) arrivedAt = performance.now();
        progress = 1;
        motion.current = createScrollMotion(1, response);
      }
      paint();
      frame = step.active && !arrived ? requestAnimationFrame(tick) : 0;
      if (!frame && settled() && !touch && now - lastWheel > wheelQuietMs) activeRef.current = false;
    }
    function moveTo(next: number) {
      target = clamp(next);
      activeRef.current = true;
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      // The event's own time, not the time it is handled: a busy page that delivers
      // wheel events late must not mistake one gesture for two.
      const now = event.timeStamp;
      const quiet = now - lastWheel > wheelQuietMs;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (settled()) {
        const sameGesture = now - arrivedAt < arrivalHoldMs || (activeRef.current && !quiet);
        const back = delta < 0 && atBoothHome();
        if (!sameGesture && !back) { activeRef.current = false; return; }
      }
      lastWheel = now;
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
        // A downward pull in front of the booth brings the wall back.
        if (dy > -12 || !atBoothHome()) return;
        touch = { y: event.touches[0].clientY, from: 1, owned: true };
        activeRef.current = true;
        return;
      }
      event.preventDefault();
      moveTo(touch.from + dy / (innerHeight * touchTravel));
    };
    const onTouchEnd = () => {
      touch = null;
      if (settled() && !frame) activeRef.current = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target instanceof HTMLElement ? event.target : null;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || element?.isContentEditable
        || element?.matches("input, textarea, select, video, button, [role='tab']")) return;
      const down = event.key === "PageDown" || event.key === "ArrowDown" || event.key === " " && !event.shiftKey;
      const up = event.key === "PageUp" || event.key === "ArrowUp" || event.key === " " && event.shiftKey;
      if (!down && !up) return;
      if (settled()) {
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
      frame = 0;
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
          radius={10} perspective={1200} speed={34} parallax={.5} lift={40} fade={.55} dim={1} overlayColor="transparent" />
      </div>
      <p className="marvel-hint" ref={hint}><span className="stack-sub">Scroll</span></p>
    </div>
  );
}
