import type { Print } from "../hooks/useSelfie";
import { asset } from "../lib/assets";

// The yellow button in the middle of the console takes the selfie.
export function SelfieButton({ onSnap }: { onSnap: () => void }) {
  return (
    <button type="button" className="selfie-button" onClick={onSnap}>
      <i aria-hidden="true" />
      <span>Selfie</span>
    </button>
  );
}

// The black line on the console is the print slot: a polaroid is pushed out of
// it, hangs below the console and develops. Closing flips it over and sends it
// spinning away.
export function PrintSlot({ prints, onClose }: { prints: readonly Print[]; onClose: (id: number) => void }) {
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
              <figcaption>marvin studio</figcaption>
              <button type="button" className="paper-close" aria-label="Put the photo away"
                disabled={print.closing} onClick={() => onClose(print.id)}>×</button>
            </div>
            <div className="paper-back" aria-hidden="true"><span>marvin</span></div>
          </figure>
        ))}
      </div>
    </div>
  );
}
