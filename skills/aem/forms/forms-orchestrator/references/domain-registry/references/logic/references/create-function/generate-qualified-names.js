#!/usr/bin/env node
/**
 * generate-qualified-names.js
 *
 * Generates a qualifiedNames JSON file for the custom-functions validator
 * by running transform-form.js on a form/fragment .form.json and flattening
 * the treeJson output into the validator's expected key format.
 *
 * Usage:
 *   node generate-qualified-names.js <path/to/form.form.json> [options]
 *
 * Options:
 *   --out <file>       Write to file instead of stdout
 *   --transform <path> Path to transform-form.js (default: auto-detected)
 *
 * Fragment detection is automatic: if transform-form.js sets isFragment=true on
 * the root treeJson node, both $form.* and $fragment.* keys are emitted.
 * For plain forms (isFragment=false), only $form.* keys are emitted.
 *
 * Output format:
 *   {
 *     "$form": { "type": "form", "customProperties": [] },
 *     "$form.panel1.field1": { "type": "text-input", "customProperties": [] },
 *     // fragment only:
 *     "$fragment.panel1.field1": { "type": "text-input", "customProperties": [] }
 *   }
 *
 * Key convention:
 *   - $form.*     keys map to globals.form.* accesses in custom function code
 *   - $fragment.* keys map to globals.fragment.* accesses (fragments only)
 *   The validator strips the scope identifier (globals) and prepends $ to the root.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Navigate up from create-function/ to forms-orchestrator/
// create-function → references(logic) → logic → references(domain-registry) → domain-registry → references(forms-orchestrator) → forms-orchestrator
const ORCHESTRATOR_ROOT = path.resolve(__dirname, "../../../../../..");
const DEFAULT_TRANSFORM = path.join(
  ORCHESTRATOR_ROOT,
  "scripts/rule_coder/bridge/cli/transform-form.js"
);

// --- CLI arg parsing ---

function parseArgs(argv) {
  const args = { formJson: null, out: null, transform: DEFAULT_TRANSFORM };
  const list = argv.slice(2);
  for (let i = 0; i < list.length; i++) {
    if (list[i] === "--out") { args.out = list[++i]; continue; }
    if (list[i] === "--transform") { args.transform = list[++i]; continue; }
    if (!list[i].startsWith("--")) args.formJson = list[i];
  }
  return args;
}

// --- Tree flattening ---

function flatten(node, acc = []) {
  if (!node || typeof node !== "object") return acc;
  const { id, fieldType, customProperties } = node;
  if (id && fieldType) {
    // NOTE: customProperties is always [] here.
    // transform-form.js does not surface custom component properties in its treeJson output.
    // If a field uses $properties.* access in custom functions, manually add the
    // declared custom property paths to the generated qualifiedNames entry, e.g.:
    //   "$form.panel1.field1": { "type": "text-input", "customProperties": ["myProp.nestedProp"] }
    acc.push({
      id,
      type: fieldType,
      customProperties: Array.isArray(customProperties) ? customProperties : [],
    });
  }
  if (Array.isArray(node.items)) {
    for (const child of node.items) flatten(child, acc);
  }
  return acc;
}

// --- Build qualifiedNames map ---

function buildQualifiedNames(nodes, isFragment) {
  const qn = {};
  for (const { id, type, customProperties } of nodes) {
    // $form.x.y.z → direct key (always)
    qn[id] = { type, customProperties };

    // Fragment: also emit $fragment.* keys (globals.fragment.* accesses)
    if (isFragment && id.startsWith("$form")) {
      const fragmentKey = "$fragment" + id.slice("$form".length);
      qn[fragmentKey] = { type, customProperties };
    }
  }
  return qn;
}

// --- Main ---

const args = parseArgs(process.argv);

if (!args.formJson) {
  console.error("usage: node generate-qualified-names.js <form.json> [--out <file>] [--fragment] [--transform <path>]");
  process.exit(2);
}

if (!fs.existsSync(args.formJson)) {
  console.error(`error: form JSON not found: ${args.formJson}`);
  process.exit(1);
}

if (!fs.existsSync(args.transform)) {
  console.error(`error: transform-form.js not found at: ${args.transform}`);
  console.error(`  Pass the correct path with --transform`);
  process.exit(1);
}

let raw;
try {
  raw = execFileSync("node", [args.transform, args.formJson], { encoding: "utf8" });
} catch (e) {
  console.error("error: transform-form.js failed:", e.message);
  process.exit(1);
}

let treeJson;
try {
  ({ treeJson } = JSON.parse(raw));
} catch (e) {
  console.error("error: could not parse transform-form.js output:", e.message);
  process.exit(1);
}

if (!treeJson) {
  console.error("error: transform-form.js output has no treeJson field");
  process.exit(1);
}

// Auto-detect: isFragment=true on root node means this is a fragment JSON.
// Fragments emit both $form.* and $fragment.* keys.
// Forms emit only $form.* keys.
const isFragment = treeJson.isFragment === true;

const nodes = flatten(treeJson);
const qualifiedNames = buildQualifiedNames(nodes, isFragment);
const output = JSON.stringify(qualifiedNames, null, 2);

if (args.out) {
  fs.writeFileSync(args.out, output, "utf8");
  console.error(`wrote ${Object.keys(qualifiedNames).length} qualified names to ${args.out} (isFragment=${isFragment})`);
} else {
  process.stderr.write(`isFragment=${isFragment}, keys=${Object.keys(qualifiedNames).length}\n`);
  process.stdout.write(output + "\n");
}
