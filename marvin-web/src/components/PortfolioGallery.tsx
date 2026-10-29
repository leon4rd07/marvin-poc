import { useRef, useState, type PointerEvent } from "react";
import { collections, portfolioLabels, showcaseViews, type Portrait as PortraitData, type ShowcaseView } from "../data/portfolio";
import { asset } from "../lib/assets";
import { wrap } from "../lib/timeline";
import { BoothModelViewer } from "./BoothModelViewer";

function Portrait({ portrait }: { portrait: PortraitData }) {
  const [broken, setBroken] = useState(false);
  return (
    <figure className="print">
      {broken ? (
        <div className="image-fallback" role="img" aria-label={`${portrait.alt}. Image unavailable.`}>
          <span aria-hidden="true">✳</span>
          Portrait unavailable
        </div>
      ) : (
        <img src={asset(portrait.src)} alt={portrait.alt}
          width={portrait.width} height={portrait.height}
          loading="lazy" decoding="async" onError={() => setBroken(true)} />
      )}
      <figcaption>{portfolioLabels.printSignature}<span aria-hidden="true">✳</span></figcaption>
    </figure>
  );
}

// One event at a time. Slide left or right (swipe, arrows or dots) to move to
// the next one; each event can be viewed as photos, a 3D model or a video.
export function PortfolioGallery() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"none" | "next" | "prev">("none");
  const [chosen, setChosen] = useState<ShowcaseView>("photos");
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const current = collections[index];
  const views = showcaseViews.filter(view => view.id !== "video" || current.video);
  const view = views.some(option => option.id === chosen) ? chosen : "photos";
  const note = showcaseViews.find(option => option.id === view)!.note;

  function go(target: number, forward = target > index) {
    setDirection(forward ? "next" : "prev");
    setIndex(wrap(target, collections.length));
  }
  const step = (delta: 1 | -1) => go(index + delta, delta > 0);
  function onPointerDown(event: PointerEvent) {
    swipe.current = event.pointerType === "mouse" && event.button !== 0 ? null : { x: event.clientX, y: event.clientY };
  }
  function onPointerUp(event: PointerEvent) {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  }
  return (
    <>
      <div className="portfolio-copy">
        <p className="eyebrow">THE MOMENTS IN BETWEEN</p>
        <h2>{current.caption}</h2>
        <p>{current.description}</p>
        <div className="collection-control" role="group" aria-label="Portrait collections">
          <button type="button" aria-label="Previous collection" onClick={() => step(-1)}>←</button>
          <span aria-live="polite" aria-atomic="true">
            {current.name}
            <small>{String(index + 1).padStart(2, "0")} / {String(collections.length).padStart(2, "0")}</small>
          </span>
          <button type="button" aria-label="Next collection" onClick={() => step(1)}>→</button>
        </div>
      </div>
      <div className="showcase">
        <div className="showcase-views" role="group" aria-label="How to view this collection">
          {views.map(option => (
            <button type="button" key={option.id} aria-pressed={view === option.id}
              onClick={() => { setDirection("none"); setChosen(option.id); }}>{option.label}</button>
          ))}
        </div>
        <div className="showcase-stage" data-view={view} data-direction={direction}
          onPointerDown={view === "model" ? undefined : onPointerDown}
          onPointerUp={view === "model" ? undefined : onPointerUp}
          onPointerCancel={() => { swipe.current = null; }}>
          {view === "photos" && (
            <div className="gallery">
              <div className="prints" key={current.id}>
                {current.images.map((portrait) => <Portrait key={portrait.src} portrait={portrait} />)}
              </div>
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
          {view === "model" && <BoothModelViewer />}
        </div>
        <div className="showcase-foot">
          <p className="gallery-note">{note}</p>
          <div className="showcase-dots" role="group" aria-label="Jump to a collection">
            {collections.map((collection, position) => (
              <button type="button" key={collection.id} aria-label={`Show ${collection.name}`}
                aria-current={position === index} onClick={() => go(position)} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
