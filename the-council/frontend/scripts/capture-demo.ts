/**
 * capture-demo.ts — Screenshot tool for The Council demo assets.
 *
 * Usage: npx ts-node scripts/capture-demo.ts
 * Requires: npm install -D playwright (devDependency)
 * Also: npx playwright install chromium
 *
 * Saves screenshots to public/demo/
 * Requires dev server running at http://localhost:3000
 */

import * as fs from "fs";
import * as path from "path";
import * as http from "http";

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.join(process.cwd(), "public", "demo");

const SCREENSHOTS: Array<{
  name: string;
  url: string;
  width: number;
  height: number;
  waitFor?: string;
}> = [
  {
    name: "war-room",
    url: "/war-room",
    width: 1400,
    height: 900,
    waitFor: "h1",
  },
  {
    name: "private-desk",
    url: "/private-desk",
    width: 1400,
    height: 900,
    waitFor: "h1",
  },
  {
    name: "dashboard",
    url: "/dashboard",
    width: 1400,
    height: 900,
    waitFor: "h1",
  },
];

async function checkServer(): Promise<boolean> {
  return new Promise((resolve) => {
    http
      .get(BASE_URL, (res) => resolve(res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 302))
      .on("error", () => resolve(false));
  });
}

async function capture(): Promise<void> {
  // Check server is running
  const serverUp = await checkServer();
  if (!serverUp) {
    console.error(`\nError: Dev server not running at ${BASE_URL}`);
    console.error("Run 'npm run dev' first, then re-run this script.\n");
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright not installed. Run: npm install -D playwright && npx playwright install chromium");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const results: string[] = [];

  try {
    for (const shot of SCREENSHOTS) {
      console.log(`Capturing ${shot.name}...`);
      const page = await browser.newPage();
      await page.setViewportSize({ width: shot.width, height: shot.height });

      await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: "networkidle", timeout: 15000 });

      if (shot.waitFor) {
        await page.waitForSelector(shot.waitFor, { timeout: 5000 }).catch(() => {});
      }

      const outputPath = path.join(OUTPUT_DIR, `${shot.name}.png`);
      await page.screenshot({ path: outputPath, fullPage: false });
      results.push(outputPath);

      await page.close();
      console.log(`  Saved: ${outputPath}`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone. ${results.length} screenshots saved to public/demo/`);
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
