import { test, expect, type Page } from "@playwright/test";

// The opening wall keeps its own scroll position, so drive it with wheel events
// directly: one event is one gesture, whatever the machine's frame rate.
const wheel = (page: Page, deltaY: number) => page.evaluate(delta => {
  document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: delta, bubbles: true, cancelable: true }));
}, deltaY);
const tilt = (page: Page) => page.locator(".drift-wall__plane").evaluate(element =>
  Number(/rotateX\(([-\d.e]+)deg\)/.exec((element as HTMLElement).style.transform)?.[1] ?? NaN));
const progress = (page: Page) => page.locator(".marvel").evaluate(element => Number((element as HTMLElement).dataset.progress));

test("the wall of pictures opens the site and straightens gradually as it is scrolled", async ({ page }) => {
  await page.goto("./");
  const wall = page.locator(".marvel");
  await expect(wall).toHaveAttribute("data-gone", "false");
  await expect(page.locator(".drift-wall__tile img").first()).toBeVisible();
  await expect.poll(() => tilt(page)).toBe(30);
  // One mouse-wheel notch is a small part of the scene, and it glides rather than jumps.
  await wheel(page, 100);
  await expect.poll(() => progress(page)).toBeGreaterThan(0);
  expect(await progress(page)).toBeLessThan(.039);
  await expect.poll(() => progress(page)).toBeGreaterThan(.036);
  await page.waitForTimeout(500);
  expect(await progress(page)).toBeLessThan(.04);
  expect(await tilt(page)).toBeGreaterThan(29);
  // The page itself has not moved: the booth still waits at its front.
  expect(await page.evaluate(() => scrollY)).toBe(0);
  // Scrolled as far as upright: the wall is straight and still fully there.
  await wheel(page, 2000);
  await expect.poll(() => tilt(page)).toBeLessThan(.01);
  await expect(wall).toHaveAttribute("data-gone", "false");
});

test("scrolling past the wall reveals the booth, and only a new gesture walks in", async ({ page }) => {
  await page.goto("./");
  const wall = page.locator(".marvel");
  await expect(wall).toHaveAttribute("data-gone", "false");
  // One long gesture: it keeps going (trackpad momentum) for a second after the
  // booth has appeared, and none of that is passed on to the booth.
  const longestGap = await page.evaluate(() => new Promise<number>(resolve => {
    let goneAt = 0, last = performance.now(), longest = 0;
    const timer = setInterval(() => {
      longest = Math.max(longest, performance.now() - last);
      last = performance.now();
      document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: 150, bubbles: true, cancelable: true }));
      const gone = document.querySelector<HTMLElement>(".marvel")!.dataset.gone === "true";
      if (gone && !goneAt) goneAt = performance.now();
      if (goneAt && performance.now() - goneAt > 1000) { clearInterval(timer); resolve(longest); }
    }, 80);
  }));
  await expect(wall).toHaveAttribute("data-gone", "true");
  await expect(wall).toBeHidden();
  test.skip(longestGap > 300, "This machine stalled long enough to split the simulated gesture in two.");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "true");
  await page.waitForTimeout(800);
  await wheel(page, 300);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false", { timeout: 60000 });
});

test("scrolling up in front of the booth brings the wall back", async ({ page }) => {
  await page.goto("./");
  const wall = page.locator(".marvel");
  await expect(wall).toHaveAttribute("data-gone", "false");
  await wheel(page, 4000);
  await expect(wall).toHaveAttribute("data-gone", "true");
  await page.waitForTimeout(800);
  await wheel(page, -600);
  await expect(wall).toHaveAttribute("data-gone", "false");
  await expect.poll(() => progress(page)).toBeLessThan(.9);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("the keyboard scrolls through the wall", async ({ page }) => {
  await page.goto("./");
  const wall = page.locator(".marvel");
  await expect(wall).toHaveAttribute("data-gone", "false");
  for (let press = 0; press < 8; press++) await page.keyboard.press("PageDown");
  await expect(wall).toHaveAttribute("data-gone", "true");
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("direct links into the booth skip the wall", async ({ page }) => {
  await page.goto("./#work");
  await expect(page.locator(".marvel")).toHaveAttribute("data-gone", "true");
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
});
