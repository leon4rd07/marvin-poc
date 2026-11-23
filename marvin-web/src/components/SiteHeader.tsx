import type { RefObject } from "react";
import { asset } from "../lib/assets";
import { bookFlowEvent } from "../lib/sections";

export function SiteHeader({ homeRef }: {
  homeRef: RefObject<HTMLAnchorElement | null>;
}) {
  return (
    <header className="site-header">
      <a className="wordmark" href="#home" ref={homeRef} aria-label="Marvin Studio home" data-nav>
        <img src={asset("textures/marvin-logo-studio.png")} alt="Marvin Studio" width={1087} height={376} />
      </a>
      <p className="header-note"><span className="stack-main">Romanticizing moments through our lens</span></p>
      {/* Takes you through the booth (never skipping the walk in) to "Book for an event". */}
      <button type="button" className="book-event" onClick={() => window.dispatchEvent(new Event(bookFlowEvent))}>
        <span className="book-event-flash" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m12 2.8 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
        </span>
        <span className="book-event-label">Book an event</span>
      </button>
    </header>
  );
}
