import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || "chromium" });
const base = process.argv[2] || "http://127.0.0.1:4173/";
const output = new URL(`../../docs/qa/${process.env.QA_REVIEW_DIR || "realism-2026-10-22"}/`, import.meta.url);
await fs.mkdir(output, { recursive: true });
const results = [];
for (let i = 0; i < 3; i++) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 1600000 / 8,
    uploadThroughput: 750000 / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    window.metrics = { lcp: 0, cls: 0, longestEvent: 0, events: [] };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.metrics.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        if (!e.hadRecentInput) window.metrics.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.metrics.longestEvent = Math.max(
          window.metrics.longestEvent,
          e.duration,
        );
        window.metrics.events.push({name:e.name,duration:e.duration,inputDelay:e.processingStart-e.startTime,processing:e.processingEnd-e.processingStart});
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  });
  await page.goto(`${base}?intro=0`, { waitUntil: "networkidle" });
  await page.locator(".media-surface img").evaluate((img) => img.decode());
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector(".booth-renderer")?.getAttribute("data-renderer") === "ready", null, { timeout: 15000 });
  const initial = await page.evaluate(() => ({
    ...window.metrics,
    sceneReadyMs: performance.getEntriesByName("marvin-scene-ready")[0]?.startTime,
    transferBytes: performance
      .getEntriesByType("resource")
      .reduce((n, e) => n + e.transferSize, 0),
  }));
  await page.getByRole("link", { name: "Our work" }).click();
  await page.getByRole("button", { name: "Next collection" }).click();
  await page.waitForTimeout(300);
  results.push({
    run: i + 1,
    ...initial,
    longestObservedEvent: await page.evaluate(
      () => window.metrics.longestEvent,
    ),
    events: await page.evaluate(()=>window.metrics.events),
  });
  await context.close();
}
await fs.writeFile(
  new URL("performance.json", output),
  JSON.stringify(
    {
      browser: browser.version(),
      base,
      checkedAt: new Date().toISOString(),
      profile:
        "Windows Chromium, 390x844 DPR1 touch emulation; 4x CPU; 1.6Mbps down, 750Kbps up, 150ms latency, cache disabled; HTTP local preview; local transport uncompressed",
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results.map(({ run, lcp, cls, sceneReadyMs, transferBytes, longestObservedEvent }) =>
  ({ run, lcp, cls, sceneReadyMs, transferBytes, longestObservedEvent }))));
await browser.close();
