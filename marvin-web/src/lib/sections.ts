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
// "Book an event" in the header: from wherever you are, go through the booth (you
// walk in and turn to the monitor) and on down to the booking section.
export const bookFlowEvent = "marvin:book-flow";

// Opens the "Book a session" form (from the header and the closing section).
export const bookEvent = "marvin:book";
export const openBooking = () => window.dispatchEvent(new Event(bookEvent));
