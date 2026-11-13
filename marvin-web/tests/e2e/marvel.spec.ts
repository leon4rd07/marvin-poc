import { test, expect, type Page } from "@playwright/test";

// The opening wall keeps its own scroll position, so drive it with wheel events
// directly rather than through the machine's real scrolling.
const wheel = (page: Page, deltaY: number) => page.evaluate(delta => {
  document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: delta, bubbles: true, cancelable: true }));
}, deltaY);
const angle = (page: Page, axis: "X" | "Y") => page.locator(".drift-wall__plane").evaluate((element, name) =>
  Number(new RegExp(`rotate${name}\\(([-\\d.e]+)deg\\)`).exec((element as HTMLElement).style.transform)?.[1] ?? NaN), axis);
const progress = (page: Page) => page.locator(".marvel").evaluate(element => Number((element as HTMLElement).dataset.progress));
const tracks = (page: Page) => page.locator(".drift-wall__track").evaluateAll(elements =>
  elements.map(element => (element as HTMLElement).style.transform).join("|"));

test("the wall of pictures opens the site turned to one side and swings straight as it is scrolled", async ({ page }) => {
  await page.goto("./");
  const wall = page.locator(".marvel");
  await expect(wall).toHaveAttribute("data-gone", "false");
  await expect(page.locator(".drift-wall__tile img").first()).toBeVisible();
  await expect.poll(() => angle(page, "Y")).toBe(30);
  expect(await angle(page, "X")).toBe(0);
  // Every picture has loaded.
  await expect.poll(() => page.locator(".drift-wall__tile img").evaluateAll(images =>
    images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  // One mouse-wheel notch is a small part of the scene, and it glides rather than jumps.
  await wheel(page, 100);
  await expect.poll(() => progress(page)).toBeGreaterThan(0);
  expect(await progress(page)).toBeLessThan(.039);
  await expect.poll(() => progress(page)).toBeGreaterThan(.036);
  await page.waitForTimeout(500);
  expect(await progress(page)).toBeLessThan(.04);
  expect(await angle(page, "Y")).toBeGreaterThan(29);
  // The page itself has not moved: the booth still waits at its front.
  expect(await page.evaluate(() => scrollY)).toBe(0);
  // Scrolled as far as straight: the wall faces you and is still fully there.
  await wheel(page, 2000);
  await expect.poll(() => angle(page, "Y")).toBeLessThan(.01);
  expect(await angle(page, "X")).toBe(0);
  await expect(wall).toHaveAttribute("data-gone", "false");
});

test("the pictures stay where they are", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator(".marvel")).toHaveAttribute("data-gone", "false");
  await expect.poll(() => tracks(page)).toContain("translate3d");
  const before = await tracks(page);
  await page.waitForTimeout(1200);
  expect(await tracks(page)).toBe(before);
  await wheel(page, 800);
  await page.waitForTimeout(1200);
  expect(await tracks(page)).toBe(before);
});

test("scrolling on without a pause goes past the wall and into the booth", async ({ page }) => {
  await page.goto("./");
  const wall = page.locator(".marvel");
  await expect(wall).toHaveAttribute("data-gone", "false");
  // One uninterrupted scroll, a wheel event every 80ms, until the booth is entered.
  await page.evaluate(() => {
    const timer = setInterval(() => {
      document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true }));
      if (document.querySelector("#work")?.getAttribute("aria-hidden") === "false") clearInterval(timer);
    }, 80);
  });
  await expect(wall).toHaveAttribute("data-gone", "true", { timeout: 120000 });
  await expect(wall).toBeHidden();
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false", { timeout: 120000 });
});

test("only a deliberate upward scroll in front of the booth brings the wall back", async ({ page }) => {
  await page.goto("./");
  const wall = page.locator(".marvel");
  await expect(wall).toHaveAttribute("data-gone", "false");
  await wheel(page, 4000);
  await expect(wall).toHaveAttribute("data-gone", "true");
  await page.waitForTimeout(600);
  // The few pixels a trackpad gives back at the end of a gesture do nothing.
  await wheel(page, -30);
  await page.waitForTimeout(400);
  await expect(wall).toHaveAttribute("data-gone", "true");
  await wheel(page, -400);
  await expect(wall).toHaveAttribute("data-gone", "false");
  await expect.poll(() => progress(page)).toBeLessThan(.95);
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
