import { test, expect, type Page } from "@playwright/test";

// The header no longer has links; open a part of the page the way a link would.
async function openSection(page: Page, hash: string) {
  await page.evaluate(target => { history.pushState(null, "", target); dispatchEvent(new HashChangeEvent("hashchange")); }, hash);
}

test("the header shows the logo and the tagline, and #hello opens the booking section", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator(".site-header")).toContainText("Romanticizing moments through our lens");
  await expect(page.locator(".site-header nav")).toHaveCount(0);
  await openSection(page, "#hello");
  await expect(page.getByRole("heading", { name: /Book for an event/ })).toBeFocused();
});

test("each event has photos, video and a 3D booth, and slides left and right", async ({ page }) => {
  await page.goto("./#work");
  const group = page.getByRole("group", { name: "How to view this event" });
  await expect(group.getByRole("button", { name: "Photos" })).toHaveAttribute("aria-pressed", "true");
  const title = page.locator(".event-title");
  await expect(title).toHaveText("IKEA");
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(title).toHaveText("Wedding");
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(title).toHaveText("IKEA");
  await page.getByRole("button", { name: "Previous event" }).click();
  await expect(title).toHaveText("Wedding");
  await group.getByRole("button", { name: "Video" }).click();
  const video = page.locator("video.showcase-video");
  await expect(video).toBeVisible();
  // The clips are upright (9:16): the player takes their shape.
  await expect(video).toHaveAttribute("poster", /videos\/wedding\.webp$/);
  const frame = (await video.boundingBox())!;
  expect(frame.height / frame.width).toBeCloseTo(16 / 9, 1);
  await group.getByRole("button", { name: "3D model" }).click();
  // Software-only browsers may have no WebGL: then the viewer shows a poster and a notice.
  const viewer = page.locator(".model-viewer");
  await expect(viewer).not.toHaveAttribute("data-state", "loading", { timeout: 60000 });
  if ((await viewer.getAttribute("data-state")) === "ready") {
    await expect(page.getByRole("button", { name: "Open the curtain" })).toBeVisible();
    // Every event's models turn on their own until touched, then stay put.
    const canvas = viewer.locator(".model-canvas");
    for (const name of ["Wedding", "IKEA"]) {
      if (name === "IKEA") await page.getByRole("button", { name: "Next event" }).click();
      await expect(title).toHaveText(name);
      await expect(viewer).toHaveAttribute("data-state", "ready", { timeout: 60000 });
      await expect(canvas).toHaveAttribute("data-turntable", "on", { timeout: 60000 });
      const start = Number(await canvas.getAttribute("data-yaw"));
      await expect.poll(async () => Number(await canvas.getAttribute("data-yaw")), { timeout: 60000 }).toBeGreaterThan(start);
    }
    // IKEA's own printed booth has its door printed on: no curtain to open.
    await expect(page.getByRole("button", { name: "Open the curtain" })).toHaveCount(0);
    await page.getByRole("button", { name: "Turn the booth left" }).click();
    await expect(canvas).toHaveAttribute("data-turntable", "off");
  } else {
    await expect(viewer.getByRole("status")).toContainText("isn’t available");
  }
});

test("the selfie flashes, prints a polaroid out of the console's slot, and it can be put away", async ({ page }) => {
  // Like the entrance, the selfie effects play even when the OS asks for reduced motion.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#work");
  const papers = page.locator(".console .paper-feed .paper");
  await expect(papers).toHaveCount(0);
  await page.getByRole("button", { name: "Take a selfie" }).click();
  await expect(page.locator(".camera-flash")).toHaveCount(1);
  await expect(papers).toHaveCount(1);
  // It comes out of the slot (or, on a slow machine, may already be leaving).
  expect(await papers.first().evaluate(paper => getComputedStyle(paper).animationName)).toMatch(/polaroid-(eject|toss)/);
  await expect(papers.locator(".paper-photo img")).toHaveAttribute("src", /selfies\/selfie-01\.webp$/);
  await expect(papers.locator(".paper-logo")).toHaveAttribute("src", /marvin-logo-studio\.png$/);
  // The polaroid hangs from the slot line, below it.
  const slot = await page.locator(".slot-line").boundingBox();
  const hanging = await papers.first().boundingBox().catch(() => null);
  if (hanging) expect(hanging.y + hanging.height).toBeGreaterThan(slot!.y + slot!.height);
  // It leaves by itself: three seconds after it is out it flips and spins away.
  await expect(papers.first()).toHaveAttribute("data-closing", "true", { timeout: 15000 });
  await expect(papers).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByRole("button", { name: "Put the photo away" })).toHaveCount(0);
  // A new selfie sends the previous print off.
  await page.getByRole("button", { name: "Take a selfie" }).click();
  await expect(papers).toHaveCount(1);
  await page.getByRole("button", { name: "Take a selfie" }).click();
  await expect(papers.first()).toHaveAttribute("data-closing", "true");
});

test("only the closing section follows the booth wall", async ({ page }) => {
  await page.goto("./#work");
  await expect(page.locator(".after > section")).toHaveCount(1);
  await expect(page.locator("#experience")).toHaveCount(0);
});

test("scrolling down the booth wall reaches the booking section with social links", async ({ page }) => {
  await page.goto("./#work");
  await page.locator("#hello").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: /Book for an event/ })).toBeInViewport();
  await expect(page.locator(".console-text")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Book for an event/ })).toHaveAttribute("href", /wa\.me\/6282322220007/);
  await expect(page.getByRole("link", { name: "Marvin on Instagram" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Marvin on TikTok" })).toHaveAttribute("href", "https://www.tiktok.com/@marvinstudio.id");
  await expect(page.getByRole("link", { name: "Marvin on Instagram" })).toHaveAttribute("href", "https://www.instagram.com/marvinstudio_id/");
  await expect(page.getByRole("link", { name: /Take another look/ })).toHaveCount(0);
  await expect(page.getByText("THE MARVIN PHOTO CONCEPT")).toHaveCount(0);
});

test("the photos turn round: arrows, keys and dragging bring another photo to the front", async ({ page, isMobile }) => {
  await page.goto("./#work");
  const front = () => page.locator('.ring .print[data-front="true"] > img').getAttribute("src");
  const first = await front();
  if (!isMobile) {
    await page.getByRole("button", { name: "Next photo" }).click();
    await expect.poll(front).not.toBe(first);
    await page.getByRole("button", { name: "Previous photo" }).click();
    await expect.poll(front).toBe(first);
  }
  await page.locator(".gallery").focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(front).not.toBe(first);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(front).toBe(first);
  // Drag the ring sideways.
  const box = (await page.locator(".gallery").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - box.width * .3, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(front).not.toBe(first);
  // Changing event keeps the photos on the ring, now the new event's.
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(page.locator(".event-title")).not.toHaveText("IKEA");
  await expect(page.locator(".ring .print")).toHaveCount(10);
});

test("every screen gets the laptop's monitor: same layout, settled as a flat page", async ({ page }) => {
  await page.goto("./#work");
  const screen = page.locator(".monitor-screen");
  await expect(page.locator(".room")).toHaveAttribute("data-facing", "monitor");
  // No 3D once settled: the wall is an ordinary page that phones scroll smoothly.
  expect(await page.locator(".room").evaluate(element => getComputedStyle(element).transform)).toBe("none");
  const box = await screen.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  // Title top left, logo top right, the photo arrows either side, the event dots
  // in the bottom right corner, the console under the screen.
  const title = (await page.locator(".event-title").boundingBox())!;
  const logo = (await page.locator(".screen-logo").boundingBox())!;
  expect(logo.x).toBeGreaterThan(title.x + title.width);
  await expect(page.getByRole("button", { name: "Previous photo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next photo" })).toBeVisible();
  const dots = (await page.locator(".showcase-dots").boundingBox())!;
  expect(dots.x + dots.width).toBeGreaterThan(box!.x + box!.width * .8);
  expect(dots.y + dots.height).toBeGreaterThan(box!.y + box!.height * .8);
  // The words of the hint (its box spans the stage) stay clear of the dots.
  const hint = await page.locator(".ring-hint").evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const { x, y, width, height } = range.getBoundingClientRect();
    return { x, y, width, height };
  });
  expect(hint.y + hint.height <= dots.y || hint.x + hint.width <= dots.x).toBe(true);
  const console = (await page.locator(".console").boundingBox())!;
  expect(console.y).toBeGreaterThan(box!.y + box!.height);
  expect(console.y + console.height).toBeLessThanOrEqual(viewport.height);
});

test("Book a session sends the order to WhatsApp", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => {
    const opened: string[] = [];
    (window as unknown as { opened: string[] }).opened = opened;
    window.open = (url?: string | URL) => { opened.push(String(url)); return null; };
  });
  await page.evaluate(() => { location.hash = "#hello"; });
  await page.locator(".closing-session button").click();
  const dialog = page.getByRole("dialog", { name: /Book a session/ });
  await expect(dialog).toBeVisible();
  expect(page.url()).toContain("?book");
  await expect(dialog.locator(".booking-total dd")).toContainText("Rp 88.000");
  await dialog.getByRole("radio", { name: "3 strips" }).check({ force: true });
  await dialog.getByRole("checkbox", { name: /All your photos/ }).check({ force: true });
  await expect(dialog.locator(".booking-total dd")).toContainText("Rp 107.000");
  await expect(dialog.locator(".booking-total dd")).toContainText("2 extra strips");
  // The name is required before anything is sent.
  await dialog.getByRole("button", { name: /Book and pay/ }).click();
  expect(await page.evaluate(() => (window as unknown as { opened: string[] }).opened.length)).toBe(0);
  await dialog.getByRole("textbox", { name: /Your name/ }).fill("Karen");
  await dialog.getByRole("switch", { name: /at the booth now/ }).check({ force: true });
  await dialog.getByRole("button", { name: /Book and pay/ }).click();
  const [link] = await page.evaluate(() => (window as unknown as { opened: string[] }).opened);
  expect(link).toMatch(/^https:\/\/wa\.me\/6282322220007\?text=/);
  const message = decodeURIComponent(link.split("text=")[1]);
  expect(message).toContain("Nama: Karen");
  expect(message).toContain("Jumlah strip: 3");
  expect(message).toContain("All your photos (+Rp 19.000): ya");
  expect(message).toContain("Total: Rp 107.000 + 2 strip tambahan");
  expect(message).toContain("Saya sudah di booth sekarang.");
  await dialog.getByRole("button", { name: "Close booking" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/\?book/);
});

test("a link ending in ?book opens the booking form straight away", async ({ page }) => {
  await page.goto("./?book");
  await expect(page.getByRole("dialog", { name: /Book a session/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Book a session/ })).toBeHidden();
  await page.goto("./#hello");
  await page.locator(".closing-session button").click();
  await expect(page.getByRole("dialog", { name: /Book a session/ })).toBeVisible();
});
