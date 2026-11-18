import { useEffect, useRef, useState, type RefObject } from "react";
import { products } from "../data/portfolio";
import { useRing } from "../hooks/useRing";
import { asset } from "../lib/assets";
import { sectionFromHash } from "../lib/sections";
import { clamp } from "../lib/timeline";

// The opening slide: Marvin's prints (4R, XL strip, mini tote) on the same ring as
// the event photos on the monitor, to spin by dragging, the arrows or the dots.
// It turns by itself until touched. Scrolling down (wheel, swipe up, PageDown,
// arrow down, space) slides it away to the booth; a deliberate scroll up in front
// of the booth brings it back. Links straight into the booth, to the booking form
// (?book) and ?intro=0 skip it.

const leaveMs = 750;           // how long the slide takes to move away (or back)
const autoTurnMs = 3200;       // the ring turns on its own this often until touched
const handoffMs = 250;         // the same wheel tick that leaves must not also walk in
const wheelLeavePx = 40;       // a light scroll is enough to go on to the booth
const wheelBackPx = 150;       // coming back takes a deliberate scroll up
const swipePx = 40;

const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export function ProductIntro({ activeRef, startActive }: {
  /** True while the slide owns wheel, touch and keys; the booth waits for false. */
  activeRef: RefObject<boolean>;
  /** False when the page opened straight inside the booth: the slide starts away. */
  startActive: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const [away, setAway] = useState(!startActive);
  const [touched, setTouched] = useState(false);
  const ring = useRing(products.length);
  const front = products[ring.frontIndex];
  const { spin } = ring;

  // Turn by itself until the visitor takes over (and only while it is on screen).
  useEffect(() => {
    if (touched || away) return;
    const timer = window.setInterval(() => spin(1), autoTurnMs);
    return () => window.clearInterval(timer);
  }, [touched, away, spin]);

  useEffect(() => {
    const html = document.documentElement;
    // 0 = the slide fills the screen, 1 = it has moved away above the booth.
    let position = startActive ? 0 : 1;
    let target = position;
    let from = position;
    let startedAt = 0;
    let frame = 0;
    let handoff = 0;
    let wheel = 0;
    let lastWheel = 0;
    // A finger that went down on the slide: the whole gesture stays the slide's
    // (even after it has started to move away), so it cannot also scroll the page.
    let touch: { x: number; y: number; owned: boolean; done: boolean } | null = null;
    activeRef.current = startActive;
    if (startActive) html.dataset.intro = "open";

    function paint() {
      const r = root.current;
      if (!r) return;
      r.style.transform = position > 0 ? `translateY(${(-position * 100).toFixed(3)}%)` : "";
      r.dataset.position = position.toFixed(3);
    }
    function settle() {
      frame = 0;
      setAway(target === 1);
      if (target === 1) {
        delete html.dataset.intro;
        window.clearTimeout(handoff);
        handoff = window.setTimeout(() => { activeRef.current = false; }, handoffMs);
      }
    }
    function tick(now: number) {
      const t = clamp((now - startedAt) / leaveMs);
      position = from + (target - from) * ease(t);
      paint();
      if (t < 1) frame = requestAnimationFrame(tick);
      else settle();
    }
    function moveTo(next: 0 | 1) {
      if (next === target) return;
      target = next;
      from = position;
      startedAt = performance.now();
      activeRef.current = true;
      if (next === 0) { html.dataset.intro = "open"; setAway(false); }
      window.clearTimeout(handoff);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    }
    const showing = () => target === 0;
    // In front of the booth, at rest: the only place the slide comes back from.
    const atBoothHome = () => scrollY === 0 && html.dataset.locked !== "true" && !activeRef.current;
    const inForm = (node: EventTarget | null) => node instanceof Element && node.closest("dialog, input, textarea, select");

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || inForm(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      const now = performance.now();
      if (now - lastWheel > 400) wheel = 0;
      lastWheel = now;
      if (showing() || frame) {
        // The page stays still while the slide is up; enough scrolling down leaves.
        event.preventDefault();
        wheel = delta > 0 ? Math.max(0, wheel) + delta : 0;
        if (showing() && wheel >= wheelLeavePx) { wheel = 0; moveTo(1); }
        return;
      }
      if (delta > 0 || !atBoothHome()) { wheel = 0; return; }
      wheel -= delta;
      if (wheel >= wheelBackPx) { wheel = 0; event.preventDefault(); moveTo(0); }
    };
    const onTouchStart = (event: TouchEvent) => {
      touch = event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY, owned: showing() || frame !== 0, done: false } : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1 || inForm(event.target)) return;
      const dx = event.touches[0].clientX - touch.x, dy = event.touches[0].clientY - touch.y;
      const upright = Math.abs(dy) > Math.abs(dx);
      if (touch.owned) {
        // Sideways belongs to the ring; up and down to the slide, for the whole gesture.
        if (upright || touch.done) event.preventDefault();
        if (!touch.done && showing() && dy < -swipePx && upright) { touch.done = true; moveTo(1); }
        return;
      }
      if (!touch.done && dy > swipePx * 2 && upright && atBoothHome()) {
        // Pulling down in front of the booth: the rest of this gesture is the slide's too.
        touch.done = touch.owned = true;
        event.preventDefault();
        moveTo(0);
      }
    };
    const onTouchEnd = () => { touch = null; };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || inForm(event.target)) return;
      const down = event.key === "PageDown" || event.key === "ArrowDown" || event.key === " " && !event.shiftKey;
      const up = event.key === "PageUp" || event.key === "ArrowUp" || event.key === " " && event.shiftKey;
      if (showing() && down) { event.preventDefault(); moveTo(1); }
      else if (showing() && up) event.preventDefault();
      else if (!showing() && !frame && up && atBoothHome()) { event.preventDefault(); moveTo(0); }
    };
    // A link straight into the booth (or Back/Forward to one) puts the slide away at once.
    const onHashChange = () => {
      if (sectionFromHash(location.hash) === null || target === 1) return;
      cancelAnimationFrame(frame);
      target = position = 1;
      paint();
      settle();
    };
    const onLeave = () => moveTo(1);

    // Capture phase: these run before the booth's own listeners, so `activeRef` is
    // already right when the booth looks at it for the same event.
    const capture = { capture: true, passive: false } as const;
    addEventListener("wheel", onWheel, capture);
    addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    addEventListener("touchmove", onTouchMove, capture);
    addEventListener("touchend", onTouchEnd, true);
    addEventListener("touchcancel", onTouchEnd, true);
    addEventListener("keydown", onKeyDown, true);
    addEventListener("hashchange", onHashChange);
    root.current?.addEventListener("marvin:leave-intro", onLeave);
    const element = root.current;
    paint();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(handoff);
      delete html.dataset.intro;
      removeEventListener("wheel", onWheel, capture);
      removeEventListener("touchstart", onTouchStart, true);
      removeEventListener("touchmove", onTouchMove, capture);
      removeEventListener("touchend", onTouchEnd, true);
      removeEventListener("touchcancel", onTouchEnd, true);
      removeEventListener("keydown", onKeyDown, true);
      removeEventListener("hashchange", onHashChange);
      element?.removeEventListener("marvin:leave-intro", onLeave);
    };
  }, [activeRef, startActive]);

  const takeOver = () => setTouched(true);
  return (
    <section className="product-intro" ref={root} data-away={away} aria-label="Marvin prints" inert={away}>
      <p className="product-eyebrow">Take the moment home</p>
      <div className="product-stage">
        <button type="button" className="slide-arrow" data-side="prev" aria-label="Previous product" onClick={() => { takeOver(); ring.spin(-1); }}>‹</button>
        <div className="gallery product-gallery" data-dragging={ring.dragging}
          role="group" aria-roledescription="carousel" aria-label="Marvin prints. Drag or use the arrow keys to turn."
          tabIndex={0} onKeyDown={event => { takeOver(); ring.onKeyDown(event); }}
          {...ring.handlers} onPointerDown={event => { takeOver(); ring.handlers.onPointerDown(event); }}>
          <div className="ring" data-angle={Math.round(ring.angle)}>
            {products.map((product, order) => (
              <figure key={product.id} className="print" data-front={order === ring.frontIndex} style={ring.styleFor(order)}
                aria-hidden={order !== ring.frontIndex} onClick={order === ring.frontIndex ? undefined : () => { takeOver(); ring.pick(order); }}>
                <img src={asset(product.src)} alt={product.alt} width={product.width} height={product.height} decoding="async" draggable={false} />
                <figcaption><img className="print-logo" src={asset("textures/marvin-logo-studio.png")} alt="" width={1086} height={376} draggable={false} /></figcaption>
              </figure>
            ))}
          </div>
        </div>
        <button type="button" className="slide-arrow" data-side="next" aria-label="Next product" onClick={() => { takeOver(); ring.spin(1); }}>›</button>
      </div>
      <div className="product-caption" aria-live="polite" aria-atomic="true">
        <h2 className="product-name">{front.name}</h2>
        <p className="product-detail">{front.detail}</p>
      </div>
      <div className="product-dots" role="group" aria-label="Prints">
        {products.map((product, order) => (
          <button type="button" className="event-dot" key={product.id} aria-label={`Show ${product.name}`}
            aria-current={order === ring.frontIndex} onClick={() => { takeOver(); ring.pick(order); }} />
        ))}
      </div>
      <button type="button" className="scroll-cue product-scroll" aria-label="Step inside the booth"
        onClick={event => event.currentTarget.closest("section")?.dispatchEvent(new Event("marvin:leave-intro"))}>
        <span className="scroll-cue-label"><span className="scroll-cue-scroll">Scroll to step inside</span><span className="scroll-cue-swipe">Swipe up to step inside</span></span>
        <svg className="scroll-cue-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" /></svg>
      </button>
    </section>
  );
}
