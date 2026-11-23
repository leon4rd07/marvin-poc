// Header and in-page links that open the portfolio directly, skipping the entrance.
export type Section = "work" | "hello";
const byHash: Record<string, Section> = {
  "#work": "work",
  "#hello": "hello",
};
export const sectionFromHash = (hash: string): Section | null => byHash[hash] ?? null;

// Asks the journey to walk back out of the booth (the "Step outside" button).
export const leaveEvent = "marvin:leave";
// Asks the journey to walk into the booth (the "Scroll" button on the booth's front).
export const enterEvent = "marvin:enter";
// Asks the opening slide to move away (to the booth).
export const leaveIntroEvent = "marvin:leave-intro";
// "Book an event" in the header: from wherever you are, go through the booth (the
// opening slide moves away, you walk in and turn to the monitor) and on down to
// the booking section.
export const bookFlowEvent = "marvin:book-flow";

// The opening wall scene is skipped on direct links into the booth and with `?intro=0`.
// The opening plays unless the link goes straight somewhere: into the booth
// (#work, #hello), to the booking form (?book) or with ?intro=0.
export const introStartsActive = () => {
  const query = new URLSearchParams(location.search);
  return sectionFromHash(location.hash) === null && query.get("intro") !== "0" && !query.has("book");
};

// Opens the "Book a session" form (from the header and the closing section).
export const bookEvent = "marvin:book";
export const openBooking = () => window.dispatchEvent(new Event(bookEvent));
