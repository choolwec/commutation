/**
 * Generates the app icons from an inline SVG.
 *
 * Run with `npm run icons`. Only needs re-running if the mark changes.
 * iOS requires real PNGs for apple-touch-icon — it will not accept an SVG.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// fileURLToPath, not .pathname — the repo path contains a space, which
// .pathname would hand back percent-encoded and write to a "game%20day" dir.
const OUT = fileURLToPath(new URL("../public/", import.meta.url));

/**
 * @param {number} size
 * @param {number} inset - padding ratio; maskable icons need a safe zone
 *   because Android/iOS crop them to a circle or squircle.
 */
const mark = (size, inset = 0) => {
  const pad = size * inset;
  const box = size - pad * 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffc247"/>
      <stop offset="55%" stop-color="#ff5c39"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#08070c"/>
  <g transform="translate(${pad} ${pad})">
    <circle cx="${box / 2}" cy="${box / 2}" r="${box * 0.36}"
            fill="none" stroke="url(#g)" stroke-width="${box * 0.11}"
            stroke-linecap="round"
            stroke-dasharray="${box * 1.7} ${box * 1}"
            transform="rotate(-38 ${box / 2} ${box / 2})"/>
    <circle cx="${box / 2}" cy="${box * 0.2}" r="${box * 0.062}" fill="#ffc247"/>
  </g>
</svg>`;
};

await mkdir(OUT, { recursive: true });

const jobs = [
  ["icon-192.png", 192, 0.14],
  ["icon-512.png", 512, 0.14],
  ["icon-maskable-512.png", 512, 0.22],
  ["apple-touch-icon.png", 180, 0.12],
  ["favicon-32.png", 32, 0.1],
];

for (const [name, size, inset] of jobs) {
  await sharp(Buffer.from(mark(size, inset)))
    .png()
    .toFile(path.join(OUT, name));
  console.log(`  ✓ ${name}  ${size}×${size}`);
}

console.log("icons written to public/");
