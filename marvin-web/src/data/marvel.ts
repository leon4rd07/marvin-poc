import { asset } from "../lib/assets";
import type { DriftWallItem } from "../components/DriftWall";

// Pictures on the opening wall (files in `public/`). Tiles are portrait, 3:4, and crop to fit.
const wall = (name: string) => asset(`wall/${name}`);
const event = (name: string) => asset(`portfolio/events/${name}.webp`);

// The wall repeats these to fill whatever the pins below leave open.
export const marvelItems: DriftWallItem[] = [
  wall("IMG_8549.jpg"), event("wedding-08"), wall("IMG_8437.JPG"), event("wedding-09"), event("ikea-09"),
  event("wedding-01"), wall("IMG_8363.jpg"), event("ikea-01"), wall("IMG_8467.jpg"), event("ikea-06"),
  event("wedding-06"), wall("IMG_8410.jpg"), event("ikea-08"), event("ikea-05"),
].map(image => ({ image }));

// Tiles fixed in place: [column from the centre line, row, picture]. Laid out for a 16:10 screen at
// 80% browser zoom (about 1850 x 1000 CSS px), numbered 1-17 in the design.
export const wallPins: [col: number, row: number, image: string][] = [
  [-4, 2, wall("IMG_8549.jpg")],   //  1
  [-3, 4, event("wedding-08")],    //  2
  [-2, 0, wall("IMG_8437.JPG")],   //  3
  [-1, 2, event("wedding-09")],    //  4
  [0, 3, event("ikea-09")],        //  5
  [1, 0, event("wedding-01")],     //  6
  [1, 4, wall("IMG_8363.jpg")],    //  7
  [2, 1, event("ikea-01")],        //  8
  [3, 3, event("wedding-08")],     //  9
  [-3, 0, wall("IMG_8467.jpg")],   // 10
  [-2, 1, event("ikea-09")],       // 11
  [-1, 3, event("ikea-06")],       // 12
  [0, 4, event("wedding-06")],     // 13
  [1, 1, wall("IMG_8410.jpg")],    // 14
  [2, 2, event("ikea-08")],        // 15
  [3, 4, event("ikea-05")],        // 16
  [-2, 2, event("wedding-06")],    // 17
];
