import { test, expect, type Page } from "@playwright/test";

async function goToProgress(page: Page, progress: number) {
  await page.evaluate(value => scrollTo(0, value *
    (document.querySelector<HTMLElement>(".journey")!.offsetHeight - document.querySelector<HTMLElement>(".stage")!.offsetHeight)), progress);
}

test("3D curtain and camera move together, hold, reverse, and release on shortcut", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "GPU rendering is reviewed in Chrome; other engines exercise the accessible routes.");
  // A smaller canvas keeps software-rendered CI runs fast; the test checks motion, not pixels.
  await page.setViewportSize({ width: 800, height: 560 });
  const errors: string[] = [];
  const videoRequests: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (/\.mp4/.test(request.url())) videoRequests.push(request.url()); });
  await page.goto("./");
  const scene = page.locator(".booth-renderer");
  await expect(scene).toHaveAttribute("data-renderer", "ready", { timeout: 60000 });
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("video")).toHaveCount(0);
  const camera = await scene.getAttribute("data-camera");
  await goToProgress(page, .285);
  await expect.poll(async () => Number(await scene.getAttribute("data-curtain"))).toBeCloseTo(.5, 2);
  await expect(scene).not.toHaveAttribute("data-camera", camera!);
  await expect(scene).toHaveAttribute("data-scene-motion", "settled");
  const openingCamera = await scene.getAttribute("data-camera");
  await goToProgress(page, .65);
  await expect(scene).not.toHaveAttribute("data-camera", camera!);
  await expect(scene).toHaveAttribute("data-scene-motion", "settled");
  await expect(scene).toHaveAttribute("data-cloth-motion", "settled");
  await expect(scene).toHaveAttribute("data-curtain", "1.0000");
  const heldCamera = await scene.getAttribute("data-camera");
  const heldFrames = await scene.getAttribute("data-frames");
  await page.waitForTimeout(350);
  await expect(scene).toHaveAttribute("data-camera", heldCamera!);
  await expect.poll(async () => Number(await scene.getAttribute("data-frames"))).toBeGreaterThan(Number(heldFrames));
  await expect(scene).toHaveAttribute("data-wind", "breeze");
  await goToProgress(page, .75);
  await goToProgress(page, .285);
  await expect.poll(async () => Number(await scene.getAttribute("data-curtain"))).toBeCloseTo(.5, 2);
  await expect(scene).toHaveAttribute("data-scene-motion", "settled");
  await expect(scene).toHaveAttribute("data-camera", openingCamera!);
  await page.getByRole("link", { name: "Our work" }).click();
  await expect(page.getByRole("tab", { name: "The portraits" })).toBeFocused();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("link", { name: "Marvin Studio home" }).click();
  await expect(scene).toHaveAttribute("data-renderer", "ready", { timeout: 60000 });
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(videoRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("supplied textures load and gentle wind continues while the rail and camera hold", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Real cloth rendering is exercised in Chrome.");
  const textures: string[] = [];
  const failed: string[] = [];
  page.on("response", response => {
    if (response.url().includes("/textures/")) {
      textures.push(response.url().split("/").pop()!);
      if (!response.ok()) failed.push(response.url());
    }
  });
  await page.goto("./");
  const scene = page.locator(".booth-renderer");
  await expect(scene).toHaveAttribute("data-textures", "loaded", { timeout: 60000 });
  expect(textures).toEqual(expect.arrayContaining(["printer-reference.jpg", "marvin-wordmark.png", "olive-velvet.jpg"]));
  expect(failed).toEqual([]);
  const camera = await scene.getAttribute("data-camera");
  await goToProgress(page, .23);
  await expect(scene).toHaveAttribute("data-cloth-motion", "settling");
  const displacement = await scene.getAttribute("data-cloth-displacement");
  await expect(scene).not.toHaveAttribute("data-cloth-displacement", displacement!);
  await expect(scene).not.toHaveAttribute("data-camera", camera!);
  await expect(scene).toHaveAttribute("data-scene-motion", "settled");
  await expect(scene).toHaveAttribute("data-cloth-motion", "settled");
  const frames = await scene.getAttribute("data-frames");
  const windTime = await scene.getAttribute("data-wind-time");
  const heldCamera = await scene.getAttribute("data-camera");
  await page.waitForTimeout(200);
  await expect.poll(async () => Number(await scene.getAttribute("data-frames"))).toBeGreaterThan(Number(frames));
  await expect(scene).not.toHaveAttribute("data-wind-time", windTime!);
  await expect(scene).toHaveAttribute("data-camera", heldCamera!);
});

test("portfolio displays the six PDF photos at their native dimensions", async ({ page }) => {
  await page.goto("./#work");
  const photos = page.locator(".prints img");
  await expect(photos).toHaveCount(3);
  const dimensions = [[584, 440], [330, 585], [465, 499], [479, 364], [401, 413], [800, 601]];
  for (let collection = 0; collection < 2; collection++) {
    for (let index = 0; index < 3; index++) {
      const photo = photos.nth(index);
      await expect(photo).toHaveAttribute("src", new RegExp(`ape-portrait-${collection * 3 + index + 1}\\.webp$`));
      await expect.poll(() => photo.evaluate(image => [(image as HTMLImageElement).naturalWidth,
        (image as HTMLImageElement).naturalHeight])).toEqual(dimensions[collection * 3 + index]);
      await expect(photo).toHaveCSS("object-fit", "contain");
    }
    if (collection === 0) await page.getByRole("button", { name: "Next collection" }).click();
  }
});

test("direct entry does not load the 3D renderer until the visitor goes home", async ({ page }) => {
  const resources: string[] = [];
  page.on("request", request => { if (/createBoothScene|\.mp4/.test(request.url())) resources.push(request.url()); });
  await page.goto("./#work");
  await expect(page.getByRole("tab", { name: "The portraits" })).toBeFocused();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(resources).toEqual([]);
  await page.getByRole("link", { name: "Marvin Studio home" }).click();
  await expect.poll(() => resources.length).toBeGreaterThan(0);
});

test("unavailable WebGL retains the reference and a usable portfolio", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.startsWith("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("./");
  await expect(page.locator(".booth-renderer")).toHaveAttribute("data-renderer", "fallback", { timeout: 60000 });
  await expect(page.locator(".booth-poster")).toBeVisible();
  await goToProgress(page, .82);
  await expect(page.locator(".white-transition")).toHaveCount(0);
  await expect.poll(async () => Number(await page.locator("#work").evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(0);
  expect(Number(await page.locator("#work").evaluate(el => getComputedStyle(el).opacity))).toBeLessThan(1);
  await expect(page.locator(".media-surface")).toHaveCSS("opacity", "1");
  await page.getByRole("link", { name: "Our work" }).click();
  await expect(page.getByRole("tab", { name: "The portraits" })).toBeFocused();
});

test("GPU context loss falls back without hiding portfolio access", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Context-loss extension is exercised in Chrome.");
  await page.goto("./");
  await expect(page.locator(".booth-renderer")).toHaveAttribute("data-renderer", "ready", { timeout: 60000 });
  await page.locator("canvas").evaluate(canvas => canvas.getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext());
  await expect(page.locator(".booth-renderer")).toHaveAttribute("data-renderer", "fallback");
  await expect(page.locator(".booth-poster")).toBeVisible();
  await page.getByRole("link", { name: "Our work" }).click();
  await expect(page.getByRole("tab", { name: "The portraits" })).toBeFocused();
});
