import { useRef, useState } from "react";
import { BookSession } from "./components/BookSession";
import { EntranceJourney } from "./components/EntranceJourney";
import { OpeningIntro } from "./components/OpeningIntro";
import { SiteHeader } from "./components/SiteHeader";
import { introStartsActive } from "./lib/sections";
import "./styles/site.css";
export default function App() {
  const home = useRef<HTMLAnchorElement>(null);
  const [introAtStart] = useState(introStartsActive);
  const introActive = useRef(introAtStart);
  return (
    <>
      <SiteHeader homeRef={home} />
      <main>
        <h1 className="sr-only">Marvin Studio photobooth portfolio</h1>
        <EntranceJourney homeRef={home} introActive={introActive} />
        <OpeningIntro activeRef={introActive} startActive={introAtStart} />
      </main>
      <BookSession />
    </>
  );
}
