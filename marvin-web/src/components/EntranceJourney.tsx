import type { RefObject } from "react";
import { useJourneyProgress } from "../hooks/useJourneyProgress";
import { enterEvent } from "../lib/sections";
import { BoothScene } from "./BoothScene";
import { PortfolioMonitor } from "./PortfolioMonitor";

export function EntranceJourney({ homeRef }: {
  homeRef: RefObject<HTMLAnchorElement | null>;
}) {
  const { journey, stage, surface, work, initialDirect, sceneProgress, sceneEnabled, onPortal } = useJourneyProgress(homeRef);
  return (
    <>
      {/* Plain wall colour behind the portfolio; only ever seen through the doorway. */}
      <div className="portal-wall" aria-hidden="true" />
      <section id="home" className="journey" ref={journey} aria-label="Marvin photobooth entrance">
        <div className="stage" ref={stage} data-active={initialDirect} data-phase={initialDirect ? "monitor" : "booth"}>
          <BoothScene surfaceRef={surface} progress={sceneProgress} enabled={sceneEnabled} onPortal={onPortal} />
          {/* Tapping it walks in, the same as scrolling. */}
          <button type="button" className="scroll-cue" aria-label="Walk into the booth"
            onClick={() => window.dispatchEvent(new Event(enterEvent))}>
            <span className="scroll-cue-label"><span className="scroll-cue-word">Scroll</span></span>
            <span className="scroll-cue-key" aria-hidden="true">
              <svg className="scroll-cue-arrow" viewBox="0 0 24 24"><path d="M12 5v13" /><path d="M6.5 12.5 12 18l5.5-5.5" /></svg>
            </span>
          </button>
        </div>
      </section>
      <section id="work" className="work-scene" ref={work} data-active={initialDirect} data-turned={initialDirect}
        inert={!initialDirect} aria-hidden={!initialDirect} aria-label="Portfolio monitor">
        <PortfolioMonitor />
      </section>
    </>
  );
}
