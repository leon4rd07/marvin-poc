import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("long content and enlarged text remain reachable at 320 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("./#work");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(".site-header").evaluate(header => {
    const brand = header.querySelector(".wordmark")!.getBoundingClientRect();
    const navigation = header.querySelector("nav")!.getBoundingClientRect();
    return brand.right + 8 <= navigation.left;
  })).toBe(true);
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(page.locator(".event-title")).toHaveText("Padel Night");
  await page.locator(".experience-steps li").last().scrollIntoViewIfNeeded();
  await expect(page.locator(".experience-steps li").last()).toBeInViewport();
  await page.locator(".closing-note").scrollIntoViewIfNeeded();
  await expect(page.locator(".closing-note")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("event selection survives navigation and the header links focus the matching section", async ({ page, isMobile }) => {
  await page.goto("./#work");
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(page.locator(".event-title")).toHaveText("Padel Night");
  if (!isMobile) {
    await page.getByRole("link", { name: "The experience" }).click();
    await expect(page.getByRole("heading", { name: /Close the curtain/ })).toBeFocused();
    await page.getByRole("link", { name: "Say hello" }).click();
    await expect(page.getByRole("heading", { name: /Some moments deserve/ })).toBeFocused();
  }
  await page.getByRole("link", { name: "Our work" }).click();
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  await expect(page.locator(".event-title")).toHaveText("Padel Night");
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
  const readingOffset = () => page.evaluate(() => scrollY -
    (document.querySelector<HTMLElement>(".journey")!.offsetHeight -
      document.querySelector<HTMLElement>(".stage")!.offsetHeight));
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
  await page.mouse.wheel(0, 120);
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
  const shortcut = page.getByRole("link", { name: "Our work" });
  if (test.info().project.name === "mobile") await shortcut.tap();
  else await shortcut.click();
  const first = page.getByRole("button", { name: "Photos" });
  await expect(first).toBeFocused();
  await expect(page.locator(".event-title")).toHaveText("IKEA");
  await page.getByRole("button", { name: "Previous event" }).click();
  await expect(page.locator(".event-title")).toHaveText("Wedding");
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(page.locator(".event-title")).toHaveText("IKEA");
  await page.getByRole("button", { name: "Show Padel Night" }).click();
  await expect(page.locator(".event-title")).toHaveText("Padel Night");
  await page.getByRole("button", { name: "Video" }).click();
  await expect(page.locator("video.showcase-video")).toBeVisible();
  await first.click();
  await expect(page.locator(".prints img")).toHaveCount(3);
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
  await page.mouse.wheel(0, 120);
  await expect.poll(async () => {
    const opening = Number(await scene.getAttribute("data-curtain"));
    return opening > .02 && opening < 1 && await scene.getAttribute("data-camera") !== initialCamera;
  }).toBe(true);
  await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
  expect(Date.now() - started).toBeGreaterThanOrEqual(3300);
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  await page.getByRole("link", { name: "Our work" }).click();
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, -120);
  await expect(
    page.getByRole("link", { name: "Marvin Studio home" }),
  ).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole("link", { name: "Our work" }).click();
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
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: 400 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator("#work")).toHaveAttribute("aria-hidden", "false");
    await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  } finally { await session.detach(); }
});
test("reduced motion, resize, failed images and reflow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/portfolio/*", (route) => route.abort());
  await page.goto("./#work");
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  await expect(page.locator(".image-fallback")).toHaveCount(3);
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
