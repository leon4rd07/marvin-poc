import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { asset } from "../lib/assets";
import { sectionFromHash } from "../lib/sections";
import { clamp } from "../lib/timeline";

// The opening, in the spirit of a film studio's title card but made of Marvin's
// own work: photos from the events flick past full screen, faster and faster;
// pulling back reveals they are playing inside the letters of MARVIN; a flash
// turns the letters into the booth's lit yellow sign, and that sign flies onto
// the booth's own sign as the page appears. About three and a half seconds; any
// scroll, swipe, key or tap fast-forwards it. Links straight into the booth, to
// the booking form (?book) and ?intro=0 skip it.

// The reel: small copies in public/portfolio/opening/, from every event.
const reel = Array.from({ length: 18 }, (_, index) => asset(`portfolio/opening/reel-${String(index + 1).padStart(2, "0")}.webp`));
const wordmark = asset("textures/marvin-wordmark.png");

// Timeline, in seconds.
const lettersAt = .95;     // the full-screen photos give way to the letters
const settleAt = 1.95;     // the letters have pulled back to their size
const flashAt = 2.05;      // the photos become the lit sign
const landAt = 2.55;       // the sign flies onto the booth
const end = 3.4;
const skipSpeed = 6;
// The same wheel tick that skips the opening must not also walk into the booth.
const handoffMs = 300;
// Wait this long at most for the first photos before starting anyway.
const loadWaitMs = 1500;
// Pulling back starts zoomed deep into the M's left stroke, so the screen stays
// full of photo; `origin` is that point, as a share of the word's box.
const pullFrom = 26;
const origin = { x: .055, y: .55 };

const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const span = (t: number, from: number, to: number) => clamp((t - from) / (to - from));
// Photos change ever faster: about 5 a second at first, over 25 a second at the end.
const flips = (t: number) => Math.floor(5 * t + 5.5 * t * t);

export function OpeningIntro({ activeRef, startActive }: {
  /** True while the opening owns wheel, touch and keys; the booth waits for false. */
  activeRef: RefObject<boolean>;
  /** False when the page opened straight inside the booth: the opening is skipped. */
  startActive: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const full = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const sign = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(!startActive);
  // Like the entrance, the opening plays even when the system asks for reduced
  // motion (see useReducedMotion); if that is ever honoured, it only fades.
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!startActive) return;
    const html = document.documentElement;
    activeRef.current = true;
    html.dataset.intro = "playing";
    let time = 0;
    let speed = 1;
    let last = 0;
    let frame = 0;
    let handoff = 0;
    let waiting = 0;
    let finished = false;
    let started = false;
    let shown = -1;
    let landing: { x: number; y: number; scale: number } | null = null;

    // Show photo `index` in both reels (one <img> per photo, each decoded once).
    function showPhoto(index: number) {
      if (index === shown) return;
      shown = index;
      for (const layer of [full.current, mark.current])
        layer?.querySelectorAll("img").forEach((image, n) => { image.dataset.on = String(n === index); });
    }
    // How far the sign must move and scale to sit on the booth's sign, as the 3D
    // booth reports it; without the 3D booth it rises and shrinks away.
    function landingSpot() {
      const s = sign.current;
      const rect = document.querySelector<HTMLElement>(".booth-renderer")?.dataset.signRect?.split(",").map(Number);
      if (!s || !rect || rect.length !== 4 || !(rect[2] > 0)) return { x: 0, y: -innerHeight * .28, scale: .32 };
      return {
        x: rect[0] + rect[2] / 2 - innerWidth / 2,
        y: rect[1] + rect[3] / 2 - innerHeight / 2,
        scale: rect[2] / s.offsetWidth,
      };
    }
    function paint(t: number) {
      const r = root.current, m = mark.current, s = sign.current;
      if (!r || !m || !s) return;
      r.dataset.time = t.toFixed(2);
      if (reduced) {
        r.style.opacity = String(1 - clamp(t / .4));
        return;
      }
      r.dataset.phase = t < lettersAt ? "reel" : t < flashAt ? "letters" : t < landAt ? "sign" : "land";
      showPhoto(flips(t) % reel.length);
      // 1. Full-screen photos, then (quickly) only the ones inside the letters.
      if (full.current) full.current.style.opacity = String(1 - span(t, lettersAt, lettersAt + .12));
      // 2. Pull back: from deep inside the M to the whole word, centred. The word
      // is centred by its CSS and scales about `origin`; the shift puts that point
      // in the middle of the screen at the start.
      const pull = easeOut(span(t, lettersAt, settleAt));
      const scale = Math.exp(Math.log(pullFrom) * (1 - pull));
      const shiftX = (m.offsetWidth * (.5 - origin.x)) * (1 - pull);
      const shiftY = (m.offsetHeight * (.5 - origin.y)) * (1 - pull);
      m.style.transform = `translate(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      m.style.opacity = t < lettersAt ? "0" : String(1 - span(t, flashAt, flashAt + .02));
      // 3. The flash; at its peak the letters become the lit sign.
      if (flash.current) {
        const since = t - flashAt;
        flash.current.style.opacity = since < -.05 ? "0" : since < 0 ? String((since + .05) / .05) : String(Math.max(0, 1 - since / .45));
      }
      s.style.opacity = t < flashAt ? "0" : String(1 - span(t, end - .18, end));
      // 4. The sign flies onto the booth's sign while the dark falls away.
      if (t >= landAt && !landing) landing = landingSpot();
      const to = landing ?? { x: 0, y: 0, scale: 1 };
      const fly = ease(span(t, landAt, end - .15));
      const glow = t < landAt ? 1 + .04 * Math.sin(span(t, flashAt, landAt) * Math.PI) : 1;
      s.style.transform = `translate(${(to.x * fly).toFixed(1)}px, ${(to.y * fly).toFixed(1)}px) scale(${(glow * (1 + (to.scale - 1) * fly)).toFixed(4)})`;
      if (backdrop.current) backdrop.current.style.opacity = String(1 - ease(span(t, landAt + .1, end - .1)));
    }
    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(waiting);
      paint(reduced ? .4 : end);
      delete html.dataset.intro;
      setGone(true);
      handoff = window.setTimeout(() => { activeRef.current = false; }, handoffMs);
    }
    function tick() {
      // Real time, measured here, counted from the first frame on screen. A stall
      // (the 3D booth loading behind) counts as a quarter second at most.
      const now = performance.now();
      if (started) time += Math.min(.25, (now - last) / 1000) * speed;
      started = true;
      last = now;
      if (time >= (reduced ? .4 : end)) { finish(); return; }
      paint(time);
      frame = requestAnimationFrame(tick);
    }
    // Start once the first photos are in (or after a short wait), so the reel never shows blank.
    function begin() {
      if (frame || finished) return;
      window.clearTimeout(waiting);
      paint(0);
      frame = requestAnimationFrame(tick);
    }
    waiting = window.setTimeout(begin, loadWaitMs);
    void Promise.all(reel.slice(0, 6).map(src => new Promise<void>(done => {
      const image = new Image();
      image.onload = image.onerror = () => done();
      image.src = src;
    }))).then(begin);

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
    // Opened in a background tab: it waits until the page is seen.
    const onVisibility = () => { if (!document.hidden) last = performance.now(); };
    const capture = { capture: true, passive: false } as const;
    addEventListener("wheel", onWheel, capture);
    addEventListener("touchmove", onTouchMove, capture);
    addEventListener("keydown", onKeyDown, true);
    addEventListener("pointerdown", onPointerDown, true);
    addEventListener("hashchange", onHashChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(waiting);
      window.clearTimeout(handoff);
      delete html.dataset.intro;
      removeEventListener("wheel", onWheel, capture);
      removeEventListener("touchmove", onTouchMove, capture);
      removeEventListener("keydown", onKeyDown, true);
      removeEventListener("pointerdown", onPointerDown, true);
      removeEventListener("hashchange", onHashChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeRef, startActive, reduced]);

  if (gone) return null;
  const photos = reel.map((src, index) => <img key={src} src={src} alt="" data-on={index === 0} decoding="async" />);
  return (
    <div className="opening" ref={root} aria-hidden="true" style={{ "--wordmark": `url("${wordmark}")` } as CSSProperties}>
      <div className="opening-backdrop" ref={backdrop} />
      <div className="opening-full" ref={full}>{photos}</div>
      <div className="opening-mark-frame"><div className="opening-mark" ref={mark}>{photos}</div></div>
      <div className="opening-sign" ref={sign}><img src={wordmark} alt="" width={1098} height={227} /></div>
      <div className="opening-flash" ref={flash} />
    </div>
  );
}
