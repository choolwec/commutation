/**
 * Smoke-tests the deployed site at iPhone size.
 *
 * Checks the things a 200 response doesn't: that CSS and JS actually load
 * under the subpath, that Supabase connects from the browser, and that the
 * claim screen renders with all six names.
 *
 * Usage: node scripts/live.mjs [url]
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const URL_ = process.argv[2] ?? "https://choolwec.github.io/commutation/";
const OUT = fileURLToPath(new URL("../.shots/", import.meta.url));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const failed = [];
page.on("response", (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

console.log(`\nchecking ${URL_}\n`);
await page.goto(URL_, { waitUntil: "networkidle", timeout: 60000 });

const NAMES = ["Choolwe", "Chileleko", "Joy", "Latasha", "Niza", "Chibesa"];
let ok = true;

try {
  await page.getByRole("heading", { name: "Who are you?" }).waitFor({ timeout: 25000 });
  console.log("  ✓ claim screen rendered (Supabase reachable from the browser)");
} catch {
  ok = false;
  const text = (await page.locator("body").innerText()).slice(0, 300);
  console.log("  ✗ claim screen did not render");
  console.log(`    page said: ${text.replace(/\n+/g, " | ")}`);
}

for (const n of NAMES) {
  const seen = await page.getByText(n, { exact: true }).count();
  if (!seen) {
    ok = false;
    console.log(`  ✗ missing name: ${n}`);
  }
}
if (ok) console.log(`  ✓ all six names present`);

// Styling loaded? An unstyled page means the CSS 404'd under the subpath.
const bg = await page.evaluate(
  () => getComputedStyle(document.body).backgroundColor,
);
if (bg === "rgb(8, 7, 12)") console.log(`  ✓ stylesheet applied (${bg})`);
else {
  ok = false;
  console.log(`  ✗ stylesheet missing — body background is ${bg}`);
}

if (failed.length) {
  ok = false;
  console.log(`  ✗ ${failed.length} request(s) failed:`);
  for (const f of failed.slice(0, 6)) console.log(`    ${f}`);
} else console.log("  ✓ no failed requests");

if (errors.length) {
  ok = false;
  console.log("  ✗ page errors:");
  for (const e of errors.slice(0, 4)) console.log(`    ${e}`);
}

await page.screenshot({ path: path.join(OUT, "live.png"), fullPage: true });
await browser.close();

console.log(
  ok ? "\n\x1b[32mLive site is good.\x1b[0m\n" : "\n\x1b[31mLive site has problems.\x1b[0m\n",
);
process.exit(ok ? 0 : 1);
