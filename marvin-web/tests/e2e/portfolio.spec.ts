import { test, expect } from "@playwright/test";

test("header links open the matching page of the portfolio", async ({ page, isMobile }) => {
  test.skip(isMobile, "The text links are hidden on phones; the tabs and Our work remain.");
  await page.goto("./");
  await page.getByRole("link", { name: "Our work" }).click();
  await expect(page.getByRole("tab", { name: "The portraits" })).toBeFocused();
  await page.getByRole("link", { name: "The experience" }).click();
  await expect(page.getByRole("tab", { name: "The experience" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("link", { name: "Say hello" }).first().click();
  await expect(page.getByRole("tab", { name: /Say hello/ })).toHaveAttribute("aria-selected", "true");
});

test("portfolio shows photos, video and a 3D booth, and slides between events", async ({ page }) => {
  await page.goto("./#work");
  const group = page.getByRole("group", { name: "How to view this collection" });
  await expect(group.getByRole("button", { name: "Photos" })).toHaveAttribute("aria-pressed", "true");
  const first = await page.locator(".portfolio-copy h2").textContent();
  await page.getByRole("button", { name: "Next collection" }).click();
  await expect(page.locator(".portfolio-copy h2")).not.toHaveText(first!);
  await page.getByRole("button", { name: "Show The Classics" }).click();
  await expect(page.locator(".portfolio-copy h2")).toHaveText(first!);
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
