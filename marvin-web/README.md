# Marvin Studio — 3D edition

Three.js geometry replaces the previous MP4 entrance. The model uses the original booth composition plus the supplied black transparent Marvin wordmark, olive velvet fabric and six photos extracted directly from `ape.pdf`. It faces directly forward, with a warm yellow backlit top sign, reflective champagne metal trim, a compact recessed stainless printer tray and an empty interior without a chair. The curtain has irregular soft folds and a gentle continuous breeze. Depth is inferred from the references.

Use the Node 24 release pinned in `../.nvmrc` (validated locally with 24.19.0).

```sh
npm ci
npm run dev
```

Vite serves the website on port 5173. A single downward wheel gesture, upward touch swipe or PageDown starts a 3.6-second entrance: one continuous zoom while the curtain opens, with the portfolio page sitting behind the doorway and growing with the camera, so there is no white flash or fade; the booth's back wall is a depth-only “portal” through which the HTML page shows. An upward wheel gesture at the portfolio's top reverses home at the same slower pace. Scrolling within portfolio content remains native; “Our work” is an immediate shortcut. The entrance occupies one viewport of document scroll and can also be scrubbed with the scrollbar. A continuous forward/lateral path and logarithmic distance interpolation keep the approach from rushing near the curtain. Gentle wind continues at rest with the top rail pinned, capped at 30 fps and paused when hidden or beyond the entrance. The entrance ignores the OS reduced-motion setting. No video is requested. The renderer is dynamically imported only when needed, with a capped pixel ratio and resource cleanup. Missing WebGL and context loss retain a matching poster fallback.

Edit geometry and supplied texture crops in `src/scene/buildBooth.ts` (including the “How it works” guide board beside the curtain and the curtain length, `curtainDrop` in `src/scene/curtainMotion.ts`), cloth response and the hover “hand” in `src/scene/curtainMotion.ts` / `src/scene/createBoothScene.ts`, lighting/framing in `src/scene/createBoothScene.ts`, and choreography in `src/lib/timeline.ts`.

Inside the booth the monitor sits on the left wall and a printer on the right (`src/components/PortfolioMonitor.tsx`, `SelfiePrinter.tsx`); everything there is sized from one unit (`--u` in `src/styles/site.css`), so it looks the same on every device and only scales. The monitor shows one event at a time as Photos, a playable 3D booth or a Video; slide left/right for the next event. Events (IKEA, Padel Night, Wedding), their photos, videos and 3D booth colours live in `src/data/portfolio.ts` (the bundled photos and clips are demo content: replace them, put videos in `public/portfolio/videos/`). The selfie button prints a portrait out of the printer slot. Scrolling down leaves the booth wall for the experience and the closing section. Logos are `public/textures/marvin-wordmark.png` (monitor) and `public/textures/marvin-logo-studio.png` (header). Asset provenance and the Codex skill adaptation are recorded in `../docs/models/assets.md`.
