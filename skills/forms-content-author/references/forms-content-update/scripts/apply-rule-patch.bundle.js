#!/usr/bin/env node

// scripts/src/apply-rule-patch.js
var import_fs = require("fs");
function capiToPointer(capiKey) {
  return capiKey.split(":").map((s) => `/items/${s}`).join("");
}
function pointerToCapiKey(pointer) {
  return pointer.replace(/^\/items\//, "").replace(/\/items\//g, ":");
}
function navigateByCapiKey(contentModel, capiKey) {
  const segments = capiKey.split(":");
  let node = contentModel;
  let currentKey = "";
  for (const seg of segments) {
    currentKey = currentKey ? `${currentKey}:${seg}` : seg;
    node = node?.items?.[currentKey];
    if (!node) return null;
  }
  return node;
}
function resolveRuleNodesFromContentModel(contentModel, fieldPointer2) {
  const capiKey = pointerToCapiKey(fieldPointer2);
  const fieldNode = navigateByCapiKey(contentModel, capiKey);
  const result = [
    { name: "fd:rules", found: false },
    { name: "fd:events", found: false }
  ];
  if (!fieldNode?.items) return result;
  for (const [childCapiKey, child] of Object.entries(fieldNode.items)) {
    const childPointer = capiToPointer(childCapiKey);
    if (child.id === "fd:rules") {
      result[0] = { name: "fd:rules", found: true, capiKey: childCapiKey, pointer: childPointer, propertyPointer: childPointer + "/properties" };
    } else if (child.id === "fd:events") {
      result[1] = { name: "fd:events", found: true, capiKey: childCapiKey, pointer: childPointer, propertyPointer: childPointer + "/properties" };
    }
  }
  return result;
}
var args = process.argv.slice(2);
var get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : void 0;
};
var mergedRuleJson = get("--merged-rule");
var mergedRuleFile = get("--merged-rule-file");
var ffResultJson = get("--find-field-result");
var ffResultFile = get("--find-field-result-file");
var contentModelJson = get("--content-model");
var contentModelFile = get("--content-model-file");
var fieldPointer = get("--field-pointer");
var hasMergedRule = mergedRuleJson || mergedRuleFile;
var hasFfResult = ffResultJson || ffResultFile;
var hasContentModel = contentModelJson || contentModelFile;
if (!hasMergedRule || !hasFfResult && !hasContentModel || !fieldPointer) {
  process.stderr.write(
    "Usage: apply-rule-patch.bundle.js --merged-rule-file <path> --find-field-result-file <path> --field-pointer <ptr>\n       apply-rule-patch.bundle.js --merged-rule-file <path> --content-model-file <path>      --field-pointer <ptr>\n"
  );
  process.exit(2);
}
var mergedRule;
var ffResult;
try {
  mergedRule = JSON.parse(mergedRuleJson ?? (0, import_fs.readFileSync)(mergedRuleFile, "utf8"));
  if (hasFfResult) {
    ffResult = JSON.parse(ffResultJson ?? (0, import_fs.readFileSync)(ffResultFile, "utf8"));
  } else {
    const rawCM = contentModelJson ?? (0, import_fs.readFileSync)(contentModelFile, "utf8");
    const parsedCM = JSON.parse(rawCM);
    const contentModel = parsedCM.data && typeof parsedCM.data === "object" ? parsedCM.data : parsedCM;
    ffResult = resolveRuleNodesFromContentModel(contentModel, fieldPointer);
  }
} catch (err) {
  process.stderr.write("Error parsing input: " + err.message + "\n");
  process.exit(1);
}
if (!Array.isArray(ffResult)) {
  process.stderr.write("Error: --find-field-result must be an array (output of find-field --names)\n");
  process.exit(1);
}
var rEntry = ffResult.find((r) => r.name === "fd:rules");
var eEntry = ffResult.find((r) => r.name === "fd:events");
var ni = ffResult.filter((r) => r.found).length;
var fdR = mergedRule["fd:rules"] || {};
var fdE = mergedRule["fd:events"] || {};
var ops = [];
if (Object.keys(fdR).length) {
  if (rEntry && rEntry.found) {
    ops.push({ op: "replace", path: rEntry.propertyPointer, value: fdR });
  } else {
    ops.push({ op: "add", path: `${fieldPointer}/items/${ni++}`, value: { id: "fd:rules", componentType: "fd:rules", properties: fdR } });
  }
}
if (Object.keys(fdE).length) {
  if (eEntry && eEntry.found) {
    ops.push({ op: "replace", path: eEntry.propertyPointer, value: fdE });
  } else {
    ops.push({ op: "add", path: `${fieldPointer}/items/${ni++}`, value: { id: "fd:events", componentType: "fd:events", properties: fdE } });
  }
}
process.stdout.write(JSON.stringify(ops, null, 2) + "\n");
process.exit(0);
