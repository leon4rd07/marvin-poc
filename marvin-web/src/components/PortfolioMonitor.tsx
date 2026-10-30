import { closing, contact, experience } from "../data/portfolio";
import { asset } from "../lib/assets";
import { PortfolioGallery } from "./PortfolioGallery";
import { useSelfie } from "../hooks/useSelfie";
import { PrinterTray, SelfieButton } from "./SelfiePrinter";

// Inside the booth: the monitor sits on the left wall, the printer on the right.
// Scrolling further goes down to the experience and the closing call to action.
export function PortfolioMonitor() {
  const { prints, flash, snap } = useSelfie();
  return (
    <>
      <div className="interior">
        <div className="room">
          <div className="monitor-column">
            <div className="camera" aria-hidden="true" data-snap={flash}>
              <span className="camera-dot" />
              <div className="lens"><i /></div>
              <span>LOOK HERE</span>
            </div>
            <div className="monitor-shell">
              <div className="monitor-screen">
                <div className="screen-header">
                  <img className="screen-logo" src={asset("textures/marvin-wordmark.png")} alt="Marvin" width={1098} height={227} />
                </div>
                <PortfolioGallery />
                {flash > 0 && <div className="screen-flash" key={flash} aria-hidden="true" />}
              </div>
              <div className="monitor-base" aria-hidden="true"><i /></div>
            </div>
            <div className="console">
              <SelfieButton onSnap={snap} />
              <div className="console-line" aria-hidden="true" />
            </div>
          </div>
          <PrinterTray prints={prints} />
        </div>
        <p className="sr-only" role="status">{prints.length > 0 ? "Your photo is printing." : ""}</p>
      </div>
      <div className="after">
        <section id="experience" className="experience" aria-labelledby="experience-title">
          <p className="eyebrow">A MOMENT, JUST FOR YOU</p>
          <h2 id="experience-title" tabIndex={-1}>{experience.heading}</h2>
          <ol className="experience-steps">
            {experience.steps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">0{index + 1}</span>
                <div><h3>{step.title}</h3><p>{step.description}</p></div>
              </li>
            ))}
          </ol>
        </section>
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
