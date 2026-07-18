#!/usr/bin/env node
/**
 * Design-consistency guard for the atmospheric design system (see DESIGN.md).
 *
 * Audits by CLASS of inconsistency, not by hand — the way real drift slips in.
 * Fails CI (the required `verify` job) so an off-system surface can't reach main.
 * Run locally with `pnpm run check:design`.
 *
 * Rules:
 *   flat-panel     — raw `bg-card`; panels use `glass-panel` (or the <Card> component)
 *   title-font     — h1/h2 page/section titles must use `font-display`
 *   accent-on-data — `--primary` (the interaction accent) never colors data marks
 *   coin-logo      — asset logos go through <CoinIcon> (single source of the halo)
 *
 * To intentionally allow a line, append `// design-lint-ignore <rule>` to it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["components", "app"];

// Files that are not in-app product UI (server OG images, tests) — skip them.
const SKIP = /(opengraph-image|[/\\]og[/\\]route|\.test\.|[/\\]__tests__[/\\])/;

const violations = [];
const lineAt = (src, index) => src.slice(0, index).split("\n").length;

const add = (file, src, index, rule, message) => {
  const line = lineAt(src, index);
  // Per-line opt-out: `// design-lint-ignore <rule>` on the offending line.
  const lineText = src.split("\n")[line - 1] ?? "";
  if (new RegExp(`design-lint-ignore\\s+${rule}`).test(lineText)) return;
  violations.push({ file: relative(ROOT, file), line, rule, message });
};

const RULES = [
  {
    rule: "flat-panel",
    // `bg-card` (incl. opacity variants like bg-card/50); the <Card> component
    // is the one legitimate definer of the card surface.
    re: /\bbg-card\b/g,
    skipFile: (rel) => rel.endsWith("components/ui/card.tsx"),
    message: "usa `bg-card` cru — troque por `glass-panel` (ou use o componente <Card>)",
  },
  {
    rule: "accent-on-data",
    re: /(?:stroke|fill)="var\(--primary\)"/g,
    message:
      "`--primary` (acento) colorindo dado — dados usam --foreground/--gain/--loss/--chart-*",
  },
  {
    rule: "coin-halo",
    // The halo lives only inside <CoinIcon>.
    re: /coin-ic-halo/g,
    skipFile: (rel) => rel.endsWith("components/coin-icon.tsx"),
    message: "`coin-ic-halo` inline — o halo do logo mora só no <CoinIcon>",
  },
  {
    rule: "coin-logo",
    // An <Image ...> that renders a round avatar is an asset logo — route it
    // through <CoinIcon> so it always gets the halo.
    re: /<Image\b[^>]*?\brounded-full\b[^>]*?>/gs,
    skipFile: (rel) => rel.endsWith("components/coin-icon.tsx"),
    message: "logo redondo com `<Image>` — use <CoinIcon> (fonte única do halo)",
  },
];

const checkTitles = (file, src) => {
  for (const m of src.matchAll(/<h[12]\s+className="([^"]*)"/g)) {
    const cls = m[1];
    const isTitle =
      /\btext-(?:2xl|lg)\b/.test(cls) &&
      /\bfont-(?:semibold|bold|extrabold)\b/.test(cls);
    if (isTitle && !/\bfont-display\b/.test(cls) && !/\bsr-only\b/.test(cls)) {
      add(file, src, m.index, "title-font", "título h1/h2 sem `font-display`");
    }
  }
};

const checkFile = (file) => {
  const rel = relative(ROOT, file);
  if (SKIP.test(rel)) return;
  const src = readFileSync(file, "utf8");
  for (const { rule, re, skipFile, message } of RULES) {
    if (skipFile?.(rel)) continue;
    for (const m of src.matchAll(re)) add(file, src, m.index, rule, message);
  }
  checkTitles(file, src);
};

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".tsx")) checkFile(p);
  }
};

for (const d of SCAN_DIRS) walk(join(ROOT, d));

if (violations.length === 0) {
  console.log("✓ design consistency: nenhuma violação");
  process.exit(0);
}

violations.sort(
  (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
);
console.error(
  `\n✗ design consistency: ${violations.length} violação(ões)\n`,
);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.rule}]  ${v.message}`);
}
console.error(
  "\nCorrija, ou adicione `// design-lint-ignore <rule>` na linha se for intencional.\n",
);
process.exit(1);
