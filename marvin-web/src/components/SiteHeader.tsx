import type { RefObject } from "react";
import { asset } from "../lib/assets";

export function SiteHeader({ homeRef }: {
  homeRef: RefObject<HTMLAnchorElement | null>;
}) {
  return (
    <header className="site-header">
      <a className="wordmark" href="#home" ref={homeRef} aria-label="Marvin Studio home" data-nav>
        <img src={asset("textures/marvin-logo-studio.png")} alt="Marvin Studio" width={1087} height={376} />
      </a>
      <p className="header-note"><span className="stack-main">Romanticizing moments through our lens</span></p>
    </header>
  );
}
