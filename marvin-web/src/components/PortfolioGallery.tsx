import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { collections, showcaseViews, type Portrait as PortraitData, type ShowcaseView } from "../data/portfolio";
import { asset } from "../lib/assets";
import { wrap } from "../lib/timeline";
import { BoothModelViewer } from "./BoothModelViewer";

function Portrait({ portrait, front, style, onPick }: {
  portrait: PortraitData; front: boolean; style: CSSProperties; onPick: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <figure className="print" data-front={front} style={style} aria-hidden={!front} onClick={front ? undefined : onPick}>
      {broken ? (
        <div className="image-fallback" role="img" aria-label={`${portrait.alt}. Image unavailable.`}>
          <span aria-hidden="true">✳</span>
          Portrait unavailable
        </div>
      ) : (
        <img src={asset(portrait.src)} alt={portrait.alt} width={portrait.width} height={portrait.height}
          decoding="async" draggable={false} onError={() => setBroken(true)} />
      )}
      <figcaption><img className="print-logo" src={asset("textures/marvin-logo-studio.png")} alt="" width={1086} height={376} draggable={false} /></figcaption>
    </figure>
  );
}

// The photos of an event stand on a ring that you spin: drag or swipe it, use the
// arrows, or click a photo at the side. Changing event spins the ring a full turn
// as the new photos come in. Every event also has a 3D booth and a video.
export function PortfolioGallery() {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<ShowcaseView>("photos");
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  // What is drawn eases towards `angle` (a damped spring), so every turn, snap and
  // event change glides; while dragging it follows the pointer directly.
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
  const current = collections[index];
  const views = showcaseViews.filter(view => view.id !== "video" || current.video);
  const view = views.some(option => option.id === chosen) ? chosen : "photos";
  const count = current.images.length;
  const stepAngle = 360 / count;
  const frontIndex = wrap(Math.round(-angle / stepAngle), count);
  const snap = (value: number) => Math.round(value / stepAngle) * stepAngle;

  function go(target: number, forward = target > index) {
    const next = wrap(target, collections.length);
    if (next === index) return;
    setIndex(next);
    // One full turn of the ring while the new event's photos come round.
    setAngle(value => snap(value) + (forward ? -360 : 360));
  }
  const stepEvent = (delta: 1 | -1) => go(index + delta, delta > 0);
  const spin = (delta: 1 | -1) => setAngle(value => snap(value) - delta * stepAngle);
  function pick(order: number) {
    // Turn the shortest way round to the clicked photo.
    const offset = wrap(order - frontIndex + Math.floor(count / 2), count) - Math.floor(count / 2);
    setAngle(value => snap(value) - offset * stepAngle);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY, angle, lastX: event.clientX, lastT: performance.now(), speed: 0, moved: false, id: event.pointerId };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
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
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state || !state.moved) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    // A flick carries on a little before settling on the nearest photo.
    setAngle(value => snap(value + state.speed * 260));
  }
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") { event.preventDefault(); spin(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); spin(-1); }
  }

  return (
    <div className="showcase">
      <h2 className="event-title" aria-live="polite" aria-atomic="true">{current.name}</h2>
      <div className="showcase-views" role="group" aria-label="How to view this event">
        {views.map(option => (
          <button type="button" key={option.id} aria-pressed={view === option.id}
            onClick={() => setChosen(option.id)}>{option.label}</button>
        ))}
      </div>
      <div className="showcase-stage" data-view={view}>
        {view === "photos" && (
          <button type="button" className="slide-arrow" data-side="prev" aria-label="Previous photo" onClick={() => spin(-1)}>‹</button>
        )}
        <div className="showcase-media">
          {view === "photos" && (
            <div className="gallery" data-dragging={dragging}
              role="group" aria-roledescription="carousel" aria-label={`Photos from ${current.name}. Drag or use the arrow keys to turn.`}
              tabIndex={0} onKeyDown={onKeyDown}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
              onPointerCancel={() => { drag.current = null; setDragging(false); setAngle(value => snap(value)); }}>
              <div className="ring" data-angle={Math.round(angle)}>
                {current.images.map((portrait, order) => {
                  // Each print rides round a circle seen from the front: across by
                  // sin, nearer (larger, brighter, on top) by cos.
                  const turn = ((dragging ? angle : shown) + order * stepAngle) * Math.PI / 180;
                  const across = Math.sin(turn), near = Math.cos(turn);
                  const style = {
                    transform: `translateX(${(across * 118).toFixed(2)}%) scale(${(.7 + .3 * near).toFixed(4)})`,
                    zIndex: Math.round(near * 100) + 100,
                    filter: `brightness(${(.6 + .4 * near).toFixed(3)}) saturate(${(.55 + .45 * near).toFixed(3)})`,
                    opacity: near < -.25 ? Math.max(0, (near + .7) / .45) : 1,
                  } as CSSProperties;
                  return (
                    <Portrait key={`${current.id}-${order}`} portrait={portrait} front={order === frontIndex}
                      onPick={() => pick(order)} style={style} />
                  );
                })}
              </div>
              <p className="ring-hint" aria-hidden="true">Drag to spin</p>
            </div>
          )}
          {view === "video" && current.video && (
            <div className="showcase-slide" key={current.id}>
              <video className="showcase-video" controls playsInline preload="metadata"
                poster={asset(current.images[0].src)} aria-label={current.video.label}>
                <source src={asset(current.video.src)} type="video/mp4" />
              </video>
            </div>
          )}
          {view === "model" && <BoothModelViewer theme={current.theme} backdrop={current.backdrop} wrap={current.wrap} />}
        </div>
        {view === "photos" && (
          <button type="button" className="slide-arrow" data-side="next" aria-label="Next photo" onClick={() => spin(1)}>›</button>
        )}
      </div>
      <div className="showcase-dots" role="group" aria-label="Events">
        <button type="button" className="event-step" aria-label="Previous event" onClick={() => stepEvent(-1)}>‹</button>
        {collections.map((collection, position) => (
          <button type="button" className="event-dot" key={collection.id} aria-label={`Show ${collection.name}`}
            aria-current={position === index} onClick={() => go(position)} />
        ))}
        <button type="button" className="event-step" aria-label="Next event" onClick={() => stepEvent(1)}>›</button>
      </div>
    </div>
  );
}
