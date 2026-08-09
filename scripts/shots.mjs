/**
 * Screenshots the app at real iPhone dimensions.
 *
 * Run with `npm run shots` while `npm run dev` is going. Uses iPhone 15 Pro
 * metrics (393×852 @3x) because checking a phone-first layout in a desktop
 * window is how you ship a survey nobody can read.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = fileURLToPath(new URL("../.shots/", import.meta.url));
await mkdir(OUT, { recursive: true });

const BASE = process.env.BASE ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

/** @type {[string, string|null, number][]} name, view, survey section index */
const shots = [
  ["hub", null, 0],
  ["claim", "claim", 0],
  ["survey-1-profile", "survey", 0],
  ["survey-3-confessions", "survey", 2],
  ["survey-7-invent", "survey", 6],
];

for (const [name, view, sectionIndex] of shots) {
  await page.goto(`${BASE}/preview`, { waitUntil: "networkidle" });
  if (view) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await page.waitForTimeout(300);
  }
  // Hide the view switcher first: it's a dev affordance that shouldn't be in
  // the shot, and it sits directly over the survey's Next button.
  await page.addStyleTag({
    content: "[data-preview-toggle]{display:none !important}",
  });
  for (let i = 0; i < sectionIndex; i++) {
    await page.getByRole("button", { name: /^(Next|Seal it)$/ }).click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    fullPage: true,
  });
  console.log(`  ✓ ${name}`);
}

await browser.close();
console.log(`shots written to .shots/`);
