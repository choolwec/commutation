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

// Next's dev-mode indicator renders in a <nextjs-portal> pinned to the
// bottom-left — directly over the tab bar's Huddle label (HANDOFF §13 logged
// this as a cosmetic artifact; it also intercepts pointer events, so it has
// to go before any tab can be clicked). Injected on every document rather
// than per-shot so it can never race a click.
const HIDE_DEV_CHROME = "nextjs-portal{display:none !important}";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await page.addInitScript((css) => {
  const apply = () => {
    const el = document.createElement("style");
    el.textContent = css;
    document.head?.appendChild(el);
  };
  if (document.head) apply();
  else document.addEventListener("DOMContentLoaded", apply);
}, HIDE_DEV_CHROME);

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

// The Huddle tab, scrolled to "Your Rounds" — the nine games the group
// invented themselves (docs/THEIR_ROUNDS.md), which is where two thirds of
// the picker's tiles now live.
await page.addStyleTag({ content: "[data-preview-toggle]{display:flex !important}" });
await page.getByRole("button", { name: /Huddle/ }).click();
await page.waitForTimeout(200);
await page.addStyleTag({ content: "[data-preview-toggle]{display:none !important}" });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "play-your-rounds.png"), fullPage: true });
console.log("  ✓ play-your-rounds");

await page.goto(`${BASE}/preview`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "game", exact: true }).click();
await page.waitForTimeout(500);
// First mount auto-opens the rules sheet the first time a device sees a
// game — worth checking that render too, not just after it's dismissed.
// (localStorage-backed, so clear it or the sheet won't appear on re-runs.)
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "game", exact: true }).click();
await page.waitForTimeout(500);
await page.addStyleTag({ content: "[data-preview-toggle]{display:none !important}" });
await page.screenshot({ path: path.join(OUT, "game-rules-sheet.png") });
console.log("  ✓ game-rules-sheet");
await page.addStyleTag({ content: "[data-preview-toggle]{display:flex !important}" });
await page.getByRole("button", { name: "Got it", exact: true }).click();
await page.waitForTimeout(200);
await page.addStyleTag({ content: "[data-preview-toggle]{display:none !important}" });
await page.screenshot({ path: path.join(OUT, "game-screen.png") });
console.log("  ✓ game-screen");

// One of the group's own rounds, mid-play: Clap Circle's seat ring is the
// widest new layout in the app and the one most likely to break at 393px.
await page.goto(`${BASE}/preview`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "circle", exact: true }).click();
await page.waitForTimeout(500);
const gotIt = page.getByRole("button", { name: "Got it", exact: true });
if (await gotIt.isVisible().catch(() => false)) {
  await gotIt.click();
  await page.waitForTimeout(200);
}
await page.addStyleTag({ content: "[data-preview-toggle]{display:none !important}" });
await page.screenshot({ path: path.join(OUT, "game-clap-circle.png"), fullPage: true });
console.log("  ✓ game-clap-circle");

// The way out of a round — GameShell renders it for all 25 games, so one
// shot covers the lot.
await page.getByRole("button", { name: "Leave this round" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, "game-exit-sheet.png") });
console.log("  ✓ game-exit-sheet");

await browser.close();
console.log(`shots written to .shots/`);
