// Build script — bundles CLI tools for offline use (no npm install required at runtime).
//
// Output (forms-content-update/scripts/):
//   apply-rule-patch.bundle.js  — apply fd:rules / fd:events patch onto a content model node
//   find-field.bundle.js        — find field by name → capiKey + pointer + qualifiedId + type
//   find-rule-refs.bundle.js    — scan fd:rules ASTs for COMPONENT refs to a qualifiedId
//   rewrite-rule-refs.bundle.js — rewrite COMPONENT refs old→new in fd:rules ASTs
//
// lib/content-model-walk.js is inlined by esbuild into each bundle — no runtime dependency.
//
// Usage:
//   node build.mjs
//
// Requires: npm install (devDependencies: esbuild)

import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const scriptsDir = join(__dirname, "scripts");
const srcDir = join(scriptsDir, "src");

const entries = [
  {
    in: join(srcDir, "apply-rule-patch.js"),
    out: join(scriptsDir, "apply-rule-patch.bundle.js"),
  },
  {
    in: join(srcDir, "find-field.js"),
    out: join(scriptsDir, "find-field.bundle.js"),
  },
  {
    in: join(srcDir, "find-rule-refs.js"),
    out: join(scriptsDir, "find-rule-refs.bundle.js"),
  },
  {
    in: join(srcDir, "rewrite-rule-refs.js"),
    out: join(scriptsDir, "rewrite-rule-refs.bundle.js"),
  },
];

for (const { in: entryPoint, out: outfile } of entries) {
  await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile,
    logLevel: "info",
  });
}

console.log("\nDone — 4 bundles written to forms-content-update/scripts/");
