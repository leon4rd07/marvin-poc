import type { Print } from "../hooks/useSelfie";
import { asset } from "../lib/assets";

// The white shutter button in the middle of the console takes the selfie.
export function SelfieButton({ onSnap }: { onSnap: () => void }) {
  return (
    <button type="button" className="selfie-button" aria-label="Take a selfie" onClick={onSnap}>
      <i aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z" /><circle cx="12" cy="13.2" r="3.4" /></svg>
      </i>
    </button>
  );
}

// The black line on the console is the print slot: a polaroid is pushed out of
// it, hangs below the console and develops, then flips over and spins away by
// itself a few seconds later.
export function PrintSlot({ prints }: { prints: readonly Print[] }) {
  return (
    <div className="print-slot">
      <span className="slot-line" aria-hidden="true" />
      <div className="paper-feed">
        {prints.map(print => (
          <figure className="paper" key={print.id} data-closing={print.closing}>
            <div className="paper-front">
              <div className="paper-photo">
                <img src={asset(print.photo.src)} alt={print.photo.alt} width={print.photo.width} height={print.photo.height} />
              </div>
              <figcaption>
                <img className="paper-logo" src={asset("textures/marvin-logo-studio.png")} alt="Marvin Studio" width={1086} height={376} />
              </figcaption>
            </div>
            <div className="paper-back" aria-hidden="true">
              <img src={asset("textures/marvin-wordmark.png")} alt="" width={1098} height={227} />
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
