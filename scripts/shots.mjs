/**
 * Screenshots the app at real iPhone dimensions.
 *
 * Run with `npm run shots` while `npm run dev` is going. Uses iPhone 15 Pro
 * metrics (393×852 @3x) because checking a phone-first layout in a desktop
 * window is how you ship a survey nobody can read.
 *
 * Covers Stage 1 (Hub/claim/survey) and Stage 2 (the Launcher's tab bar,
 * a live game screen) — both go through /preview's mocked Player/Room
 * context, so none of this needs a real Supabase project or a claimed
 * profile.
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

// Stage 2 — the picker's tab bar and a live game screen. /preview mocks
// RoomContext the same way it mocks PlayerContext (see preview/page.tsx),
// so these need no Supabase project either.
await page.goto(`${BASE}/preview`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "play", exact: true }).click();
await page.waitForTimeout(300);
await page.addStyleTag({ content: "[data-preview-toggle]{display:none !important}" });
await page.screenshot({ path: path.join(OUT, "play-huddle.png") });
console.log("  ✓ play-huddle");

await page.addStyleTag({ content: "[data-preview-toggle]{display:flex !important}" });
await page.getByRole("button", { name: /Vault/ }).click();
await page.waitForTimeout(200);
await page.addStyleTag({ content: "[data-preview-toggle]{display:none !important}" });
await page.screenshot({ path: path.join(OUT, "play-vault.png") });
console.log("  ✓ play-vault");

await page.goto(`${BASE}/preview`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "game", exact: true }).click();
await page.waitForTimeout(500);
// First mount also auto-opens the rules sheet once per session — worth
// checking that render too, not just after it's dismissed.
await page.screenshot({ path: path.join(OUT, "game-rules-sheet.png") });
console.log("  ✓ game-rules-sheet");
await page.getByRole("button", { name: "Got it" }).click();
await page.waitForTimeout(200);
await page.addStyleTag({ content: "[data-preview-toggle]{display:none !important}" });
await page.screenshot({ path: path.join(OUT, "game-screen.png") });
console.log("  ✓ game-screen");

await browser.close();
console.log(`shots written to .shots/`);
