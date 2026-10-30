// Header and in-page links that open the portfolio directly, skipping the entrance.
export type Section = "work" | "hello";
const byHash: Record<string, Section> = {
  "#work": "work",
  "#hello": "hello",
};
export const sectionFromHash = (hash: string): Section | null => byHash[hash] ?? null;
