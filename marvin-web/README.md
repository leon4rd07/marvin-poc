# Marvin Studio — 3D edition

Three.js geometry replaces the previous MP4 entrance. The model uses the original booth composition plus the supplied black transparent Marvin wordmark, olive velvet fabric and six photos extracted directly from `ape.pdf`. It faces directly forward, with a warm yellow backlit top sign, reflective champagne metal trim, a compact recessed stainless printer tray and an empty interior without a chair. The curtain has irregular soft folds and a gentle continuous breeze. Depth is inferred from the references.

Use the Node 24 release pinned in `../.nvmrc` (validated locally with 24.19.0).

```sh
npm ci
npm run dev
```

Vite serves the website on port 5173. A single downward wheel gesture, upward touch swipe or PageDown starts a 3.6-second entrance: one continuous zoom while the curtain opens, with the portfolio page sitting behind the doorway and growing with the camera, so there is no white flash or fade; the booth's back wall is a depth-only “portal” through which the HTML page shows. An upward wheel gesture at the portfolio's top reverses home at the same slower pace. Scrolling within portfolio content remains native; “Our work” is an immediate shortcut. The entrance occupies one viewport of document scroll and can also be scrubbed with the scrollbar. A continuous forward/lateral path and logarithmic distance interpolation keep the approach from rushing near the curtain. Gentle wind continues at rest with the top rail pinned, capped at 30 fps and paused when hidden or beyond the entrance. The entrance ignores the OS reduced-motion setting. No video is requested. The renderer is dynamically imported only when needed, with a capped pixel ratio and resource cleanup. Missing WebGL and context loss retain a matching poster fallback.

Edit geometry and supplied texture crops in `src/scene/buildBooth.ts`, cloth response in `src/scene/curtainMotion.ts`, lighting/framing in `src/scene/createBoothScene.ts`, and choreography in `src/lib/timeline.ts`. Portfolio content and confirmed contact configuration live in `src/data/portfolio.ts`. The light theme is in `src/styles/site.css`. The portfolio offers Photos, a playable 3D booth (`src/scene/createBoothViewer.ts`) and Video per event; put videos in `public/portfolio/videos/` and reference them with `video` in `src/data/portfolio.ts` (the bundled ones are generated from the demo photos). Asset provenance and the Codex skill adaptation are recorded in `../docs/models/assets.md`.

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

On Windows machines where installed Chrome works but downloaded Chromium does not, set `$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'`. To run the locally reviewed engines: `npx playwright test --project=desktop --project=mobile --project=webkit`. Actual Firefox, Safari, physical devices and screen readers require their own checks.

For visual evidence, start `npm run preview -- --host 127.0.0.1 --port 4176`, then run `node tests/capture-threejs.mjs` (set `QA_REVIEW_DIR=../../docs/qa/pdf-breeze-2026-10-24/` for the current revision). Capturing images alone does not establish acceptance. `node tests/measure-performance.mjs http://127.0.0.1:4176/` records lab loading and 3D-ready timings separately. With the dev server on 5173, `node tests/capture-model-details.mjs` renders the current model, desktop/mobile approach checkpoints and close-ups in `../docs/qa/pdf-breeze-2026-10-24/` and regenerates the matching fallback poster. Both capture scripts support `QA_REVIEW_DIR`.

With the dev server running, `npm run export:model` writes `../docs/models/marvin-booth.glb`. This GLB contains the same closed-booth geometry and embedded textures for reuse in 3D tools. The website uses the procedural source so the curtain can deform and camera travel can follow scroll directly; the exported static GLB is not downloaded by visitors.

GitHub Pages remains the hosting target. Set `PAGES_BASE_PATH=/marvin-poc/` when testing its project path. Existing Actions validate/build/deploy on a pushed default-branch commit. This working-tree revision has not been published. See [QA](../docs/qa/realism-2026-10-22/acceptance.md) and [deployment history](../docs/deployment.md).

The six portraits are native-resolution, lossless exports of the photos embedded in the supplied PDF, shared by the booth and portfolio. Regenerate with `scripts/extract-portfolio.py` using Python with Pillow and pypdf. PNG photo exports and full-page PNG renders are packaged in `../output/pdf/ape-images.zip`. Contact remains disabled until a real destination is supplied. Legacy video assets, the CSS zoom prototype, video-specific plans and their QA artifacts were removed from the workspace on 2026-10-26. Current 3D assets and evidence are retained.
