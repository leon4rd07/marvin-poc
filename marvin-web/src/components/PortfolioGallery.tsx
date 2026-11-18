import { useState, type CSSProperties } from "react";
import { collections, showcaseViews, type Portrait as PortraitData, type ShowcaseView } from "../data/portfolio";
import { asset } from "../lib/assets";
import { useRing } from "../hooks/useRing";
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

// The photos of an event stand on a ring that you spin (useRing): drag or swipe it,
// use the arrows, or click a photo at the side. Changing event spins the ring a
// full turn as the new photos come in. Every event also has a 3D booth and a video.
export function PortfolioGallery() {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<ShowcaseView>("photos");
  const current = collections[index];
  const count = current.images.length;
  const ring = useRing(count);
  const views = showcaseViews.filter(view => view.id !== "video" || current.video);
  const view = views.some(option => option.id === chosen) ? chosen : "photos";

  function go(target: number, forward = target > index) {
    const next = wrap(target, collections.length);
    if (next === index) return;
    setIndex(next);
    // One full turn of the ring while the new event's photos come round.
    ring.setAngle(value => ring.snap(value) + (forward ? -360 : 360));
  }
  const stepEvent = (delta: 1 | -1) => go(index + delta, delta > 0);

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
          <button type="button" className="slide-arrow" data-side="prev" aria-label="Previous photo" onClick={() => ring.spin(-1)}>‹</button>
        )}
        <div className="showcase-media">
          {view === "photos" && (
            <div className="gallery" data-dragging={ring.dragging}
              role="group" aria-roledescription="carousel" aria-label={`Photos from ${current.name}. Drag or use the arrow keys to turn.`}
              tabIndex={0} onKeyDown={ring.onKeyDown} {...ring.handlers}>
              <div className="ring" data-angle={Math.round(ring.angle)}>
                {current.images.map((portrait, order) => (
                  <Portrait key={`${current.id}-${order}`} portrait={portrait} front={order === ring.frontIndex}
                    onPick={() => ring.pick(order)} style={ring.styleFor(order)} />
                ))}
              </div>
              <p className="ring-hint" aria-hidden="true">Drag to spin</p>
            </div>
          )}
          {view === "video" && current.video && (
            <div className="showcase-slide" key={current.id}>
              <video className="showcase-video" controls playsInline preload="metadata"
                width={current.video.width} height={current.video.height}
                style={{ aspectRatio: `${current.video.width} / ${current.video.height}` }}
                poster={asset(current.video.poster)} aria-label={current.video.label}>
                <source src={asset(current.video.src)} type="video/mp4" />
              </video>
            </div>
          )}
          {view === "model" && <BoothModelViewer theme={current.theme} backdrop={current.backdrop} wrap={current.wrap} />}
        </div>
        {view === "photos" && (
          <button type="button" className="slide-arrow" data-side="next" aria-label="Next photo" onClick={() => ring.spin(1)}>›</button>
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
