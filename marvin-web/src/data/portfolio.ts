export type Portrait = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};
// Optional clip for an event. Drop your own MP4 in public/portfolio/videos/ and
// point `src` at it; an event without a video simply hides the Video option.
export type PortfolioVideo = { src: string; label: string };
// Colours of the 3D booth for an event (curtain tint, sign glow, curtain sheen).
export type EventTheme = { curtain?: string; sign?: string; sheen?: string };
// For the 3D view (see scene/buildBackdrop and scene/buildWrappedBooth):
// - backdrop: a photo of the event's backdrop with a transparent background, shown
//   next to the booth; `width` is its width in the scene (the booth is about 3.1).
// - wrap: a booth made for the event, printed with its own design: the drawings of
//   the front, back and both sides, the sign on the roof box, and the colour of
//   the unprinted parts. It is shown instead of the standard Marvin booth.
export type EventBackdrop = { src: string; width: number };
export type EventBoothWrap = { front: string; back: string; left: string; right: string; sign: string; color: string };
export type Collection = {
  id: string;
  name: string;
  images: readonly Portrait[];
  video?: PortfolioVideo;
  theme: EventTheme;
  backdrop?: EventBackdrop;
  wrap?: EventBoothWrap;
};

export const portraits: readonly Portrait[] = [
  { alt: "Three friends blowing kisses in the photobooth", width: 584, height: 440 },
  { alt: "Three friends holding a long strip of photobooth pictures", width: 330, height: 585 },
  { alt: "Two children smiling together in the photobooth", width: 465, height: 499 },
  { alt: "A group of friends making playful poses in the photobooth", width: 479, height: 364 },
  { alt: "Two friends laughing and hugging in the photobooth", width: 401, height: 413 },
  { alt: "A black and white photobooth portrait of two friends", width: 800, height: 601 },
].map((portrait, index) => ({
  id: `ape-portrait-${index + 1}`,
  src: `portfolio/ape-portrait-${index + 1}.webp`,
  ...portrait,
}));

// Each event has its own photos, video and 3D booth look. The images and clips
// below are demo content: replace them with the real event material.
export const collections: readonly Collection[] = [
  {
    id: "ikea",
    name: "IKEA",
    images: [0, 1, 2, 3, 4, 5].map(i => portraits[i]),
    video: { src: "portfolio/videos/ikea.mp4", label: "IKEA event, a short highlight clip" },
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
    name: "Wedding",
    images: [2, 4, 5, 1, 0, 3].map(i => portraits[i]),
    video: { src: "portfolio/videos/wedding.mp4", label: "Wedding, a short highlight clip" },
    theme: { curtain: "#e9b9c6", sign: "#fff0e4", sheen: "#d9a0b0" },
    backdrop: { src: "portfolio/backdrops/wedding.webp", width: 4.4 },
  },
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
};
export const portfolioLabels = {
  printSignature: "marvin studio",
};
