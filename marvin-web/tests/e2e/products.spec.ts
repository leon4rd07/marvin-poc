import { test, expect, type Page } from "@playwright/test";

// The opening slide (ProductIntro): Marvin's prints on a ring; scrolling down
// slides it away to the booth, a deliberate scroll up in front of the booth brings it back.
const wheel = (page: Page, deltaY: number) => page.evaluate(delta => {
  document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: delta, bubbles: true, cancelable: true }));
}, deltaY);
const intro = (page: Page) => page.locator(".product-intro");
// The slide is listening once it has painted its position.
const ready = (page: Page) => expect(intro(page)).toHaveAttribute("data-position", /\d/);

test("the site opens on the prints: 4R, XL strip and mini tote on a ring that turns", async ({ page }) => {
  await page.goto("./");
  await expect(intro(page)).toHaveAttribute("data-away", "false");
  const prints = page.locator(".product-gallery .print");
  await expect(prints).toHaveCount(3);
  await expect.poll(() => prints.locator("img:not(.print-logo)").evaluateAll(images =>
    images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)), { timeout: 20000 }).toBe(true);
  const name = page.locator(".product-name");
  // It turns on its own until touched.
  await expect(name).toHaveText("XL Strip", { timeout: 10000 });
  await page.getByRole("button", { name: "Next product" }).click();
  await expect(name).toHaveText("Mini Tote");
  await expect(page.locator(".product-detail")).toHaveText("25 × 20 cm");
  await page.getByRole("button", { name: "Show 4R" }).click();
  await expect(name).toHaveText("4R");
  // Touched: it stays put now.
  await page.waitForTimeout(4000);
  await expect(name).toHaveText("4R");
  // The arrows sit above the cards.
  const arrow = page.getByRole("button", { name: "Next product" });
  const box = (await arrow.boundingBox())!;
  expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label"),
    [box.x + box.width / 2, box.y + box.height / 2])).toBe("Next product");
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
