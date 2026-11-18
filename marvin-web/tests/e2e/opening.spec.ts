import { test, expect, type Page } from "@playwright/test";

// The opening (OpeningIntro): a 3-2-1 countdown on a blank polaroid, the flash,
// the picture developing into the booth, then a push through its window. Software
// rendering can hold up the first seconds of a page load, so the waits are generous.
const wheel = (page: Page, deltaY: number) => page.evaluate(delta => {
  document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: delta, bubbles: true, cancelable: true }));
}, deltaY);

test("the site opens with a countdown on a polaroid, then lands on the booth with a scroll hint", async ({ page }) => {
  await page.goto("./");
  const opening = page.locator(".opening");
  await expect(opening).toBeVisible();
  await expect(page.locator(".opening-count")).toHaveText(/[123]/);
  await expect(page.locator(".opening-strip img")).toBeVisible();
  await expect(opening).toHaveAttribute("data-phase", /develop|zoom/, { timeout: 20000 });
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
  // Once it is running (and still counting down), one wheel tick sends it through quickly.
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

test("with reduced motion the opening only fades away", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Note every phase the opening goes through, from the very start of the page.
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { phases: string[] }).phases = seen;
    new MutationObserver(() => {
      const phase = document.querySelector(".opening")?.getAttribute("data-phase");
      if (phase && !seen.includes(phase)) seen.push(phase);
    }).observe(document, { subtree: true, attributes: true, childList: true });
  });
  await page.goto("./");
  await expect(page.locator(".opening")).toHaveCount(0, { timeout: 20000 });
  // No countdown, flash or zoom at all: it simply faded.
  expect(await page.evaluate(() => (window as unknown as { phases: string[] }).phases)).toEqual([]);
});
