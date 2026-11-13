import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const base = process.argv[2] || "http://127.0.0.1:4176/";
const output = new URL(process.env.QA_REVIEW_DIR || "../../docs/qa/realism-2026-10-22/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || "chromium" });
const report = { date: new Date().toISOString(), base, browser: browser.version(), profiles: [] };
report.assets = await Promise.all((await fs.readdir(new URL("../dist/assets/", import.meta.url))).map(async name => ({
  name, sha256: createHash("sha256").update(await fs.readFile(new URL(`../dist/assets/${name}`, import.meta.url))).digest("hex"),
})));
try {
  for (const [width, height] of [[1440, 900], [1920, 1080], [390, 844], [360, 800], [320, 800], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [], violations = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const capture = name => page.screenshot({ path: fileURLToPath(new URL(`${width}-${name}.png`, output)) });
    await page.goto(`${base}?intro=0`);
    await expect(page.locator(".booth-renderer")).toHaveAttribute("data-renderer", "ready", { timeout: 15000 });
    await expect(page.locator(".booth-renderer")).toHaveAttribute("data-textures", "loaded", { timeout: 15000 });
    await page.waitForTimeout(250);
    await capture("hero");
    const range = await page.locator(".journey").evaluate(el => el.offsetHeight - document.querySelector(".stage").offsetHeight);
    if ([1440, 390].includes(width)) {
      for (const [p, name] of [[.31, "half-open-zoom"], [.62, "open-zoom"], [.69, "entry-dissolve"], [.78, "mid-dissolve"], [.9, "portfolio-dissolve"], [.95, "reveal"], [.31, "reverse-opening"], [0, "reverse-home"]]) {
        await page.evaluate(top => scrollTo(0, top), range * p);
        await page.waitForTimeout(180);
        await capture(name);
      }
    }
    await page.getByRole("link", { name: "Our work" }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    for (const tab of ["The portraits", "The experience", "Say hello"]) {
      await page.getByRole("tab", { name: tab }).click();
      await page.getByRole("link", { name: "Our work" }).click();
      await page.waitForTimeout(180);
      const name = tab === "Say hello" ? "hello" : tab === "The experience" ? "experience" : "work";
      await capture(name);
      if (tab === "The portraits") await page.locator("#work").screenshot({ path: fileURLToPath(new URL(`${width}-monitor.png`, output)) });
      violations.push(...(await new AxeBuilder({ page }).analyze()).violations);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    if ([1440, 390].includes(width)) {
      await page.getByRole("tab", { name: "The portraits" }).click();
      for (let index = 0; index < 3; index++) {
        await page.getByRole("button", { name: "Next collection" }).click();
        await page.waitForTimeout(220);
        await capture(`collection-${index}`);
      }
    }
    expect(errors).toEqual([]);
    expect(violations).toEqual([]);
    report.profiles.push({ width, height, dpr: 1, motion: "no-preference", network: "local unthrottled", errors, violations });
    await context.close();
  }
  const page = await browser.newPage({ viewport: { width: 320, height: 800 }, reducedMotion: "reduce" });
  await page.goto(`${base}#work`);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await page.getByRole("link", { name: "Our work" }).click();
  await page.screenshot({ path: fileURLToPath(new URL("320-text-200.png", output)) });
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  await page.route("**/portfolio/*", route => route.abort());
  await page.reload();
  await expect(page.locator(".image-fallback")).toHaveCount(3);
  await page.locator("#work").screenshot({ path: fileURLToPath(new URL("320-image-failure.png", output)) });
  await fs.writeFile(new URL("browser-results.json", output), JSON.stringify(report, null, 2));
  console.log(`Captured six viewport profiles and 3D forward/reverse checkpoints; no page errors or axe violations. View images before accepting.`);
} finally { await browser.close(); }
