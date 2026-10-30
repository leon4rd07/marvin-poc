import { test, expect } from "@playwright/test";

test("header links open the matching part of the portfolio", async ({ page, isMobile }) => {
  test.skip(isMobile, "The text links are hidden on phones; Our work remains.");
  await page.goto("./");
  await page.getByRole("link", { name: "Our work" }).click();
  await expect(page.getByRole("button", { name: "Photos" })).toBeFocused();
  await page.getByRole("link", { name: "Say hello" }).click();
  await expect(page.getByRole("heading", { name: /Some moments deserve/ })).toBeFocused();
});

test("each event has photos, video and a 3D booth, and slides left and right", async ({ page }) => {
  await page.goto("./#work");
  const group = page.getByRole("group", { name: "How to view this event" });
  await expect(group.getByRole("button", { name: "Photos" })).toHaveAttribute("aria-pressed", "true");
  const title = page.locator(".event-title");
  await expect(title).toHaveText("IKEA");
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(title).toHaveText("Padel Night");
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(title).toHaveText("Wedding");
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(title).toHaveText("IKEA");
  await page.getByRole("button", { name: "Previous event" }).click();
  await expect(title).toHaveText("Wedding");
  await group.getByRole("button", { name: "Video" }).click();
  await expect(page.locator("video.showcase-video")).toBeVisible();
  await group.getByRole("button", { name: "3D model" }).click();
  // Software-only browsers may have no WebGL: then the viewer shows a poster and a notice.
  const viewer = page.locator(".model-viewer");
  await expect(viewer).not.toHaveAttribute("data-state", "loading", { timeout: 60000 });
  if ((await viewer.getAttribute("data-state")) === "ready") {
    await expect(page.getByRole("button", { name: "Open the curtain" })).toBeVisible();
  } else {
    await expect(viewer.getByRole("status")).toContainText("isn’t available");
  }
});

test("the selfie button prints a photo out of the console's slot", async ({ page }) => {
  await page.goto("./#work");
  const papers = page.locator(".console .paper-feed .paper");
  await expect(papers).toHaveCount(0);
  await page.getByRole("button", { name: "Selfie" }).click();
  await expect(papers).toHaveCount(1);
  await expect(papers.locator("img")).toBeVisible();
  // The paper hangs from the slot line, below it.
  const slot = await page.locator(".slot-line").boundingBox();
  await expect.poll(async () => (await papers.first().boundingBox())!.y + (await papers.first().boundingBox())!.height)
    .toBeGreaterThan(slot!.y + slot!.height + 20);
  await page.getByRole("button", { name: "Selfie" }).click();
  // The new print replaces the old one, which drops away.
  await expect(papers).toHaveCount(2);
  await page.getByRole("button", { name: "Selfie" }).click();
  await expect(papers).toHaveCount(2);
});

test("only the closing section follows the booth wall", async ({ page }) => {
  await page.goto("./#work");
  await expect(page.locator(".after > section")).toHaveCount(1);
  await expect(page.locator("#experience")).toHaveCount(0);
});

test("scrolling down the booth wall reaches the closing section", async ({ page }) => {
  await page.goto("./#work");
  await page.locator("#hello").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: /Some moments deserve/ })).toBeInViewport();
  await expect(page.getByRole("link", { name: /Take another look/ })).toBeVisible();
});
