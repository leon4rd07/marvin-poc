import { portfolioLabels } from "../data/portfolio";
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

// The black line on the console is the print slot: paper feeds out of it and
// hangs below the console; the previous print drops away.
export function PrintSlot({ prints }: { prints: readonly Print[] }) {
  return (
    <div className="print-slot">
      <span className="slot-line" aria-hidden="true" />
      <div className="paper-feed">
        {prints.map(print => (
          <figure className="paper" key={print.id}>
            <img src={asset(print.photo.src)} alt={print.photo.alt} width={print.photo.width} height={print.photo.height} />
            <figcaption>{portfolioLabels.printSignature}<span aria-hidden="true"> ✳</span></figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
