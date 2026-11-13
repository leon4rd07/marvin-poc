import { asset } from "../lib/assets";
import type { DriftWallItem } from "../components/DriftWall";

// Pictures on the opening wall, borrowed from the portfolio's events for now:
// replace the list with the real ones (files in `public/`, any number of them;
// the wall repeats them to fill itself). Tiles are portrait, 3:4, and crop to fit.
const numbered = (name: string, count: number) =>
  Array.from({ length: count }, (_, index) => `portfolio/events/${name}-${String(index + 1).padStart(2, "0")}.webp`);
export const marvelItems: DriftWallItem[] = [...numbered("ikea", 10), ...numbered("wedding", 10)]
  .map(path => ({ image: asset(path) }));
