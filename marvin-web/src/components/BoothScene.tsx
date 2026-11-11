import { useEffect, useRef, type RefObject } from "react";
import { asset, boothPoster } from "../lib/assets";
import type { PortalFrame, SceneProgress } from "../lib/timeline";

export function BoothScene({ surfaceRef, progress, enabled, onPortal }: {
  surfaceRef: RefObject<HTMLDivElement | null>;
  progress: SceneProgress;
  enabled: boolean;
  onPortal: (frame: PortalFrame | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = host.current;
    if (!container || !enabled) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    let unsubscribe: (() => void) | undefined;
    container.dataset.renderer = "loading";
    // Keep Three.js off direct-entry and reduced-motion routes altogether.
    void import("../scene/createBoothScene").then(({ createBoothScene }) => {
      if (cancelled) return;
      const scene = createBoothScene(container, progress.get(), onPortal);
      dispose = scene.dispose;
      unsubscribe = progress.subscribe(scene.setProgress);
    }).catch(() => {
      if (!cancelled) container.dataset.renderer = "fallback";
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
      dispose?.();
      container.dataset.renderer = "fallback";
    };
  }, [enabled, progress, onPortal]);
  return (
    <div className="media-surface booth-surface" ref={surfaceRef}>
      <div className="booth-renderer" ref={host} data-renderer="fallback" role="img"
        aria-label="Front-facing three-dimensional Marvin photobooth with reflective champagne metal trim, a black Marvin wordmark on a warm yellow illuminated sign, compact recessed stainless printer, portrait display, and soft olive velvet curtain on the right">
        <img className="booth-poster" src={asset(boothPoster.src)}
          width={boothPoster.width} height={boothPoster.height} alt="" fetchPriority="high" />
      </div>
    </div>
  );
}
