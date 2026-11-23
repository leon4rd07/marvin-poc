import { useEffect, useRef, useState } from "react";
import { clamp } from "../lib/timeline";
import { ProductTurntable } from "./ProductTurntable";

// Under the monitor, before "Book for an event": Marvin's prints again on their
// turning displays. The booth's cream wall fades into the section's warm white,
// and as it scrolls into view the prints rise and come in (`--enter`, 0 to 1,
// follows the scroll). The models load once the section is near and are drawn
// only while it is on screen. The booking section then slides over it like a sheet.
export function PrintsShowcase() {
  const root = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = root.current;
    const scroller = element?.closest<HTMLElement>(".work-scene");
    if (!element || !scroller) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      // Only inside the booth (while the booth is outside, the page is a picture in its doorway).
      const inside = scroller.dataset.active === "true" && document.documentElement.dataset.portal !== "on";
      const box = element.getBoundingClientRect();
      const view = innerHeight;
      element.style.setProperty("--enter", inside ? clamp((view - box.top) / (view * .7)).toFixed(3) : "0");
      if (inside && box.top < view * 1.6) setNear(true);
      setVisible(inside && box.top < view && box.bottom > 0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    scroller.addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    const watch = new MutationObserver(schedule);
    watch.observe(scroller, { attributes: true, attributeFilter: ["data-active"] });
    paint();
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      watch.disconnect();
    };
  }, []);
  return (
    <section id="prints" className="prints" ref={root} aria-labelledby="prints-title">
      <h2 id="prints-title" className="prints-title">Our prints</h2>
      <ProductTurntable running={visible} load={near} heading="h3" />
    </section>
  );
}
