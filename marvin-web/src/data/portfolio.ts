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
export type Collection = {
  id: string;
  name: string;
  caption: string;
  description: string;
  images: readonly Portrait[];
  video?: PortfolioVideo;
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

export const collections: readonly Collection[] = [
  {
    id: "classics",
    name: "The classics",
    caption: "A few seconds.\nA forever kind of feeling.",
    description: "Unfiltered smiles and the in-between faces. A little reminder of being yourself.",
    images: portraits.slice(0, 3),
    video: { src: "portfolio/videos/classics.mp4", label: "The classics, a short highlight clip" },
  },
  {
    id: "warm-memories",
    name: "Warm memories",
    caption: "Good company.\nBetter memories.",
    description: "The people who make an ordinary moment feel like something worth keeping.",
    images: portraits.slice(3, 6),
    video: { src: "portfolio/videos/warm-memories.mp4", label: "Warm memories, a short highlight clip" },
  },
  {
    id: "after-hours",
    name: "After hours",
    caption: "One more moment\nbefore you go.",
    description: "For the last laugh, the unexpected pose, and the stories that stay with you.",
    images: [portraits[1], portraits[3], portraits[5]],
    video: { src: "portfolio/videos/after-hours.mp4", label: "After hours, a short highlight clip" },
  },
];
// Ways to look at an event on the right-hand side of the portfolio screen.
export const showcaseViews = [
  { id: "photos", label: "Photos", note: "Little prints. Lasting feelings." },
  { id: "model", label: "3D model", note: "Drag to turn the booth. Open the curtain and look inside." },
  { id: "video", label: "Video", note: "A few seconds, in motion." },
] as const;
export type ShowcaseView = (typeof showcaseViews)[number]["id"];
export const tabs = [
  { id: "portraits", label: "The portraits" },
  { id: "experience", label: "The experience" },
  { id: "hello", label: "Say hello" },
] as const;
export type PortfolioTab = (typeof tabs)[number]["id"];
export const experience = {
  heading: "Close the curtain.\nOpen up a little.",
  description: "A concept for a small, private space where the best photo is the one that feels like you.",
  steps: [
    { title: "Step inside", description: "Your people. A little privacy. A moment of your own." },
    { title: "Find your face", description: "The big smile, the silly one, the perfectly imperfect one." },
    { title: "Keep a moment", description: "A small reminder of a very good time." },
  ],
};
export type ContactAction = {
  label: string;
  href: `mailto:${string}` | `https://${string}`;
};
export const contact: {
  heading: string;
  description: string;
  note: string;
  action: ContactAction | null;
} = {
  heading: "Your people.\nOur little booth.",
  description: "A wedding, a celebration, or just because. Imagine Marvin in your next memory.",
  note: "This is a concept preview. Contact and bookings are not connected yet.",
  // Add only a confirmed business destination.
  action: null,
};
export const portfolioLabels = {
  tagline: "A LITTLE SPACE FOR YOU",
  book: "Book a moment",
  contentNotice: "REFERENCE PORTRAITS · DEMO CONTENT",
  printSignature: "marvin studio",
};
