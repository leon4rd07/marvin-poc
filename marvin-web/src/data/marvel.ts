import { asset } from "../lib/assets";
import type { DriftWallItem } from "../components/DriftWall";

// Pictures on the opening wall. These are stand-ins borrowed from the portfolio:
// replace the list with the real ones (files in `public/`, any number of them;
// the wall repeats them to fill itself). Tiles are portrait, 3:4, and crop to fit.
export const marvelItems: DriftWallItem[] = [
  "portfolio/ape-portrait-1.webp",
  "portfolio/ape-portrait-2.webp",
  "portfolio/ape-portrait-3.webp",
  "portfolio/ape-portrait-4.webp",
  "portfolio/ape-portrait-5.webp",
  "portfolio/ape-portrait-6.webp",
  "portfolio/backdrops/wedding.webp",
  "portfolio/booths/ikea-front.jpg",
].map(path => ({ image: asset(path) }));
