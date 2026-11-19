import { useId } from "react";
import type { Product } from "../data/portfolio";

// Drawings of Marvin's prints for the opening slide, each standing on a round
// white display. All share one frame (300 × 408, the shape of a card on the ring)
// and one display, so they line up as the ring turns.

type Tone = "colour" | "mono";
const colour = {
  backs: ["#f3dcc8", "#d6e5ec", "#eadbf1", "#f6e9b8", "#dfe9d5"],
  skins: ["#e9b896", "#c98f6c", "#f2cdaf", "#b47a57"],
  hair: ["#2b211c", "#5a3b2a", "#1d1f1a", "#7a4a2c"],
  tops: ["#1d1f1a", "#c84b3c", "#3d5a8a", "#f1cd3c", "#fbfaf5"],
};
const mono = {
  backs: ["#d9d9d6", "#c4c4c0", "#e6e6e3", "#b9b9b5", "#cfcfcb"],
  skins: ["#e2e2df", "#cbcbc7", "#efefec", "#bdbdb9"],
  hair: ["#2a2a28", "#3d3d3a", "#1d1d1b", "#4a4a47"],
  tops: ["#1d1d1b", "#6d6d69", "#4a4a47", "#9a9a96", "#f4f4f1"],
};
const pick = <T,>(list: readonly T[], seed: number) => list[seed % list.length];

// One frame of a photostrip: a backdrop colour and one to three people in it.
function Snap({ x, y, w, h, seed, tone, clip }: { x: number; y: number; w: number; h: number; seed: number; tone: Tone; clip: string }) {
  const palette = tone === "mono" ? mono : colour;
  const people = 1 + (seed % 3);
  const id = `${clip}-${seed}-${Math.round(x)}-${Math.round(y)}`;
  const r = h * (people === 3 ? .12 : .145);
  return (
    <g>
      <clipPath id={id}><rect x={x} y={y} width={w} height={h} /></clipPath>
      <rect x={x} y={y} width={w} height={h} fill={pick(palette.backs, seed)} />
      <g clipPath={`url(#${id})`}>
        {Array.from({ length: people }, (_, n) => {
          const cx = x + w * (n + 1) / (people + 1) + (n % 2 ? r * .2 : -r * .2);
          const cy = y + h * (.42 + (n % 2) * .06);
          const top = pick(palette.tops, seed + n * 2 + 1);
          return (
            <g key={n}>
              <path d={`M${cx - r * 2} ${y + h + 1} Q${cx - r * 2} ${cy + r * 1.5} ${cx} ${cy + r * 1.35} Q${cx + r * 2} ${cy + r * 1.5} ${cx + r * 2} ${y + h + 1}Z`} fill={top} />
              <circle cx={cx} cy={cy - r * .12} r={r * 1.08} fill={pick(palette.hair, seed + n)} />
              <circle cx={cx} cy={cy + r * .08} r={r} fill={pick(palette.skins, seed + n * 3)} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

// The round white display every product stands on (its top at y = 352).
function Display({ id, footprint }: { id: string; footprint: number }) {
  return (
    <g>
      <radialGradient id={`${id}-floor`} cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor="#1d1f1a" stopOpacity=".16" />
        <stop offset="1" stopColor="#1d1f1a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-side`} x1="0" x2="1">
        <stop offset="0" stopColor="#e3dfd5" />
        <stop offset=".38" stopColor="#fbfaf6" />
        <stop offset=".62" stopColor="#f6f4ee" />
        <stop offset="1" stopColor="#d9d4c8" />
      </linearGradient>
      <ellipse cx="150" cy="397" rx="128" ry="11" fill={`url(#${id}-floor)`} />
      <path d="M48 352V390A102 13 0 0 0 252 390V352Z" fill={`url(#${id}-side)`} />
      <ellipse cx="150" cy="352" rx="102" ry="13" fill="#fdfcf9" stroke="#e6e1d6" />
      <ellipse cx="150" cy="352" rx={footprint} ry="4" fill="#1d1f1a" opacity=".14" />
    </g>
  );
}

// A photostrip: frames in a column on paper, with "marvin" under them.
function Strip({ x, y, w, h, tone, paper, ink, seed, clip }: {
  x: number; y: number; w: number; h: number; tone: Tone; paper: string; ink: string; seed: number; clip: string;
}) {
  const pad = w * .1, foot = w * .34, gap = w * .07;
  const frame = (h - pad - foot - gap * 3) / 4;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={paper} />
      {[0, 1, 2, 3].map(n => (
        <Snap key={n} x={x + pad} y={y + pad + n * (frame + gap)} w={w - pad * 2} h={frame} seed={seed + n * 2} tone={tone} clip={clip} />
      ))}
      <text x={x + w / 2} y={y + h - foot * .38} textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700"
        fontSize={w * .16} letterSpacing={w * .01} fill={ink} style={{ textTransform: "none" }}>marvin</text>
    </g>
  );
}

function FourR({ id }: { id: string }) {
  // A 4R print (4 × 6 in) holding two strips, on a clear stand, a second print
  // leaning behind it and a photo keychain in front.
  return (
    <g>
      <Display id={id} footprint={78} />
      <g transform="rotate(7 214 350)">
        <rect x="128" y="150" width="128" height="196" fill="#fff" stroke="#e7e2d6" />
        <Strip x={136} y={158} w={54} h={180} tone="colour" paper="#fff" ink="#1d1f1a" seed={7} clip={id} />
        <Strip x={194} y={158} w={54} h={180} tone="colour" paper="#fff" ink="#1d1f1a" seed={11} clip={id} />
      </g>
      <path d="M150 138 176 344" stroke="#cfdde4" strokeWidth="5" strokeLinecap="round" opacity=".8" />
      <g>
        <rect x="74" y="128" width="140" height="214" fill="#fff" stroke="#e2ddd0" />
        <Strip x={81} y={135} w={61} h={200} tone="colour" paper="#fff" ink="#1d1f1a" seed={0} clip={id} />
        <Strip x={146} y={135} w={61} h={200} tone="colour" paper="#fff" ink="#1d1f1a" seed={3} clip={id} />
      </g>
      <rect x="68" y="338" width="152" height="12" rx="2" fill="#dbe8ee" opacity=".85" stroke="#c3d4dc" />
      <path d="M72 341H216" stroke="#fff" strokeWidth="1.5" opacity=".9" />
      {/* The keychain: a small print in clear acrylic on a ring. */}
      <g transform="rotate(-8 74 330)">
        <circle cx="66" cy="283" r="7" fill="none" stroke="#b9b6ad" strokeWidth="2.4" />
        <rect x="50" y="290" width="34" height="50" rx="5" fill="#e8f1f4" stroke="#bccfd7" />
        <Snap x={55} y={295} w={24} h={36} seed={5} tone="colour" clip={id} />
        <path d="M54 296 66 292" stroke="#fff" strokeWidth="2" opacity=".8" />
      </g>
    </g>
  );
}

function XLStrip({ id }: { id: string }) {
  // The XL strip (75 × 25 cm), black-and-white frames on black, its top curling
  // over, standing in a block with Marvin's star cut out of the front.
  return (
    <g>
      <Display id={id} footprint={66} />
      <path d="M104 52Q150 36 196 52V64H104Z" fill="#3a3b37" />
      <Strip x={104} y={58} w={92} h={276} tone="mono" paper="#1d1f1a" ink="#fbfaf5" seed={2} clip={id} />
      <path d="M104 58Q150 44 196 58" fill="none" stroke="#55564f" strokeWidth="2" />
      <rect x="88" y="300" width="124" height="52" rx="3" fill="#2a2b28" />
      <rect x="88" y="300" width="124" height="6" fill="#3d3e3a" />
      <path d="M150 314l4.1 8.4 9.2 1.3-6.7 6.5 1.6 9.2-8.2-4.3-8.2 4.3 1.6-9.2-6.7-6.5 9.2-1.3z" fill="#f1cd3c" />
    </g>
  );
}

function MiniTote({ id }: { id: string }) {
  // The clear mini tote (25 × 20 cm) with two prints inside, black binding round
  // its mouth and clear handles.
  return (
    <g>
      <Display id={id} footprint={86} />
      <path d="M116 176C114 104 186 104 184 176" fill="none" stroke="#c6d3d9" strokeWidth="8" strokeLinecap="round" />
      <path d="M116 176C114 104 186 104 184 176" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
      <g transform="rotate(-6 128 250)">
        <rect x="88" y="196" width="80" height="104" fill="#fbfaf5" />
        <Snap x={93} y={201} w={70} h={86} seed={1} tone="mono" clip={id} />
      </g>
      <g transform="rotate(5 176 280)">
        <rect x="136" y="226" width="80" height="104" fill="#fbfaf5" />
        <Snap x={141} y={231} w={70} h={86} seed={4} tone="mono" clip={id} />
      </g>
      <path d="M72 176H228L236 348H64Z" fill="#e4eef2" fillOpacity=".42" stroke="#b9c9d0" strokeWidth="1.5" />
      <path d="M86 186 104 186 82 330 70 330Z" fill="#fff" opacity=".35" />
      <path d="M212 190 220 190 226 300 219 300Z" fill="#fff" opacity=".3" />
      <path d="M64 348H236" stroke="#a9bbc3" strokeWidth="2" />
      <rect x="70" y="170" width="160" height="9" rx="1.5" fill="#1d1f1a" />
      <path d="M112 176C110 98 190 98 188 176" fill="none" stroke="#d3dee3" strokeWidth="8" strokeLinecap="round" opacity=".9" />
      <path d="M112 176C110 98 190 98 188 176" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="106" y="170" width="12" height="12" rx="2" fill="#1d1f1a" />
      <rect x="182" y="170" width="12" height="12" rx="2" fill="#1d1f1a" />
    </g>
  );
}

const drawings = { "4r": FourR, xl: XLStrip, tote: MiniTote } as const;

export function ProductArt({ product }: { product: Product }) {
  const id = useId().replace(/:/g, "");
  const Drawing = drawings[product.id];
  return (
    <svg className="product-art" viewBox="0 0 300 408" aria-hidden="true" focusable="false">
      <Drawing id={`art${id}`} />
    </svg>
  );
}
