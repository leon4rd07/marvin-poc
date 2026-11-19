export type Portrait = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};
// Optional clip for an event: an MP4 in public/portfolio/videos/, a still from it
// shown before it plays (`poster`) and its size in pixels, which sets the shape of
// the player. An event without a video simply hides the Video option.
export type PortfolioVideo = { src: string; poster: string; width: number; height: number; label: string };
// Colours of the 3D booth for an event (curtain tint, sign glow, curtain sheen).
export type EventTheme = { curtain?: string; sign?: string; sheen?: string };
// For the 3D view (see scene/buildBackdrop and scene/buildWrappedBooth):
// - backdrop: a photo of the event's backdrop, shown on its own in the 3D view
//   (instead of the booth); `width` is its width in the scene. A photo with a
//   transparent background stands as a gently folded cloth; with `board` (the colour
//   of its edges and back) it is a flat, rigid wall, the photo filling its front.
// - wrap: a booth made for the event, printed with its own design: the drawings of
//   the front, back and both sides, the sign on the roof box, and the colour of
//   the unprinted parts. It is shown instead of the standard Marvin booth.
export type EventBackdrop = { src: string; width: number; board?: string };
export type EventBoothWrap = { front: string; back: string; left: string; right: string; sign: string; color: string };
export type Collection = {
  id: string;
  name: string;
  images: readonly Portrait[];
  video?: PortfolioVideo;
  theme: EventTheme;
  backdrop?: EventBackdrop;
  wrap?: EventBoothWrap;
  // "whole": the photos are shown uncropped inside the print (white bands where
  // their shape differs from 5:6), for events whose photos are kept as supplied.
};

// Photos of an event, in public/portfolio/events/<event>-01.webp, -02.webp, … in the
// order given (cropped 5:6, 600 × 720: the prints on the ring are never shown wider
// than about 250 pixels, so this stays sharp on a phone and keeps the files light).
const eventPhotos = (event: string, alts: readonly string[]): Portrait[] => alts.map((alt, index) => {
  const id = `${event}-${String(index + 1).padStart(2, "0")}`;
  return { id, src: `portfolio/events/${id}.webp`, alt, width: 600, height: 720 };
});

// The selfie button prints one of these on the polaroid, in turn (square,
// 800 × 800, in public/portfolio/selfies/): real photobooth shots from the Billy &
// Karen wedding and the Streetscape 2026 booth.
export const selfies: readonly Portrait[] = [
  "The bride and groom waving in front of the Billy & Karen backdrop",
  "Four friends in sunglasses leaning in together",
  "Three guests in evening dresses in front of the wedding flowers",
  "A couple both making a peace sign",
  "Two friends in black dresses at the wedding backdrop",
  "A boy pulling a face as two grown-ups kiss his cheeks",
  "Seven guests at the Billy & Karen backdrop",
  "Four friends crowding the camera with peace signs",
  "A guest in a sequinned gown posing by the wedding flowers",
  "A smiling couple close together in the booth",
  "Three guests side by side at the wedding backdrop",
  "Four people making a heart with their arms over their heads",
  "A big group of wedding guests squeezed into one photo",
  "Two friends cheek to cheek in the booth",
  "Two guests in red dresses at the wedding backdrop",
  "A man and a woman pulling faces against a yellow light",
  "A couple arm in arm in front of the Billy & Karen sign",
  "A man sticking out his tongue next to a friend blowing a kiss",
  "Two guests in front of the wedding flowers",
  "A couple in black smiling in the booth",
  "Guests in purple dresses at the wedding backdrop",
  "A girl making a heart over her head next to a grinning man",
  "A couple at the edge of the wedding flowers",
  "Two friends covering their faces with their hands",
].map((alt, index) => {
  const id = `selfie-${String(index + 1).padStart(2, "0")}`;
  return { id, src: `portfolio/selfies/${id}.webp`, alt, width: 800, height: 800 };
});

// Each event has its own photos, video and 3D booth look.
export const collections: readonly Collection[] = [
  {
    id: "ikea",
    name: "Streetscape 2026",
    images: eventPhotos("ikea", [
      "A red Ferrari leading a row of sports cars at night",
      "Classic Minis lined up in front of the IKEA store at sunset",
      "A Pagani Huayra in bronze and carbon under the car park lights",
      "A guest posing at the open booth door",
      "A photo strip coming out of the booth's print slot",
      "The photographer's corner in front of the IKEA store at night",
      "Printed IKEA photos laid out on the table",
      "A guest taking a picture of the booth's sample strips",
      "Guests posing by the cars while the photographer shoots",
      "Two guests looking at their photos on a phone",
      "A guest in a red shirt checking his print by the camera",
    ]),
    video: { src: "portfolio/videos/ikea.mp4", poster: "portfolio/videos/ikea.webp", width: 720, height: 1280, label: "IKEA × Streetscape, the highlight clip" },
    theme: { curtain: "#6f8fe8", sign: "#ffd94a", sheen: "#5d78c9" },
    wrap: {
      front: "portfolio/booths/ikea-front.jpg",
      back: "portfolio/booths/ikea-back.jpg",
      left: "portfolio/booths/ikea-left.jpg",
      right: "portfolio/booths/ikea-right.jpg",
      sign: "portfolio/booths/ikea-sign.jpg",
      color: "#1f4f9e",
    },
  },
  {
    id: "wedding",
    name: "B&K's Wedding",
    images: eventPhotos("wedding", [
      "The bride and groom kissing in front of the camera",
      "The bridal party posing at the Billy & Karen backdrop",
      "Two guests holding up their framed prints",
      "The photobooth corner with the Billy & Karen backdrop",
      "Groomsmen posing in front of the camera",
      "Two bridesmaids in blue holding their framed prints",
      "The ballroom aisle under red curtains and lights",
      "The photo wall of the couple among the flowers",
      "Two guests in blue showing their prints by the flowers",
      "The Billy & Karen backdrop framed by red, white and blue flowers",
    ]),
    video: { src: "portfolio/videos/wedding.mp4", poster: "portfolio/videos/wedding.webp", width: 720, height: 1280, label: "Billy & Karen's wedding, the highlight clip" },
    theme: { curtain: "#e9b9c6", sign: "#fff0e4", sheen: "#d9a0b0" },
    backdrop: { src: "portfolio/backdrops/wedding.webp", width: 4.4 },
  },
  {
    id: "noera",
    name: "Noera's 8th Anniversary",
    images: eventPhotos("noera", [
      "Two guests posing at the Noera Eightfinity backdrop while the photographer shoots",
      "Two Noera supplement bottles among pink and lilac flowers",
      "The photographer counting in a couple at the butterfly backdrop, printer beside him",
      "A guest in a lilac gown kissing her Noera Eightfinity print",
      "A guest in a navy jacket pointing at his print",
      "Six guests posing at the backdrop by the anniversary flowers",
      "A guest with a pearl and flower crown holding up her print",
      "A guest in a navy gown with a pearl collar holding her print",
      "A guest in a lace dress showing her print beside the Noera banner",
      "A guest in a plum off-shoulder top holding her print against the gold wall",
      "The photo corner with its light and printer as guests crowd the lobby",
      "The canapé table with sliders, croquettes and tiramisu cups",
      "The curved corridor lined with lilac portrait banners",
      "The butterfly backdrop and anniversary flowers before the guests arrive",
      "Two crew members setting up the laptop and printer by the backdrop",
      "A guest in a navy ruffled gown posing at the sequinned Noera wall as a videographer films",
      "A guest holding up a giant Noera bottle beside a woman in a navy gown",
      "Guests filming a couple posing at the Noera Eightfinity backdrop",
      "A woman in a navy lace gown with a pink handbag beside the anniversary flowers",
      "A smiling guest pointing at her print at the butterfly backdrop",
      "A guest in a hijab checking her phone next to a woman in a navy gown",
      "A couple posing at the butterfly backdrop as a light flashes",
      "A man photographing a woman with a lilac tote at the butterfly backdrop",
    ]),
    video: { src: "portfolio/videos/noera.mp4", poster: "portfolio/videos/noera.webp", width: 720, height: 1280, label: "Noera Eightfinity, the 8th anniversary clip" },
    theme: { curtain: "#b9a3e3", sign: "#ffd3e6", sheen: "#9a84cc" },
    backdrop: { src: "portfolio/backdrops/noera.webp", width: 2.6, board: "#8a7bbd" },
  },
];
// Marvin's prints, as 3D models on a slowly turning stand on the opening slide
// (scene/createProductScene.ts builds each one by `id`). `src` is what is printed
// on it (public/portfolio/products/: the 4R strips are from the pitch deck, the XL
// strip and the tote card are put together from real booth photos and the B&K frame).
// `detail` is the line under the name.
export type Product = { id: "4r" | "xl" | "tote"; name: string; detail: string; src: string; alt: string };
export const products: readonly Product[] = [
  { id: "4r", name: "4R", detail: "Photostrips", src: "portfolio/products/4r.webp",
    alt: "A 4R print of two photostrips on a clear acrylic easel" },
  { id: "xl", name: "XL Strip", detail: "75 × 25 cm", src: "portfolio/products/xl.webp",
    alt: "A long XL photostrip in a clear sleeve bag with handles, hanging from a chrome stand" },
  { id: "tote", name: "Mini Tote", detail: "25 × 20 cm", src: "portfolio/products/tote.webp",
    alt: "A clear mini tote bag with a printed wedding photo card inside" },
];
// Ways to look at an event on the monitor.
export const showcaseViews = [
  { id: "photos", label: "Photos" },
  { id: "model", label: "3D model" },
  { id: "video", label: "Video" },
] as const;
export type ShowcaseView = (typeof showcaseViews)[number]["id"];
// Contact links for the booking section.
// - whatsapp: the number in international format, digits only
// - instagram / tiktok: the full profile URLs
export const social = {
  whatsapp: "6282322220007",
  whatsappMessage: "Halo Marvin, saya mau booking photobooth untuk event.",
  instagram: "https://www.instagram.com/marvinstudio_id/",
  tiktok: "https://www.tiktok.com/@marvinstudio.id",
};
export const whatsappLink = social.whatsapp
  ? `https://wa.me/${social.whatsapp}?text=${encodeURIComponent(social.whatsappMessage)}` : null;
export const closing = {
  book: "Book for an event",
  bookNote: "chat with us on WhatsApp",
  session: "Book a session",
  sessionNote: "at the booth in Blok M Square",
};
// "Book a session": a session at the walk-in booth, paid by QRIS. The site has no
// payment server, so the order is sent to Marvin on WhatsApp, where the staff reply
// with the QRIS and, once paid, the code to type at the booth. Prices in rupiah.
// - extraStrip: price of each strip after the first; null while it is not set, the
//   form then says the staff confirm it on WhatsApp.
export const booking = {
  place: "Blok M Square",
  address: "Lantai G, Blok A No. 81, Blok M Square",
  maps: "https://www.google.com/maps/search/?api=1&query=Lantai%20G%2C%20Blok%20A%20No.%2081%2C%20Blok%20M%20Square",
  firstStrip: 88000,
  extraStrip: null as number | null,
  maxStrips: 10,
  allPhotos: 19000,
};
export const portfolioLabels = {
  printSignature: "marvin studio",
};
