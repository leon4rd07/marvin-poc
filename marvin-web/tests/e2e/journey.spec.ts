import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The header no longer has links; open a part of the page the way a link would.
async function openSection(page: Page, hash: string) {
  await page.evaluate(target => { history.pushState(null, "", target); dispatchEvent(new HashChangeEvent("hashchange")); }, hash);
}
test("long content and enlarged text remain reachable at 320 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("./#work");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(".site-header").evaluate(header => {
    const brand = header.querySelector(".wordmark")!.getBoundingClientRect();
    const tagline = header.querySelector(".header-note")!.getBoundingClientRect();
    return brand.right + 8 <= tagline.left;
  })).toBe(true);
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(page.locator(".event-title")).toHaveText("Wedding");
  await page.locator(".closing-book").first().scrollIntoViewIfNeeded();
  await expect(page.locator(".closing-book").first()).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("event selection survives navigation and the header links focus the matching section", async ({ page, isMobile }) => {
  await page.goto("./#work");
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(page.locator(".event-title")).toHaveText("Wedding");
  if (!isMobile) {
    await openSection(page, "#hello");
    await expect(page.getByRole("heading", { name: /Book for an event/ })).toBeFocused();
  }
  await openSection(page, "#work");
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  await expect(page.locator(".event-title")).toHaveText("Wedding");
  await page.getByRole("link", { name: "Marvin Studio home" }).click();
  await page.goBack();
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
  await page.goForward();
  await expect(page.locator("#work")).toHaveAttribute("inert", "");
});
test("motion preference changes preserve focus and scroll position", async ({ page }) => {
  await page.goto("./#work");
  const views = page.getByRole("button", { name: "3D model" });
  await views.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(views).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(views).toBeFocused();
});

test("resize preserves portfolio reading offset", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto("./#work");
  // Inside the booth the wall scrolls in its own frame (the window stays put).
  const readingOffset = () => page.evaluate(() => document.querySelector<HTMLElement>("#work")!.scrollTop);
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 180);
  await expect.poll(readingOffset).toBeGreaterThan(150);
  const before = await readingOffset();
  await page.setViewportSize({ width: 390, height: 620 });
  await expect.poll(readingOffset).toBeGreaterThan(before - 5);
});
test("entrance animation plays even when the OS requests reduced motion", async ({ page, browserName }) => {
  test.skip(browserName === "firefox", "Headless Firefox has no GPU rendering; the 3D entrance is reviewed in Chrome and Safari.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator(".booth-renderer")).toHaveAttribute("data-renderer", "ready", { timeout: 60000 });
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 1200);
  // A timed walk-through, not an instant jump: the page is still mid-transition shortly after the gesture.
  await page.waitForTimeout(400);
  expect(await page.locator("#work").getAttribute("aria-hidden")).toBe("true");
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false", { timeout: 60000 });
});
test("clean opening, shortcut, events, views, home and history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator("#work")).toHaveAttribute("inert", "");
  await expect(page.locator(".booth-renderer")).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
  await openSection(page, "#work");
  const first = page.getByRole("button", { name: "Photos" });
  await expect(first).toBeFocused();
  // Let the turn towards the monitor finish before using it.
  await expect(page.locator(".room")).toHaveAttribute("data-facing", "monitor");
  await expect(page.locator(".event-title")).toHaveText("IKEA");
  await page.getByRole("button", { name: "Previous event" }).click();
  await expect(page.locator(".event-title")).toHaveText("Wedding");
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(page.locator(".event-title")).toHaveText("IKEA");
  await page.getByRole("button", { name: "Show Wedding" }).click();
  await expect(page.locator(".event-title")).toHaveText("Wedding");
  await page.getByRole("button", { name: "Video" }).click();
  await expect(page.locator("video.showcase-video")).toBeVisible();
  await first.click();
  await expect(page.locator(".print > img")).toHaveCount(10);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: "Marvin Studio home" }).click();
  await expect(page.locator("#work")).toHaveAttribute("inert", "");
  await page.goBack();
  await expect(first).toBeFocused();
  await page.reload();
  await expect(first).toBeFocused();
  expect(errors).toEqual([]);
});
test("one wheel gesture opens and zooms into the portfolio, and one reverses home", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "firefox", "Headless Firefox has no GPU rendering; the 3D entrance is reviewed in Chrome and Safari.");
  await page.goto("./");
  const scene = page.locator(".booth-renderer");
  await expect(scene).toHaveAttribute("data-renderer", "ready", { timeout: 60000 });
  const initialCamera = await scene.getAttribute("data-camera");
  await page.mouse.move(180, 400);
  const started = Date.now();
  await page.mouse.wheel(0, 1200);
  await expect.poll(async () => {
    const opening = Number(await scene.getAttribute("data-curtain"));
    return opening > .02 && opening < 1 && await scene.getAttribute("data-camera") !== initialCamera;
  }).toBe(true);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
  expect(Date.now() - started).toBeGreaterThanOrEqual(3300);
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  await openSection(page, "#work");
  await page.mouse.move(180, 400);
  // Scrolling up inside does nothing; the EXIT sign walks you back out.
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(400);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
  await page.getByRole("button", { name: "Exit the booth" }).click();
  await expect(
    page.getByRole("link", { name: "Marvin Studio home" }),
  ).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await openSection(page, "#work");
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
});

test("PageDown runs the same single entrance transition", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Marvin Studio home" }).focus();
  await page.keyboard.press("PageDown");
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
});

test("one touch swipe reaches the portfolio", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium" || test.info().project.name !== "mobile", "Touch input is exercised in mobile Chromium.");
  await page.goto("./");
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 180, y: 540 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: 220 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
    await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  } finally { await session.detach(); }
});
test("on a phone, scrolling inside the booth never walks you back out", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium" || test.info().project.name !== "mobile", "Touch input is exercised in mobile Chromium.");
  await page.goto("./");
  const session = await page.context().newCDPSession(page);
  const swipe = async (from: number, to: number) => {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 180, y: from }] });
    for (let step = 1; step <= 5; step++)
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: from + (to - from) * step / 5 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  try {
    await swipe(540, 220);
    await expect(page.locator(".room")).toHaveAttribute("data-facing", "monitor");
    await expect(page.locator("html")).toHaveAttribute("data-locked", "true");
    // A phone's address bar hiding makes the window taller, which can pull the
    // window's own scroll position up a little. That must not count as leaving.
    await page.evaluate(() => window.scrollBy(0, -120));
    await swipe(600, 250);
    await swipe(250, 600);
    await page.waitForTimeout(1200);
    await expect(page.locator("html")).toHaveAttribute("data-locked", "true");
    await expect(page.locator("#work")).toHaveAttribute("data-turned", "true");
    await expect(page.locator(".room")).toHaveAttribute("data-facing", "monitor");
  } finally { await session.detach(); }
});
test("on a phone, a walk-in that lands a fraction of a pixel short still arrives inside", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium" || test.info().project.name !== "mobile", "Touch input is exercised in mobile Chromium.");
  // Phones snap scroll positions to device pixels, so asking for the end of the
  // walk-in can land just short of it. That must still count as inside.
  await page.addInitScript(() => {
    const scrollTo = window.scrollTo.bind(window);
    window.scrollTo = ((options: ScrollToOptions) =>
      scrollTo(typeof options === "object" && (options.top ?? 0) > 100 ? { ...options, top: (options.top ?? 0) - .6 } : options)) as typeof window.scrollTo;
  });
  await page.goto("./");
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 180, y: 540 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: 220 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator("html")).toHaveAttribute("data-locked", "true");
    await expect(page.locator("html")).toHaveAttribute("data-portal", "off");
    await expect(page.locator(".room")).toHaveAttribute("data-facing", "monitor");
  } finally { await session.detach(); }
});
test("reduced motion, resize, failed images and reflow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/portfolio/events/*", (route) => route.abort());
  await page.goto("./#work");
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  await expect(page.locator(".image-fallback")).toHaveCount(11);
  await expect(page.locator("video")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(
    page.getByRole("button", { name: "Next event" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Photos" })).toBeVisible();
});

test("inside the booth the page is steady: scrolling up never moves it, the booking section is below", async ({ page, isMobile, browserName }) => {
  test.skip(isMobile || browserName !== "chromium", "Wheel physics differ per engine; the behaviour is exercised with desktop Chrome's wheel.");
  await page.goto("./#work");
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  const top = await page.evaluate(() => scrollY);
  const wall = page.locator("#work");
  await page.mouse.move(700, 500);
  // Up at the monitor: nothing moves at all.
  for (let step = 0; step < 10; step++) { await page.mouse.wheel(0, -300); await page.waitForTimeout(30); }
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => scrollY)).toBe(top);
  expect(await wall.evaluate(element => element.scrollTop)).toBe(0);
  // Down to the booking section and back up to the monitor, and no further.
  for (let step = 0; step < 8; step++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(30); }
  await expect.poll(() => wall.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
  for (let step = 0; step < 30; step++) { await page.mouse.wheel(0, -300); await page.waitForTimeout(20); }
  await expect.poll(() => wall.evaluate(element => element.scrollTop)).toBe(0);
  expect(await page.evaluate(() => scrollY)).toBe(top);
  await expect(wall).toHaveAttribute("aria-hidden", "false");
  await page.getByRole("button", { name: "Exit the booth" }).click();
  await expect(wall).toHaveAttribute("aria-hidden", "true");
});

test("a light touch in front of the booth only nudges the camera and drifts back; one wheel notch walks in", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || isMobile, "Wheel input with the 3D scene is exercised in desktop Chrome.");
  await page.goto("./");
  await expect(page.locator(".booth-renderer")).toHaveAttribute("data-renderer", "ready", { timeout: 60000 });
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 25);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => scrollY), { timeout: 30000 }).toBe(0);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "true");
  await page.mouse.wheel(0, 100);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false", { timeout: 60000 });
});

test("inside the booth scrolling up never leaves; the EXIT sign is always there and does", async ({ page, isMobile, browserName }) => {
  test.skip(isMobile || browserName !== "chromium", "Wheel physics differ per engine; the behaviour is exercised with desktop Chrome's wheel.");
  await page.goto("./#work");
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  const exit = page.getByRole("button", { name: "Exit the booth" });
  await expect(exit).toBeVisible();
  await page.mouse.move(700, 500);
  for (let step = 0; step < 12; step++) { await page.mouse.wheel(0, -200); await page.waitForTimeout(30); }
  await page.keyboard.press("PageUp");
  // Even scrolling the page straight to the top (scrollbar, momentum) is undone.
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(800);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
  await expect(exit).toBeVisible();
  await exit.click();
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "true");
});
