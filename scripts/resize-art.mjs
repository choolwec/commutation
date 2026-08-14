/**
 * Resizes and compresses the hero/mood art from `art/` (raw AI-generated
 * downloads, staged per docs/ART.md) into `public/art/` as web-sized webp.
 *
 * Run with `npm run art`. Re-run any time a file in `art/` changes — it's
 * idempotent and just overwrites the output.
 *
 * webp over the source PNGs: these are flat-poster illustrations (solid
 * fields, crisp text, hard edges), which webp compresses far better than
 * JPEG (no ringing around the card lettering) and far smaller than PNG —
 * this is a static-export PWA meant to load fast on six phones at once.
 */
import sharp from "sharp";
import { mkdir, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// fileURLToPath, not .pathname — the repo path contains a space, which
// .pathname would hand back percent-encoded ("game%20day").
const SRC = fileURLToPath(new URL("../art/", import.meta.url));
const OUT = fileURLToPath(new URL("../public/art/", import.meta.url));

// Portrait hero pieces get more headroom (top of the phone page, largest
// on-screen footprint); the square mood/key-art pieces are banners and tiles,
// so a smaller max width is plenty even at 3x DPR.
const PORTRAIT_WIDTH = 900; // hub-hero, awards-hero (3:4)
const SQUARE_WIDTH = 800; // hall-*, game-* (1:1)

const PORTRAIT = new Set(["hub-hero", "awards-hero"]);

await mkdir(OUT, { recursive: true });

const entries = await readdir(SRC);
const pngs = entries.filter((f) => f.endsWith(".png"));

for (const file of pngs) {
  const name = file.replace(/\.png$/, "");
  const width = PORTRAIT.has(name) ? PORTRAIT_WIDTH : SQUARE_WIDTH;
  const srcPath = path.join(SRC, file);
  const outPath = path.join(OUT, `${name}.webp`);

  const before = (await stat(srcPath)).size;
  await sharp(srcPath)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outPath);
  const after = (await stat(outPath)).size;

  console.log(
    `  ✓ ${name}.webp  ${width}w  ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`,
  );
}

console.log(`art written to public/art/ (${pngs.length} files)`);
