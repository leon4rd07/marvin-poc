import { test, expect, type Page } from "@playwright/test";

// The opening slide (ProductIntro): Marvin's prints as 3D models on a turning stand; scrolling down
// slides it away to the booth, a deliberate scroll up in front of the booth brings it back.
const wheel = (page: Page, deltaY: number) => page.evaluate(delta => {
  document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: delta, bubbles: true, cancelable: true }));
}, deltaY);
const intro = (page: Page) => page.locator(".product-intro");
// The slide is listening once it has painted its position.
const ready = (page: Page) => expect(intro(page)).toHaveAttribute("data-position", /\d/);

test("the site opens on the prints: 4R, XL strip and mini tote as 3D models on a slowly turning stand", async ({ page }) => {
  await page.goto("./");
  await expect(intro(page)).toHaveAttribute("data-away", "false");
  const stage = page.locator(".product-intro .product-stage");
  await expect(stage).toHaveAttribute("data-state", "ready", { timeout: 60000 });
  await expect(stage.locator("canvas.product-canvas")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Next product" })).toHaveCount(0);
  const name = page.locator(".product-intro .product-name");
  await expect(name).toHaveText(/^(4R|XL Strip|Mini Tote)$/);
  // The name sits above the models.
  const caption = (await page.locator(".product-intro .product-caption").boundingBox())!;
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
  // No dots: the arrow keys (or a drag) bring a print round to the front.
  await expect(page.locator(".product-intro .event-dot")).toHaveCount(0);
  await stage.focus();
  for (let k = 0; k < 4 && (await name.textContent()) !== "Mini Tote"; k++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1500);
  }
  await expect(name).toHaveText("Mini Tote");
  await expect(stage).toHaveAttribute("data-front", "tote");
  await expect(page.locator(".product-intro .product-detail")).toHaveText("25 × 20 cm");
  // Then, after a moment, it turns on by itself.
  await page.waitForTimeout(1500);
  const chosen = await angle();
  await expect.poll(angle, { timeout: 30000 }).toBeLessThan(chosen - 1);
});

test("the prints turn by hand: dragging sideways and the arrow keys", async ({ page }) => {
  await page.goto("./");
  const stage = page.locator(".product-intro .product-stage");
  await expect(stage).toHaveAttribute("data-state", "ready", { timeout: 60000 });
  await stage.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".product-intro .product-name")).toHaveText("XL Strip");
  const before = Number(await stage.getAttribute("data-angle"));
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * .7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height / 2, { steps: 6 });
  await page.mouse.move(box.x + box.width * .3, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Number(await stage.getAttribute("data-angle"))).toBeLessThan(before - 40);
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

test("the Scroll buttons are the same size and tapping them plays the move: away from the prints, then into the booth", async ({ page }) => {
  await page.goto("./");
  await ready(page);
  const introCue = page.locator(".product-scroll .scroll-cue-label");
  const size = (await introCue.boundingBox())!;
  await page.locator(".product-scroll").click();
  await expect(intro(page)).toHaveAttribute("data-away", "true");
  const boothCue = page.getByRole("button", { name: "Walk into the booth" });
  await expect(boothCue).toBeVisible();
  const boothSize = (await boothCue.locator(".scroll-cue-label").boundingBox())!;
  expect(Math.abs(boothSize.width - size.width)).toBeLessThan(1);
  expect(Math.abs(boothSize.height - size.height)).toBeLessThan(1);
  await page.waitForTimeout(400);
  await boothCue.click();
  await expect(page.locator("#work")).toHaveAttribute("data-active", "true", { timeout: 20000 });
});

test("Book an event in the header goes through the booth first, then down to booking", async ({ page }) => {
  await page.goto("./");
  await ready(page);
  await page.getByRole("button", { name: "Book an event" }).click();
  // The prints move away and the walk in plays (it never jumps straight there)…
  await expect(intro(page)).toHaveAttribute("data-away", "true");
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
  // Between the monitor and "Book for an event".
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
