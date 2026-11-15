import { asset } from "../lib/assets";
import type { DriftWallItem } from "../components/DriftWall";

// Pictures on the opening wall (files in `public/`). Tiles are portrait, 3:4, and crop to fit.
const wall = (name: string) => asset(`wall/${name}`);

// The wall repeats these to fill whatever the pins below leave open.
export const marvelItems: DriftWallItem[] = [
  wall("IMG_8549.jpg"), wall("wedding-08.webp"), wall("IMG_8437.JPG"), wall("wedding-09.webp"), wall("ikea-09.webp"),
  wall("wedding-01.webp"), wall("IMG_8363.jpg"), wall("ikea-01.webp"), wall("IMG_8467.jpg"), wall("ikea-06.webp"),
  wall("wedding-06.webp"), wall("IMG_8410.jpg"), wall("ikea-08.webp"), wall("ikea-05.webp"),
].map(image => ({ image }));

// Tiles fixed in place: [column from the centre line, row, picture]. Laid out for a 16:10 screen at
// 80% browser zoom (about 1850 x 1000 CSS px), numbered 1-17 in the design.
export const wallPins: [col: number, row: number, image: string][] = [
  [-4, 2, wall("IMG_8549.jpg")],   //  1
  [-3, 4, wall("wedding-08.webp")],    //  2
  [-2, 0, wall("IMG_8437.JPG")],   //  3
  [-1, 2, wall("wedding-09.webp")],    //  4
  [0, 3, wall("ikea-09.webp")],        //  5
  [1, 0, wall("wedding-01.webp")],     //  6
  [1, 4, wall("IMG_8363.jpg")],    //  7
  [2, 1, wall("ikea-01.webp")],        //  8
  [3, 3, wall("wedding-08.webp")],     //  9
  [-3, 0, wall("IMG_8467.jpg")],   // 10
  [-2, 1, wall("ikea-09.webp")],       // 11
  [-1, 3, wall("ikea-06.webp")],       // 12
  [0, 4, wall("wedding-06.webp")],     // 13
  [1, 1, wall("IMG_8410.jpg")],    // 14
  [2, 2, wall("ikea-08.webp")],        // 15
  [3, 4, wall("ikea-05.webp")],        // 16
  [-2, 2, wall("wedding-06.webp")],    // 17
];
