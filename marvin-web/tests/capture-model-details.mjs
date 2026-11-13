import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || "chrome" });
const output = new URL(process.env.QA_REVIEW_DIR || "../../docs/qa/pdf-breeze-2026-10-24/", import.meta.url);
await fs.mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:5173/?intro=0");
  await expect(page.locator(".booth-renderer")).toHaveAttribute("data-textures", "loaded");
  await expect(page.locator(".booth-renderer")).toHaveAttribute("data-renderer", "ready");
  await page.waitForTimeout(150);
  const canvas = page.locator("canvas");
  const size = await canvas.boundingBox();
  await canvas.screenshot({ type: "jpeg", quality: 90,
    path: fileURLToPath(new URL("../public/media/booth-realistic.jpg", import.meta.url)) });
  await fs.writeFile(new URL("poster-size.json", output), JSON.stringify(size, null, 2));
  const windStart = await page.locator(".booth-renderer").getAttribute("data-wind-time");
  await page.waitForTimeout(1500);
  await expect(page.locator(".booth-renderer")).not.toHaveAttribute("data-wind-time", windStart);
  await page.screenshot({ path: fileURLToPath(new URL("wind-after.png", output)) });

  for (const [width, height] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto("http://127.0.0.1:5173/?intro=0");
    await expect(page.locator(".booth-renderer")).toHaveAttribute("data-textures", "loaded");
    await expect(page.locator(".booth-renderer")).toHaveAttribute("data-renderer", "ready");
    await expect(page.locator(".booth-renderer")).toHaveAttribute("data-camera", /^0\.0000,2\.0000,/);
    await page.screenshot({ path: fileURLToPath(new URL(`${width}-hero.png`, output)) });
    await page.evaluate(() => scrollTo(0, .62 *
      (document.querySelector(".journey").offsetHeight - document.querySelector(".stage").offsetHeight)));
    await expect(page.locator(".booth-renderer")).toHaveAttribute("data-curtain", "1.0000");
    await expect(page.locator(".booth-renderer")).toHaveAttribute("data-cloth-motion", "settled");
    await page.screenshot({ path: fileURLToPath(new URL(`${width}-open.png`, output)) });
    for (const progress of [.5, .58, .66, .74]) {
      await page.evaluate(value => scrollTo(0, value *
        (document.querySelector(".journey").offsetHeight - document.querySelector(".stage").offsetHeight)), progress);
      await expect(page.locator(".booth-renderer")).toHaveAttribute("data-scene-motion", "settling");
      await expect(page.locator(".booth-renderer")).toHaveAttribute("data-scene-motion", "settled");
      await page.screenshot({ path: fileURLToPath(new URL(`${width}-approach-${progress}.png`, output)) });
    }
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator(".booth-renderer")).toHaveAttribute("data-curtain", "0.0000");
    await expect(page.locator(".booth-renderer")).toHaveAttribute("data-cloth-motion", "settled");
    await page.getByRole("link", { name: "Our work" }).click();
    for (const collection of [1, 2]) {
      if (collection === 2) await page.getByRole("button", { name: "Next collection" }).click();
      await expect.poll(() => page.locator(".prints img").evaluateAll(images =>
        images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
      await page.locator(".prints").scrollIntoViewIfNeeded();
      await page.screenshot({ path: fileURLToPath(new URL(`${width}-portfolio-${collection}.png`, output)) });
    }
  }

  await page.goto("http://127.0.0.1:5173/#work");
  const rendered = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const { studioEnvironment } = await import("/src/scene/studioEnvironment.ts");
    const { buildBooth } = await import("/src/scene/buildBooth.ts");
    const model = buildBooth(() => {});
    await model.ready;
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1100, 1000);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    const scene = new T.Scene();
    scene.background = new T.Color("#f6f5f1");
    const environment = studioEnvironment();
    const pmrem = new T.PMREMGenerator(renderer);
    const target = pmrem.fromScene(environment, .025, .1, 50, { size: 256 });
    scene.environment = target.texture;
    scene.environmentIntensity = .7;
    scene.add(model.root, new T.HemisphereLight("#fff9ef", "#929487", .55));
    const key = new T.DirectionalLight("#fff7e5", 2);
    key.position.set(-3, 6, 5); scene.add(key);
    const fill = new T.DirectionalLight("#e6efff", .65);
    fill.position.set(4, 3, 2); scene.add(fill);
    const camera = new T.PerspectiveCamera(32, 1.1, .02, 30);
    const images = [];
    for (const [name, position, look, opening, sway] of [
      ["front-model", [0, 2, 8.4], [0, 2, -.74], 0, 0],
      ["portrait-display", [-.5875, 2.37, 3.6], [-.5875, 2.37, .84], 0, 0],
      ["empty-interior", [.94, 1.7, 2.8], [.94, 1.5, -.74], 1, 0],
      ["printer-detail", [.1, 1.5, 2.8], [-.5875, 1.18, .7], 0, 0],
      ["logo-detail", [.25, 3.85, 3.4], [0, 3.775, .65], 0, 0],
      ["velvet-detail", [1.25, 2.0, 3.2], [.94, 1.7, .85], 0, 0],
      ["velvet-moving", [1.25, 2.0, 3.2], [.94, 1.7, .85], .5, .09],
      ["velvet-settled", [1.25, 2.0, 3.2], [.94, 1.7, .85], .5, 0],
    ]) {
      model.setCurtain(opening, sway);
      camera.position.set(...position); camera.lookAt(...look);
      renderer.render(scene, camera);
      images.push({ name, data: renderer.domElement.toDataURL("image/png").split(",")[1] });
    }
    model.dispose(); target.dispose(); environment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
    return images;
  });
  for (const item of rendered) await fs.writeFile(new URL(`${item.name}.png`, output), Buffer.from(item.data, "base64"));
  console.log(`Captured model details and matching fallback poster (${size.width} × ${size.height}).`);
} finally { await browser.close(); }
