import { useEffect, useRef } from "react";
import { closing, social, whatsappLink } from "../data/portfolio";
import { useSelfie } from "../hooks/useSelfie";
import { asset } from "../lib/assets";
import { leaveEvent, openBooking } from "../lib/sections";
import { PortfolioGallery } from "./PortfolioGallery";
import { PrintSlot, SelfieButton } from "./SelfiePrinter";

// Inside the booth. You first face the back wall, then turn left to the wall where
// the monitor hangs, with the camera above it and the console (selfie button and
// print slot) below.
// Scrolling further leads to the closing section.
export function PortfolioMonitor() {
  const { prints, flash, snap } = useSelfie();
  // Turning to the monitor (and back to the doorway before leaving) is a short 3D
  // camera turn inside a CSS room. The room is only drawn in 3D while it turns: once
  // it has settled on the monitor the wall is an ordinary flat page again
  // (data-facing="monitor"), which phones scroll and redraw without glitches.
  const room = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = room.current;
    const scene = element?.closest<HTMLElement>(".work-scene");
    if (!element || !scene) return;
    const door = "translateZ(50vw) rotateY(0deg)";
    const monitor = "translateZ(50vw) rotateY(-90deg)";
    let goal = "";
    let animation: Animation | null = null;
    function sync(first = false) {
      if (!element || !scene) return;
      const next = scene.dataset.turned === "true" ? "monitor" : "door";
      if (next === goal) return;
      goal = next;
      // Where the room is right now: mid-turn, settled on the monitor or at the door.
      const from = animation ? getComputedStyle(element).transform
        : element.dataset.facing === "monitor" ? monitor : door;
      animation?.cancel();
      animation = null;
      const portal = document.documentElement.dataset.portal === "on";
      if (first || portal || typeof element.animate !== "function") {
        element.dataset.facing = next;
        return;
      }
      element.dataset.facing = "turning";
      const toMonitor = next === "monitor";
      const turn = element.animate([{ transform: from }, { transform: toMonitor ? monitor : door }], toMonitor
        ? { duration: 1800, delay: 250, easing: "cubic-bezier(.6, 0, .22, 1)", fill: "both" }
        : { duration: 950, easing: "cubic-bezier(.5, 0, .3, 1)", fill: "both" });
      animation = turn;
      turn.onfinish = () => {
        if (animation !== turn) return;
        element.dataset.facing = next;
        turn.cancel();
        animation = null;
      };
    }
    sync(true);
    const observer = new MutationObserver(() => sync());
    observer.observe(scene, { attributes: true, attributeFilter: ["data-turned"] });
    return () => { observer.disconnect(); animation?.cancel(); };
  }, []);
  return (
    <>
      <div className="interior">
        <div className="room-view">
          <div className="room" ref={room}>
            <div className="room-face room-ceiling" aria-hidden="true" />
            <div className="room-face room-floor" aria-hidden="true" />
            <div className="room-face room-back" aria-hidden="true" />
            <div className="room-face room-left">
              <div className="monitor-mount">
                {/* A slim, modern display: thin aluminium edge, black glass bezel with the
                    camera set into it, and the portfolio on the screen. */}
                <div className="monitor-shell">
                  <div className="monitor-bezel">
                    <div className="camera" aria-hidden="true" data-snap={flash}>
                      <span className="camera-dot" />
                      <span className="lens" />
                    </div>
                    <div className="monitor-screen">
                      <div className="screen-header">
                        <img className="screen-logo" src={asset("textures/marvin-wordmark.png")} alt="Marvin" width={1098} height={227} />
                      </div>
                      <PortfolioGallery />
                    </div>
                  </div>
                </div>
                <div className="console">
                  <SelfieButton onSnap={snap} />
                  <PrintSlot prints={prints} />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* A backlit EXIT sign mounted on the wall, made like the monitor and the
            console (black glass, thin aluminium edge, the yellow of the shutter key).
            It appears once you have turned to the monitor, and leads back out. */}
        <button type="button" className="exit-sign" onClick={() => window.dispatchEvent(new Event(leaveEvent))}
          aria-label="Exit the booth">
          <span className="exit-door" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M14 4h4v16h-4" /><path d="M10 12H3" /><path d="M6 8.5 2.5 12 6 15.5" /></svg>
          </span>
          <span className="exit-word" aria-hidden="true">Exit</span>
        </button>
        {flash > 0 && <div className="camera-flash" key={flash} aria-hidden="true" />}
        <p className="sr-only" role="status">{prints.some(print => !print.closing) ? "Your photo is printing." : ""}</p>
      </div>
      <div className="after">
        <section id="hello" className="closing" aria-labelledby="closing-title">
          <div className="closing-cta">
          <h2 id="closing-title" tabIndex={-1}>
            <a className="closing-book" href={whatsappLink ?? undefined} target="_blank" rel="noopener noreferrer">
              <span className="stack-main"><span className="closing-mark">{closing.book}</span></span>{" "}
              <span className="stack-sub">{closing.bookNote}</span>
            </a>
          </h2>
          <p className="closing-session">
            <button type="button" className="closing-book" onClick={openBooking}>
              <span className="stack-main"><span className="closing-mark">{closing.session}</span></span>{" "}
              <span className="stack-sub">{closing.sessionNote}</span>
            </button>
          </p>
          </div>
          <ul className="closing-social">
            <li>
              <a href={social.instagram}
                target="_blank" rel="noopener noreferrer" aria-label="Marvin on Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1" className="fill" /></svg>
                <span>Instagram</span>
              </a>
            </li>
            <li>
              <a href={social.tiktok}
                target="_blank" rel="noopener noreferrer" aria-label="Marvin on TikTok">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.2a3.8 3.8 0 1 1-3.8-3.8" /><path d="M14 3c.6 2.8 2.6 4.6 5.5 4.8" /></svg>
                <span>TikTok</span>
              </a>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
