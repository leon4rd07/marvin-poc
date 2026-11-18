import type { RefObject } from "react";
import { useJourneyProgress } from "../hooks/useJourneyProgress";
import { BoothScene } from "./BoothScene";
import { PortfolioMonitor } from "./PortfolioMonitor";

export function EntranceJourney({ homeRef, introActive }: {
  homeRef: RefObject<HTMLAnchorElement | null>;
  introActive: RefObject<boolean>;
}) {
  const { journey, stage, surface, work, initialDirect, sceneProgress, sceneEnabled, onPortal } = useJourneyProgress(homeRef, introActive);
  return (
    <>
      {/* Plain wall colour behind the portfolio; only ever seen through the doorway. */}
      <div className="portal-wall" aria-hidden="true" />
      <section id="home" className="journey" ref={journey} aria-label="Marvin photobooth entrance">
        <div className="stage" ref={stage} data-active={initialDirect} data-phase={initialDirect ? "monitor" : "booth"}>
          <BoothScene surfaceRef={surface} progress={sceneProgress} enabled={sceneEnabled} onPortal={onPortal} />
          <p className="scroll-cue" aria-hidden="true">
            <span className="scroll-cue-label"><span className="scroll-cue-scroll">Scroll to step inside</span><span className="scroll-cue-swipe">Swipe up to step inside</span></span>
            <svg className="scroll-cue-arrow" viewBox="0 0 24 24"><path d="M6 9.5 12 15.5 18 9.5" /></svg>
          </p>
        </div>
      </section>
      <section id="work" className="work-scene" ref={work} data-active={initialDirect} data-turned={initialDirect}
        inert={!initialDirect} aria-hidden={!initialDirect} aria-label="Portfolio monitor">
        <PortfolioMonitor />
      </section>
    </>
  );
}
