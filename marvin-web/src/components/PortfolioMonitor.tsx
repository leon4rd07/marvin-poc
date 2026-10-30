import { closing, contact } from "../data/portfolio";
import { useSelfie } from "../hooks/useSelfie";
import { asset } from "../lib/assets";
import { PortfolioGallery } from "./PortfolioGallery";
import { PrintSlot, SelfieButton } from "./SelfiePrinter";

// Inside the booth. You first face the back wall, then turn left to the wall where
// the monitor hangs, with the camera above it and the console (selfie button and
// print slot) below.
// Scrolling further leads to the closing section.
export function PortfolioMonitor() {
  const { prints, flash, snap, close } = useSelfie();
  return (
    <>
      <div className="interior">
        <div className="room-view">
          <div className="room">
            <div className="room-face room-ceiling" aria-hidden="true" />
            <div className="room-face room-floor" aria-hidden="true" />
            <div className="room-face room-back" aria-hidden="true" />
            <div className="room-face room-left">
              <div className="monitor-mount">
                <div className="camera" aria-hidden="true" data-snap={flash}>
                  <span className="camera-dot" />
                  <div className="lens"><i /></div>
                  <span className="camera-grille">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span>
                </div>
                <div className="monitor-shell">
                  <div className="monitor-screen">
                    <div className="screen-header">
                      <img className="screen-logo" src={asset("textures/marvin-wordmark.png")} alt="Marvin" width={1098} height={227} />
                    </div>
                    <PortfolioGallery />
                  </div>
                </div>
                <div className="console">
                  <span className="console-text" aria-hidden="true">GOOD TIMES, ON REPEAT.</span>
                  <SelfieButton onSnap={snap} />
                  <PrintSlot prints={prints} onClose={close} />
                </div>
              </div>
            </div>
          </div>
        </div>
        {flash > 0 && <div className="camera-flash" key={flash} aria-hidden="true" />}
        <p className="sr-only" role="status">{prints.some(print => !print.closing) ? "Your photo is printing." : ""}</p>
      </div>
      <div className="after">
        <section id="hello" className="closing" aria-labelledby="closing-title">
          <p className="eyebrow">{closing.eyebrow}</p>
          <h2 id="closing-title" tabIndex={-1}>{closing.heading}</h2>
          <div className="closing-actions">
            <a className="closing-primary" href="#home" data-nav>{closing.again} <span aria-hidden="true">↺</span></a>
            {contact.action && <a className="closing-link" href={contact.action.href}>{closing.hello}</a>}
          </div>
          <p className="closing-note">{closing.notice}</p>
        </section>
      </div>
    </>
  );
}
