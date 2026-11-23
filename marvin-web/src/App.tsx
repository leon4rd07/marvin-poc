import { useRef } from "react";
import { BookSession } from "./components/BookSession";
import { EntranceJourney } from "./components/EntranceJourney";
import { SiteHeader } from "./components/SiteHeader";
import "./styles/site.css";
export default function App() {
  const home = useRef<HTMLAnchorElement>(null);
  return (
    <>
      <SiteHeader homeRef={home} />
      <main>
        <h1 className="sr-only">Marvin Studio photobooth portfolio</h1>
        <EntranceJourney homeRef={home} />
      </main>
      <BookSession />
    </>
  );
}
