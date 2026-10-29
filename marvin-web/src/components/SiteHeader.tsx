import type { RefObject } from "react";

export function SiteHeader({ homeRef }: {
  homeRef: RefObject<HTMLAnchorElement | null>;
}) {
  return (
    <header className="site-header">
      <a className="wordmark" href="#home" ref={homeRef} aria-label="Marvin Studio home" data-nav>
        marvin <span>STUDIO</span>
      </a>
      <span className="header-note" aria-hidden="true">STILL MOMENTS. REAL PEOPLE.</span>
      <nav aria-label="Main navigation">
        <a className="nav-text" href="#experience" data-nav>The experience</a>
        <a className="nav-text" href="#hello" data-nav>Say hello</a>
        <a className="nav-work" href="#work" data-nav>Our work <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
  );
}
