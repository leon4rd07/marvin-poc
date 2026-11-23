import { useEffect, useRef, useState } from "react";
import { products } from "../data/portfolio";
import { asset } from "../lib/assets";
import type { ProductScene } from "../scene/createProductScene";

// Marvin's prints (4R, XL strip in its sleeve, mini tote) as 3D models on small
// white displays, on a turntable that turns slowly all the time
// (scene/createProductScene.ts), with the name of the one in front above it. Drag
// it or use the arrow keys to bring another round. Used on the opening slide and
// again in the booth, under the monitor.
export function ProductTurntable({ running, load = true, heading: Heading = "h2" }: {
  /** Drawn only while true (on screen). */
  running: boolean;
  /** The models (and three.js) are fetched once this is true. */
  load?: boolean;
  heading?: "h2" | "h3";
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ProductScene | null>(null);
  const [frontIndex, setFrontIndex] = useState(0);
  // "loading" until the models are drawn; "failed" (no WebGL): the front print's
  // artwork is shown flat instead.
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const front = products[frontIndex];

  useEffect(() => {
    if (!load) return;
    let disposed = false;
    void import("../scene/createProductScene").then(({ createProductScene }) => {
      if (disposed || !host.current) return;
      try {
        scene.current = createProductScene(host.current, {
          products: products.map(product => ({ id: product.id, src: asset(product.src) })),
          onFront: setFrontIndex,
        });
        setState("ready");
      } catch {
        setState("failed");
      }
    }).catch(() => { if (!disposed) setState("failed"); });
    return () => { disposed = true; scene.current?.dispose(); scene.current = null; };
  }, [load]);
  useEffect(() => { scene.current?.setRunning(running); }, [running, state]);

  return (
    <>
      <div className="product-caption" aria-live="polite" aria-atomic="true">
        <Heading className="product-name">{front.name}</Heading>
        <p className="product-detail">{front.detail}</p>
      </div>
      <div className="product-stage" ref={host} data-state={load ? state : "waiting"}
        role="img" aria-roledescription="carousel" tabIndex={0}
        aria-label={`${front.alt}. Drag or use the arrow keys to turn.`}
        onKeyDown={event => {
          if (event.key === "ArrowRight") { event.preventDefault(); scene.current?.turn(1); }
          if (event.key === "ArrowLeft") { event.preventDefault(); scene.current?.turn(-1); }
        }}>
        {state === "failed" && <img className="product-flat" src={asset(front.src)} alt="" draggable={false} />}
      </div>
    </>
  );
}
