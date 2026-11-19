import { useEffect, useRef, useState } from "react";
import type { EventBackdrop, EventBoothWrap, EventTheme } from "../data/portfolio";
import { asset, boothPoster } from "../lib/assets";

type Viewer = { turn(radians: number): void; setOpen(open: boolean): void };

// A small, playable 3D model for an event: the event's own printed booth, its
// backdrop on its own, or else the Marvin booth dressed in the event's colours.
// Three.js is loaded only when this view is opened, and released again when it closes.
export function BoothModelViewer({ theme, backdrop, wrap }: { theme: EventTheme; backdrop?: EventBackdrop; wrap?: EventBoothWrap }) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    setState("loading");
    setOpen(false);
    void import("../scene/createBoothViewer").then(({ createBoothViewer }) => {
      if (cancelled) return;
      try {
        // Like the entrance, the turntable plays whatever the OS motion setting.
        const created = createBoothViewer(container, { autoRotate: true, theme, backdrop, wrap });
        viewer.current = created;
        dispose = created.dispose;
        setState("ready");
      } catch { setState("unavailable"); }
    }).catch(() => { if (!cancelled) setState("unavailable"); });
    return () => {
      cancelled = true;
      viewer.current = null;
      dispose?.();
    };
  }, [theme, backdrop, wrap]);
  function toggle() {
    const next = !open;
    setOpen(next);
    viewer.current?.setOpen(next);
  }
  return (
    <div className="model-viewer" data-state={state}>
      <div className="model-canvas" ref={host} role="img"
        aria-label={wrap ? "Interactive three-dimensional model of the photobooth made for this event"
          : backdrop ? "Interactive three-dimensional model of the event's backdrop"
            : "Interactive three-dimensional model of the Marvin photobooth"} />
      {state === "unavailable" && (
        <img className="model-fallback" src={asset(boothPoster.src)} alt="The Marvin photobooth"
          width={boothPoster.width} height={boothPoster.height} />
      )}
      {state === "loading" && <p className="model-status" role="status">{backdrop && !wrap ? "Loading the backdrop…" : "Loading the booth…"}</p>}
      {state === "unavailable" && <p className="model-status" role="status">The 3D view isn’t available on this device.</p>}
      {state === "ready" && (
        <div className="model-controls">
          <button type="button" aria-label="Turn left" onClick={() => viewer.current?.turn(-.7)}>↺</button>
          {/* Only the Marvin booth has a curtain: a wrapped booth has its door printed on. */}
          {!wrap && !backdrop && <button type="button" aria-pressed={open} onClick={toggle}>{open ? "Close the curtain" : "Open the curtain"}</button>}
          <button type="button" aria-label="Turn right" onClick={() => viewer.current?.turn(.7)}>↻</button>
        </div>
      )}
    </div>
  );
}
