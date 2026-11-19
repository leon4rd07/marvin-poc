import { test, expect, type Page } from "@playwright/test";

// The opening slide (ProductIntro): Marvin's prints on a ring; scrolling down
// slides it away to the booth, a deliberate scroll up in front of the booth brings it back.
const wheel = (page: Page, deltaY: number) => page.evaluate(delta => {
  document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: delta, bubbles: true, cancelable: true }));
}, deltaY);
const intro = (page: Page) => page.locator(".product-intro");
// The slide is listening once it has painted its position.
const ready = (page: Page) => expect(intro(page)).toHaveAttribute("data-position", /\d/);

test("the site opens on the prints: 4R, XL strip and mini tote, drawn on displays, on a ring that turns", async ({ page }) => {
  await page.goto("./");
  await expect(intro(page)).toHaveAttribute("data-away", "false");
  const items = page.locator(".product-gallery .product-item");
  await expect(items).toHaveCount(3);
  // Drawings, not photos: nothing to download, no print frame.
  await expect(items.locator("svg.product-art")).toHaveCount(3);
  await expect(page.locator(".product-intro img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next product" })).toHaveCount(0);
  const name = page.locator(".product-name");
  // The name sits above the ring.
  const caption = (await page.locator(".product-caption").boundingBox())!;
  const ring = (await page.locator(".product-gallery .ring").boundingBox())!;
  expect(caption.y + caption.height).toBeLessThanOrEqual(ring.y + 1);
  // It turns on its own while left alone.
  await expect(name).toHaveText("XL Strip", { timeout: 10000 });
  await page.getByRole("button", { name: "Show Mini Tote" }).click();
  await expect(name).toHaveText("Mini Tote");
  await expect(page.locator(".product-detail")).toHaveText("25 × 20 cm");
  // Touched: it waits a while, then carries on by itself.
  await page.waitForTimeout(3000);
  await expect(name).toHaveText("Mini Tote");
  await expect(name).toHaveText("4R", { timeout: 15000 });
});

test("scrolling down goes straight to the booth; a deliberate scroll up comes back", async ({ page }) => {
  await page.goto("./");
  await ready(page);
  await expect(intro(page)).toHaveAttribute("data-away", "false");
  await wheel(page, 120);
  await expect(intro(page)).toHaveAttribute("data-away", "true");
  await expect(intro(page)).toBeHidden();
  // In front of the booth, not walked in: the page has not moved.
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".stage")).toHaveAttribute("data-phase", "booth");
  await expect.poll(() => page.locator(".stage .scroll-cue").evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
  // A trackpad's last few pixels upwards do nothing; a real scroll up brings the prints back.
  await page.waitForTimeout(500);
  await wheel(page, -40);
  await page.waitForTimeout(400);
  await expect(intro(page)).toHaveAttribute("data-away", "true");
  await wheel(page, -300);
  await expect(intro(page)).toHaveAttribute("data-away", "false");
  // And scrolling on from the booth walks in.
  await wheel(page, 120);
  await expect(intro(page)).toHaveAttribute("data-away", "true");
  await page.waitForTimeout(600);
  await wheel(page, 300);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false", { timeout: 20000 });
});

test("the keyboard and the scroll hint also go on to the booth", async ({ page }) => {
  await page.goto("./");
  await ready(page);
  await page.keyboard.press("PageDown");
  await expect(intro(page)).toHaveAttribute("data-away", "true");
  await page.goto("./");
  await expect(intro(page)).toHaveAttribute("data-away", "false");
  await page.getByRole("button", { name: "Step inside the booth" }).click();
  await expect(intro(page)).toHaveAttribute("data-away", "true");
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("links straight into the booth, to booking, and ?intro=0 skip the prints", async ({ page }) => {
  for (const address of ["./#work", "./?book", "./?intro=0"]) {
    await page.goto(address);
    await expect(intro(page)).toHaveAttribute("data-away", "true");
    await expect(intro(page)).toBeHidden();
  }
});
