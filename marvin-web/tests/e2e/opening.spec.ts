import { test, expect, type Page } from "@playwright/test";

// The opening (OpeningIntro): event photos flicking full screen, then inside the
// letters of MARVIN, a flash into the lit sign, which lands on the booth's sign. Software
// rendering can hold up the first seconds of a page load, so the waits are generous.
const wheel = (page: Page, deltaY: number) => page.evaluate(delta => {
  document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: delta, bubbles: true, cancelable: true }));
}, deltaY);

test("the site opens with the event photos inside MARVIN, then lands on the booth with a scroll hint", async ({ page }) => {
  await page.goto("./");
  const opening = page.locator(".opening");
  await expect(opening).toBeVisible();
  // Photos from every event, one showing at a time, all loaded.
  const photos = page.locator(".opening-full img");
  await expect(photos).toHaveCount(18);
  await expect(page.locator('.opening-full img[data-on="true"]')).toHaveCount(1);
  await expect.poll(() => photos.evaluateAll(images => images.slice(0, 6).every(image =>
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)), { timeout: 20000 }).toBe(true);
  // The letters are a mask of the wordmark over the same photos.
  expect(await page.locator(".opening-mark").evaluate(element => getComputedStyle(element).maskImage || getComputedStyle(element).webkitMaskImage)).toContain("marvin-wordmark.png");
  await expect(opening).toHaveAttribute("data-phase", /sign|land/, { timeout: 20000 });
  await expect(opening).toHaveCount(0, { timeout: 20000 });
  // Landed in front of the booth, page unmoved, with the hint to scroll.
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator(".stage")).toHaveAttribute("data-phase", "booth");
  await expect.poll(() => page.locator(".scroll-cue").evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
  // The hint goes once you walk in.
  await page.waitForTimeout(400);
  await wheel(page, 300);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false", { timeout: 20000 });
  await expect.poll(() => page.locator(".scroll-cue").evaluate(element => Number(getComputedStyle(element).opacity))).toBe(0);
});

test("scrolling during the opening fast-forwards it without walking into the booth", async ({ page }) => {
  await page.goto("./");
  const opening = page.locator(".opening");
  // Once it is running, one wheel tick sends it through quickly.
  await expect.poll(async () => Number(await opening.getAttribute("data-time")), { timeout: 20000 }).toBeGreaterThan(0);
  await wheel(page, 120);
  // Played out it needs some fourteen more frames; fast-forwarded only two or three.
  await expect(opening).toHaveCount(0, { timeout: 10000 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "true");
});

test("links straight into the booth, to booking, and ?intro=0 skip the opening", async ({ page }) => {
  await page.goto("./#work");
  await expect(page.locator(".opening")).toHaveCount(0);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
  await page.goto("./?intro=0");
  await expect(page.locator(".opening")).toHaveCount(0);
  await expect(page.locator(".scroll-cue")).toBeAttached();
  await page.goto("./?book");
  await expect(page.locator(".opening")).toHaveCount(0);
});

test("the opening plays in full even when the system asks for reduced motion", async ({ page }) => {
  // Laptops with Windows animation effects turned off report reduced motion; like
  // the walk into the booth, the opening plays anyway.
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Note every phase the opening goes through, from the very start of the page.
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { phases: string[] }).phases = seen;
    new MutationObserver(() => {
      const phase = document.querySelector(".opening")?.getAttribute("data-phase");
      if (phase && !seen.includes(phase)) seen.push(phase);
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-phase"] });
  });
  await page.goto("./");
  await expect(page.locator(".opening")).toHaveCount(0, { timeout: 60000 });
  expect(await page.evaluate(() => (window as unknown as { phases: string[] }).phases)).toEqual(["reel", "letters", "sign", "land"]);
});
