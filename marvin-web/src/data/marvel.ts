import { asset } from "../lib/assets";
import type { DriftWallItem } from "../components/DriftWall";

// Pictures on the opening wall, borrowed from the portfolio's events for now:
// replace the list with the real ones (files in `public/`, any number of them;
// the wall repeats them to fill itself). Tiles are portrait, 3:4, and crop to fit.

export const marvelItems: DriftWallItem[] = [
  "wall/IMG_8467.jpg",
  "portfolio/events/wedding-09.webp",//temp
  "portfolio/events/ikea-01.webp",
  "portfolio/events/wedding-09.webp",
  "wall/IMG_8113.jpg",
  "portfolio/events/wedding-08.webp",// temp
  "portfolio/events/wedding-08.webp",
  "wall/IMG_8363.jpg", //temp
  "portfolio/events/wedding-01.webp",
  "wall/IMG_8363.jpg",
  "portfolio/events/wedding-09.webp",
  "wall/IMG_8467.jpg",//temp
  "portfolio/events/wedding-08.webp",
  "wall/IMG_8410.jpg",
  "wall/IMG_8410.jpg", //temp
  "portfolio/events/ikea-09.webp",
  "wall/IMG_8410.jpg", //temp

].map(path => ({ image: asset(path) }));
