// Header and in-page links that open the portfolio directly, skipping the entrance.
export type Section = "work" | "hello";
const byHash: Record<string, Section> = {
  "#work": "work",
  "#hello": "hello",
};
export const sectionFromHash = (hash: string): Section | null => byHash[hash] ?? null;

// Asks the journey to walk back out of the booth (the "Step outside" button).
export const leaveEvent = "marvin:leave";

// The opening wall scene is skipped on direct links into the booth and with `?intro=0`.
export const introStartsActive = () =>
  sectionFromHash(location.hash) === null && new URLSearchParams(location.search).get("intro") !== "0";

// Opens the "Book a session" form (from the header and the closing section).
export const bookEvent = "marvin:book";
export const openBooking = () => window.dispatchEvent(new Event(bookEvent));
