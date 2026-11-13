import type { RefObject } from "react";
import { asset } from "../lib/assets";
import { openBooking } from "../lib/sections";

export function SiteHeader({ homeRef }: {
  homeRef: RefObject<HTMLAnchorElement | null>;
}) {
  return (
    <header className="site-header">
      <a className="wordmark" href="#home" ref={homeRef} aria-label="Marvin Studio home" data-nav>
        <img src={asset("textures/marvin-logo-studio.png")} alt="Marvin Studio" width={1087} height={376} />
      </a>
      <p className="header-note"><span className="stack-main">Romanticizing moments through our lens</span></p>
      <button type="button" className="header-book" onClick={openBooking} aria-label="Book a session">
        <span>Book<span className="header-book-more"> a session</span></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
      </button>
    </header>
  );
}
