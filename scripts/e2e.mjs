/**
 * End-to-end walk of the real app against the real database, at iPhone size.
 *
 * Claims a profile, types an answer, reloads to prove it persisted, then
 * releases the profile so the group finds a clean slate.
 *
 * Deliberately types into a logistics question, not a confession — this
 * script's output gets read, and nothing belonging in the Vault should ever
 * pass through it.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = fileURLToPath(new URL("../.shots/", import.meta.url));
await mkdir(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const shot = (p, n) =>
  p.screenshot({ path: path.join(OUT, `e2e-${n}.png`), fullPage: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));
// Accept the takeover confirm and the release confirm. Registered up front
// because Playwright auto-dismisses dialogs when nothing is listening, which
// silently turns "claim" into a no-op.
page.on("dialog", (d) => d.accept());

const step = (m) => console.log(`  → ${m}`);

// 1 ─ claim ──────────────────────────────────────────────────────────────
await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Who are you?" }).waitFor();
step("claim screen rendered");
await shot(page, "1-claim");

await page.getByRole("button", { name: /Chibesa/ }).click();
await page.getByRole("link", { name: /Start|Carry on/ }).waitFor();
step("claimed Chibesa, landed on the hub");
await shot(page, "2-hub");

// 2 ─ survey + autosave ──────────────────────────────────────────────────
await page.getByRole("link", { name: /Start|Carry on/ }).click();
await page.getByRole("heading", { name: /Make it yours/ }).waitFor();
step("survey opened at section 1");

await page.getByRole("button", { name: "🎯" }).click();
await page.waitForTimeout(300);
step("picked an emoji");

// Jump straight to the last section via its progress dot — clicking Next
// seven times races the debounced autosave and makes the test flaky.
await page.getByRole("button", { name: "The boring bit", exact: true }).click();
await page.getByRole("heading", { name: /The boring bit/ }).waitFor();

const probe = "arriving at 2 (e2e probe)";
await page.getByLabel("What time are you actually arriving?").fill(probe);
await page.waitForTimeout(1800); // let the debounced save flush
step("typed an answer and waited for autosave");
await shot(page, "3-survey");

// 3 ─ persistence across a reload ────────────────────────────────────────
// A hard reload should land back on section 8 (resume) with the answer
// refetched from Postgres — the two things that make a survey people fill
// in over several sittings actually work.
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("heading", { name: /The boring bit/ }).waitFor();
const restored = await page
  .getByLabel("What time are you actually arriving?")
  .inputValue();

if (restored === probe) step("✓ answer survived a reload, resumed on section 8");
else {
  console.log(`\n  persistence FAILED — field came back as "${restored}"`);
  if (errors.length) {
    console.log("  console errors:");
    for (const e of errors) console.log(`    ${e}`);
  } else console.log("  (no console errors captured)");
  await shot(page, "FAIL-persistence");
  await browser.close();
  process.exit(1);
}

// 4 ─ counts visible, content never ──────────────────────────────────────
await page.locator('a[href="/"]').first().click();
await page.getByText(/The crew/).waitFor();
const body = await page.locator("body").innerText();
if (body.includes(probe))
  throw new Error("hub leaked answer content into the roster");
step("✓ hub shows counts, no answer content");
await shot(page, "4-hub-progress");

// 5 ─ clean up so the group starts fresh ─────────────────────────────────
// Delete the probe answer while still signed in as its author: RLS means
// nothing else can remove it afterwards, so this has to happen here.
await page.goto(`${BASE}/survey`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "The boring bit", exact: true }).click();
await page.getByLabel("What time are you actually arriving?").fill("");
await page.waitForTimeout(1800);
step("cleared the probe answer");

await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^Not Chibesa\?$/ }).click();
await page.getByRole("heading", { name: "Who are you?" }).waitFor();
step("released the profile");

await browser.close();

if (errors.length) {
  console.log("\n  console errors:");
  for (const e of errors.slice(0, 5)) console.log(`    ${e}`);
  process.exit(1);
}
console.log("\n\x1b[32mEnd-to-end passed.\x1b[0m\n");
