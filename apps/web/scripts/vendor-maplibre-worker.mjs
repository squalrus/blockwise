// maplibre-gl's worker script imports a sibling "./maplibre-gl-shared.mjs"
// via a relative specifier. Turbopack/webpack's `new URL(specifier,
// import.meta.url)` asset pipeline emits the worker as a standalone hashed
// file, which breaks that relative import (the sibling never gets emitted
// alongside it). Copying both files into public/ verbatim -- served
// byte-for-byte as static assets, no bundler rewriting -- keeps their
// relative relationship intact. Runs via predev/prebuild so it can't drift
// from whatever maplibre-gl version package.json currently pins.
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_DIR = path.join(__dirname, "..", "..", "..", "node_modules", "maplibre-gl", "dist");
const DEST_DIR = path.join(__dirname, "..", "public");
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

for (const file of FILES) {
  copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
}
