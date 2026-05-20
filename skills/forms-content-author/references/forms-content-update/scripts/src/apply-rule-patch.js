#!/usr/bin/env node
// Builds JSON Patch ops to apply fd:rules/fd:events from forms-rule-creator output
// onto an AEM content model. Determines add vs replace by inspecting existing rule
// nodes — either via a pre-computed find-field result or directly from the content model.
// Replace ops target the full properties object — partial per-key replace is not
// supported by the API.
//
// Usage (find-field-result path — legacy):
//   node apply-rule-patch.bundle.js \
//     --merged-rule-file /tmp/merged-rule.json \
//     --find-field-result-file /tmp/ff-result.json \
//     --field-pointer '/items/0/items/2'
//
// Usage (content-model path — preferred, no separate find-field call needed):
//   node apply-rule-patch.bundle.js \
//     --merged-rule-file /tmp/merged-rule.json \
//     --content-model-file /tmp/content-model.json \
//     --field-pointer '/items/0/items/2'
//
// Inline JSON variants also supported:
//   --merged-rule '<json>'  --find-field-result '<json>'  --field-pointer '<ptr>'
//   --merged-rule '<json>'  --content-model '<json>'      --field-pointer '<ptr>'
//
// Output:
//   JSON array of patch ops — pass verbatim as ops to patch-aem-page-content
//   [{ op, path, value }]
//
// Exit codes: 0=ok, 1=error, 2=bad args

import { readFileSync } from 'fs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function capiToPointer(capiKey) {
  return capiKey.split(':').map(s => `/items/${s}`).join('');
}

function pointerToCapiKey(pointer) {
  // '/items/0/items/1' → '0:1'
  return pointer.replace(/^\/items\//, '').replace(/\/items\//g, ':');
}

function navigateByCapiKey(contentModel, capiKey) {
  // Walks model.items["0"].items["0:1"].items["0:1:2"] ... for capiKey "0:1:2"
  const segments = capiKey.split(':');
  let node = contentModel;
  let currentKey = '';
  for (const seg of segments) {
    currentKey = currentKey ? `${currentKey}:${seg}` : seg;
    node = node?.items?.[currentKey];
    if (!node) return null;
  }
  return node;
}

function resolveRuleNodesFromContentModel(contentModel, fieldPointer) {
  const capiKey  = pointerToCapiKey(fieldPointer);
  const fieldNode = navigateByCapiKey(contentModel, capiKey);

  const result = [
    { name: 'fd:rules',  found: false },
    { name: 'fd:events', found: false },
  ];

  if (!fieldNode?.items) return result;

  for (const [childCapiKey, child] of Object.entries(fieldNode.items)) {
    const childPointer = capiToPointer(childCapiKey);
    if (child.id === 'fd:rules') {
      result[0] = { name: 'fd:rules',  found: true, capiKey: childCapiKey, pointer: childPointer, propertyPointer: childPointer + '/properties' };
    } else if (child.id === 'fd:events') {
      result[1] = { name: 'fd:events', found: true, capiKey: childCapiKey, pointer: childPointer, propertyPointer: childPointer + '/properties' };
    }
  }

  return result;
}

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get  = flag => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };

const mergedRuleJson   = get('--merged-rule');
const mergedRuleFile   = get('--merged-rule-file');
const ffResultJson     = get('--find-field-result');
const ffResultFile     = get('--find-field-result-file');
const contentModelJson = get('--content-model');
const contentModelFile = get('--content-model-file');
const fieldPointer     = get('--field-pointer');

const hasMergedRule  = mergedRuleJson  || mergedRuleFile;
const hasFfResult    = ffResultJson    || ffResultFile;
const hasContentModel = contentModelJson || contentModelFile;

if (!hasMergedRule || (!hasFfResult && !hasContentModel) || !fieldPointer) {
  process.stderr.write(
    'Usage: apply-rule-patch.bundle.js --merged-rule-file <path> --find-field-result-file <path> --field-pointer <ptr>\n' +
    '       apply-rule-patch.bundle.js --merged-rule-file <path> --content-model-file <path>      --field-pointer <ptr>\n'
  );
  process.exit(2);
}

let mergedRule, ffResult;
try {
  mergedRule = JSON.parse(mergedRuleJson ?? readFileSync(mergedRuleFile, 'utf8'));

  if (hasFfResult) {
    ffResult = JSON.parse(ffResultJson ?? readFileSync(ffResultFile, 'utf8'));
  } else {
    const rawCM    = contentModelJson ?? readFileSync(contentModelFile, 'utf8');
    const parsedCM = JSON.parse(rawCM);
    // Unwrap { eTag, data } envelope if present (get-aem-page-content response format)
    const contentModel = (parsedCM.data && typeof parsedCM.data === 'object') ? parsedCM.data : parsedCM;
    ffResult = resolveRuleNodesFromContentModel(contentModel, fieldPointer);
  }
} catch (err) {
  process.stderr.write('Error parsing input: ' + err.message + '\n');
  process.exit(1);
}

if (!Array.isArray(ffResult)) {
  process.stderr.write('Error: --find-field-result must be an array (output of find-field --names)\n');
  process.exit(1);
}

const rEntry = ffResult.find(r => r.name === 'fd:rules');
const eEntry = ffResult.find(r => r.name === 'fd:events');
let   ni     = ffResult.filter(r => r.found).length;

const fdR = mergedRule['fd:rules']  || {};
const fdE = mergedRule['fd:events'] || {};
const ops = [];

if (Object.keys(fdR).length) {
  if (rEntry && rEntry.found) {
    ops.push({ op: 'replace', path: rEntry.propertyPointer, value: fdR });
  } else {
    ops.push({ op: 'add', path: `${fieldPointer}/items/${ni++}`, value: { id: 'fd:rules', componentType: 'fd:rules', properties: fdR } });
  }
}

if (Object.keys(fdE).length) {
  if (eEntry && eEntry.found) {
    ops.push({ op: 'replace', path: eEntry.propertyPointer, value: fdE });
  } else {
    ops.push({ op: 'add', path: `${fieldPointer}/items/${ni++}`, value: { id: 'fd:events', componentType: 'fd:events', properties: fdE } });
  }
}

process.stdout.write(JSON.stringify(ops, null, 2) + '\n');
process.exit(0);
