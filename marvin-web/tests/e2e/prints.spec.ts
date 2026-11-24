import { test, expect, type Page } from "@playwright/test";

// The site opens straight on the photobooth (a big "Scroll" button walks in); under
// the monitor, Marvin's prints stand on slowly turning displays (PrintsShowcase);
// "Book an event" in the header goes through the booth to the booking section.

// Inside the booth, scrolled down to the prints, with their models drawn.
async function openPrints(page: Page) {
  await page.goto("./#work");
  await page.locator(".work-scene").evaluate(element => { element.scrollTop = innerHeight; });
  const stage = page.locator("#prints .product-stage");
  await expect(stage).toHaveAttribute("data-state", "ready", { timeout: 60000 });
  return stage;
}

test("the site opens straight on the photobooth, with a big Scroll button that walks in", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator(".product-intro")).toHaveCount(0);
  await expect(page.locator(".stage")).toHaveAttribute("data-phase", "booth");
  const scroll = page.getByRole("button", { name: "Walk into the booth" });
  await expect(scroll).toBeVisible();
  // Big enough to see and to tap.
  const pill = (await scroll.boundingBox())!;
  expect(pill.height).toBeGreaterThanOrEqual(56);
  expect(pill.width).toBeGreaterThanOrEqual(160);
  expect(await scroll.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
  await scroll.click();
  await expect(page.locator("#work")).toHaveAttribute("data-active", "true", { timeout: 20000 });
});

test("Book an event in the header goes through the booth first, then down to booking", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Book an event" }).click();
  // The walk in plays (it never jumps straight there)…
  await expect(page.locator(".stage")).toHaveAttribute("data-phase", /entering|monitor/);
  await expect(page.locator("#work")).toHaveAttribute("data-turned", "true", { timeout: 20000 });
  // …then it glides down past the prints to "Book for an event".
  await expect(page.locator("#closing-title")).toBeFocused({ timeout: 15000 });
  await expect.poll(() => page.locator("#hello").evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.top < innerHeight && box.bottom > 0;
  }), { timeout: 10000 }).toBe(true);
  // Inside the booth it simply goes down again.
  await page.locator(".work-scene").evaluate(element => { element.scrollTop = 0; });
  await page.getByRole("button", { name: "Book an event" }).click();
  await expect.poll(() => page.locator(".work-scene").evaluate(element => element.scrollTop), { timeout: 10000 }).toBeGreaterThan(200);
});

test("under the monitor, the prints come in before the booking section", async ({ page }) => {
  await page.goto("./#work");
  const prints = page.locator("#prints");
  await expect(prints).toHaveCount(1);
  expect(await page.evaluate(() => {
    const prints = document.querySelector("#prints")!, hello = document.querySelector("#hello")!;
    return Boolean(prints.compareDocumentPosition(hello) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  // The models load once it is near, and it rises in with the scroll.
  await page.locator(".work-scene").evaluate(element => { element.scrollTop = innerHeight * .4; });
  await expect(prints.locator(".product-stage")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
  const entered = () => prints.evaluate(element => Number(element.style.getPropertyValue("--enter")));
  const partly = await entered();
  expect(partly).toBeGreaterThan(0);
  expect(partly).toBeLessThan(1);
  await page.locator(".work-scene").evaluate(element => { element.scrollTop = innerHeight; });
  await expect.poll(entered).toBe(1);
  await expect(prints.locator(".product-name")).toHaveText(/^(4R|XL Strip|Mini Tote)$/);
});

test("the prints keep turning slowly; the arrow keys and a drag turn them by hand", async ({ page }) => {
  const stage = await openPrints(page);
  await expect(stage.locator("canvas.product-canvas")).toHaveCount(1);
  const name = page.locator("#prints .product-name");
  // The name sits above the models.
  const caption = (await page.locator("#prints .product-caption").boundingBox())!;
  const box = (await stage.boundingBox())!;
  expect(caption.y + caption.height).toBeLessThanOrEqual(box.y + 1);
  // It keeps turning, slowly and smoothly: no jumps from one print to the next.
  const angle = async () => Number(await stage.getAttribute("data-angle"));
  const angles: number[] = [];
  for (let i = 0; i < 4; i++) {
    angles.push(await angle());
    await page.waitForTimeout(900);
  }
  for (let i = 1; i < angles.length; i++) {
    expect(angles[i]).toBeLessThanOrEqual(angles[i - 1]);
    expect(angles[i - 1] - angles[i]).toBeLessThan(25);
  }
  expect(angles[angles.length - 1]).toBeLessThan(angles[0]);
  // No dots: the arrow keys bring a print round to the front.
  await expect(page.locator("#prints .event-dot")).toHaveCount(0);
  await stage.focus();
  for (let k = 0; k < 4 && (await name.textContent()) !== "Mini Tote"; k++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1500);
  }
  await expect(name).toHaveText("Mini Tote");
  await expect(stage).toHaveAttribute("data-front", "tote");
  await expect(page.locator("#prints .product-detail")).toHaveText("25 × 20 cm");
  // Dragging sideways turns it by hand.
  const before = await angle();
  await page.mouse.move(box.x + box.width * .7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height / 2, { steps: 6 });
  await page.mouse.move(box.x + box.width * .3, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(angle).toBeLessThan(before - 40);
});
