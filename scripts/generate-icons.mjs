/**
 * One-off PWA icon generator. Rasterizes an on-brand candlestick mark (lime on
 * graphite, matching the app's dark theme) into the PNG sizes the manifest and
 * Apple touch icon need. Run with: `node scripts/generate-icons.mjs`
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const GRAPHITE = "#1a1c19";
const LIME = "#c8e84a";

/** Three candlesticks laid out in a 100×100 logical content box. */
const candles = () => {
  const wick = (cx, y1, y2) =>
    `<line x1="${cx}" x2="${cx}" y1="${y1}" y2="${y2}" stroke="${LIME}" stroke-width="4" stroke-linecap="round" />`;
  const body = (cx, y1, y2) =>
    `<rect x="${cx - 9}" y="${y1}" width="18" height="${y2 - y1}" rx="3" fill="${LIME}" />`;
  return [
    wick(20, 30, 80),
    body(20, 44, 70),
    wick(50, 12, 88),
    body(50, 28, 62),
    wick(80, 24, 72),
    body(80, 38, 58),
  ].join("");
};

/**
 * Build an SVG icon. `inset` is the fraction of the canvas around the content
 * (larger for maskable so the mark stays inside the safe zone). `rounded`
 * applies app-icon corner rounding for the standalone "any" icons.
 */
const svg = (size, { inset, rounded }) => {
  const pad = size * inset;
  const content = size - pad * 2;
  const radius = rounded ? size * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${GRAPHITE}" />
    <g transform="translate(${pad} ${pad}) scale(${content / 100})">${candles()}</g>
  </svg>`;
};

const targets = [
  { file: "icon-192.png", size: 192, inset: 0.18, rounded: true },
  { file: "icon-512.png", size: 512, inset: 0.18, rounded: true },
  { file: "icon-maskable-512.png", size: 512, inset: 0.26, rounded: false },
  { file: "apple-touch-icon.png", size: 180, inset: 0.16, rounded: false },
];

await Promise.all(
  targets.map(({ file, size, inset, rounded }) =>
    sharp(Buffer.from(svg(size, { inset, rounded })))
      .png()
      .toFile(join(PUBLIC, file))
      .then(() => console.log(`wrote public/${file}`)),
  ),
);
