import { useEffect, useRef, useState, type RefObject } from "react";
import { asset } from "../lib/assets";
import { sectionFromHash } from "../lib/sections";
import { clamp } from "../lib/timeline";

// The opening: the site takes its own photo. A blank polaroid sits on ink; the
// booth counts down 3, 2, 1 in its window, the flash goes off, the picture
// develops into the real booth behind it, and the camera pushes through the
// polaroid's window into the page. About three and a half seconds; any scroll,
// swipe, key or tap fast-forwards it. Links straight into the booth, to the
// booking form (?book) and ?intro=0 skip it.

// Timeline, in seconds.
const appear = [0, .45];          // the polaroid and the caption come in
const countFrom = .5;             // 3, 2, 1, each `countStep` long
const countStep = .42;
const flashAt = countFrom + 3 * countStep;   // 1.76
const develop = [flashAt, flashAt + .95];     // the picture comes through
const zoom = [flashAt + .7, flashAt + 1.65];  // through the window, into the booth
const end = zoom[1];
const skipSpeed = 6;              // how much faster it runs once skipped
// The same wheel tick that skips the opening must not also walk into the booth.
const handoffMs = 300;

const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const span = (t: number, [from, to]: number[]) => clamp((t - from) / (to - from));

export function OpeningIntro({ activeRef, startActive }: {
  /** True while the opening owns wheel, touch and keys; the booth waits for false. */
  activeRef: RefObject<boolean>;
  /** False when the page opened straight inside the booth: the opening is skipped. */
  startActive: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const print = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);
  const [gone, setGone] = useState(!startActive);

  useEffect(() => {
    if (!startActive) return;
    const html = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeRef.current = true;
    html.dataset.intro = "playing";
    let time = 0;
    let speed = 1;
    let last = performance.now();
    let frame = 0;
    let handoff = 0;
    let finished = false;
    let started = false;

    function paint(t: number) {
      const r = root.current, p = print.current, w = windowRef.current;
      if (!r || !p || !w) return;
      r.dataset.time = t.toFixed(2);
      if (reduced) {
        // No countdown or zoom: the opening simply fades away.
        r.style.opacity = String(1 - clamp(t / .4));
        return;
      }
      const shown = ease(span(t, appear));
      // Through the window: grow the polaroid until its window covers the screen.
      const scaleTo = Math.max(innerWidth / w.offsetWidth, innerHeight / w.offsetHeight) * 1.08;
      const push = ease(span(t, zoom));
      const scale = (.9 + .1 * shown) * (1 + (scaleTo - 1) * push);
      // The polaroid as a whole is centred (its window sits half a strip higher);
      // the push ends with the window itself in the middle.
      const lift = (strip.current?.offsetHeight ?? 0) / 2 * (1 - push);
      p.style.transform = `translateY(${(-lift).toFixed(2)}px) scale(${scale.toFixed(4)})`;
      p.style.opacity = String(shown);
      if (caption.current) caption.current.style.opacity = String(shown * (1 - span(t, [flashAt, flashAt + .25])));
      // The countdown: each number pops in, holds and fades.
      const slot = Math.floor((t - countFrom) / countStep);
      if (count.current) {
        if (t < countFrom || slot > 2) count.current.style.opacity = "0";
        else {
          const local = (t - countFrom - slot * countStep) / countStep;
          count.current.textContent = String(3 - slot);
          count.current.style.opacity = String(Math.min(1, local / .18, (1 - local) / .2));
          count.current.style.transform = `scale(${(1.3 - .3 * ease(clamp(local / .5))).toFixed(3)})`;
        }
      }
      // Unexposed film until the flash, then it develops away to show the booth.
      if (film.current) {
        film.current.dataset.exposed = String(t >= flashAt);
        film.current.style.opacity = String(1 - ease(span(t, develop)));
      }
      if (flash.current) {
        const since = t - flashAt;
        flash.current.style.opacity = since < 0 ? "0" : String(since < .04 ? since / .04 : Math.max(0, 1 - (since - .04) / .4));
      }
      r.dataset.phase = t < flashAt ? "countdown" : t < zoom[0] ? "develop" : "zoom";
    }
    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      paint(reduced ? .4 : end);
      delete html.dataset.intro;
      setGone(true);
      handoff = window.setTimeout(() => { activeRef.current = false; }, handoffMs);
    }
    function tick() {
      // Real time, measured here (not from the frame's timestamp), counted from the
      // first frame on screen. A stall (the 3D booth loading behind) counts as a
      // quarter second at most, so it never swallows the countdown.
      const now = performance.now();
      if (started) time += Math.min(.25, (now - last) / 1000) * speed;
      started = true;
      last = now;
      if (time >= (reduced ? .4 : end)) { finish(); return; }
      paint(time);
      frame = requestAnimationFrame(tick);
    }
    const skip = () => { speed = skipSpeed; };
    // While it plays, the opening keeps the page still and only speeds itself up.
    const onWheel = (event: WheelEvent) => {
      if (finished) return;
      event.preventDefault();
      skip();
    };
    const onTouchMove = (event: TouchEvent) => {
      if (finished) return;
      event.preventDefault();
      skip();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (finished || event.ctrlKey || event.metaKey || event.altKey) return;
      if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", " ", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        skip();
      }
    };
    const onPointerDown = () => { if (!finished) skip(); };
    const onHashChange = () => { if (sectionFromHash(location.hash) !== null) finish(); };
    // Opened in a background tab: the countdown waits until the page is seen.
    const onVisibility = () => { if (!document.hidden) last = performance.now(); };
    const capture = { capture: true, passive: false } as const;
    addEventListener("wheel", onWheel, capture);
    addEventListener("touchmove", onTouchMove, capture);
    addEventListener("keydown", onKeyDown, true);
    addEventListener("pointerdown", onPointerDown, true);
    addEventListener("hashchange", onHashChange);
    document.addEventListener("visibilitychange", onVisibility);
    paint(0);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(handoff);
      delete html.dataset.intro;
      removeEventListener("wheel", onWheel, capture);
      removeEventListener("touchmove", onTouchMove, capture);
      removeEventListener("keydown", onKeyDown, true);
      removeEventListener("pointerdown", onPointerDown, true);
      removeEventListener("hashchange", onHashChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeRef, startActive]);

  if (gone) return null;
  return (
    <div className="opening" ref={root} aria-hidden="true">
      <div className="opening-print" ref={print}>
        <div className="opening-window" ref={windowRef}>
          <div className="opening-film" ref={film}>
            <i className="opening-ready" />
            <span className="opening-count" ref={count}>3</span>
          </div>
        </div>
        <div className="opening-strip" ref={strip}>
          <img src={asset("textures/marvin-logo-studio.png")} alt="" width={1086} height={376} />
        </div>
      </div>
      <p className="opening-caption" ref={caption}>Romanticizing moments through our lens</p>
      <div className="opening-flash" ref={flash} />
    </div>
  );
}
