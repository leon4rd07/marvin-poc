import type { CSSProperties } from "react";
import { portfolioLabels } from "../data/portfolio";
import type { Print } from "../hooks/useSelfie";
import { asset } from "../lib/assets";


// The selfie button under the monitor and the printer beside it. Pressing the
// button flashes the screen and prints a portrait photo out of the slot.
export function SelfieButton({ onSnap }: { onSnap: () => void }) {
  return (
    <button type="button" className="selfie-button" onClick={onSnap}>
      <i aria-hidden="true" />
      <span>Selfie</span>
    </button>
  );
}

export function PrinterTray({ prints }: { prints: readonly Print[] }) {
  return (
    <div className="printer">
      <div className="printer-body" aria-hidden="true">
        <span className="printer-light" />
        <span className="printer-slot" />
      </div>
      <div className="printer-tray">
        {prints.map(print => (
          <figure className="print-card" key={print.id} style={{ "--tilt": `${print.tilt}deg` } as CSSProperties}>
            <img src={asset(print.photo.src)} alt={print.photo.alt} width={print.photo.width} height={print.photo.height} />
            <figcaption>{portfolioLabels.printSignature}<span aria-hidden="true"> ✳</span></figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
