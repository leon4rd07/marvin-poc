import type { PortfolioTab } from "../data/portfolio";

// Header and in-page links that open the portfolio directly, skipping the entrance.
const byHash: Record<string, PortfolioTab> = {
  "#work": "portraits",
  "#experience": "experience",
  "#hello": "hello",
};
export const sectionFromHash = (hash: string): PortfolioTab | null => byHash[hash] ?? null;
export const sectionEvent = "marvin:section";
