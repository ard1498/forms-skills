#!/usr/bin/env node

// scripts/src/find-field.js
var import_fs = require("fs");

// ../../../../lib/scripts/content-model-walk.js
var PANEL_FIELD_TYPES = /* @__PURE__ */ new Set([
  "panelcontainer",
  "accordion",
  "wizard",
  "tabsontop",
  "verticaltabs",
  "fragment",
  "review"
]);
var FIELD_TYPE_TO_TYPE = {
  "text-input": "AFCOMPONENT|FIELD|TEXT FIELD|STRING",
  "multiline-input": "AFCOMPONENT|FIELD|TEXT FIELD|STRING",
  email: "AFCOMPONENT|FIELD|TEXT FIELD|STRING",
  "telephone-input": "AFCOMPONENT|FIELD|TEXT FIELD|STRING",
  "number-input": "AFCOMPONENT|FIELD|NUMBER FIELD|NUMBER",
  "date-input": "AFCOMPONENT|FIELD|DATE FIELD|DATE",
  "drop-down": "AFCOMPONENT|FIELD|DROPDOWN|STRING",
  "radio-group": "AFCOMPONENT|FIELD|RADIO BUTTON|STRING",
  checkbox: "AFCOMPONENT|FIELD|BOOLEAN",
  "checkbox-group": "AFCOMPONENT|FIELD|STRING[]",
  switch: "AFCOMPONENT|FIELD|BOOLEAN",
  "file-input": "AFCOMPONENT|FIELD",
  "plain-text": "AFCOMPONENT|STATIC TEXT|STRING",
  image: "AFCOMPONENT|IMAGE|STRING",
  button: "AFCOMPONENT|FIELD|BUTTON",
  form: "FORM"
};
function fieldTypeToType(fieldType) {
  if (!fieldType) return "AFCOMPONENT|FIELD";
  if (PANEL_FIELD_TYPES.has(fieldType)) return "AFCOMPONENT|PANEL|OBJECT";
  return FIELD_TYPE_TO_TYPE[fieldType] || "AFCOMPONENT|FIELD";
}
function sortedValues(itemsObj) {
  if (!itemsObj || typeof itemsObj !== "object") return [];
  return Object.entries(itemsObj).sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10)).map(([idx, entry]) => ({ idx, entry }));
}
function findFormRoot(contentModel2) {
  const top = sortedValues(contentModel2.items || {});
  const found = top.find(({ entry: e }) => e.properties?.fieldType === "form") || top[0];
  return found ? found.entry : null;
}
function walkItems(itemsObj, parentQualifiedId, parentCapiKey, parentPointer, depth, visitor) {
  for (const { idx, entry } of sortedValues(itemsObj)) {
    const name2 = entry.properties?.name || entry.id || "";
    const qualifiedId = parentQualifiedId ? `${parentQualifiedId}.${name2}` : name2;
    const capiKey = parentCapiKey ? `${parentCapiKey}:${idx}` : idx;
    const pointer = `${parentPointer}/items/${idx}`;
    visitor(entry, { name: name2, qualifiedId, capiKey, pointer, depth });
    walkItems(
      entry.items || {},
      qualifiedId,
      capiKey,
      pointer,
      depth + 1,
      visitor
    );
  }
}

// scripts/src/find-field.js
function capiToPointer(capiKey) {
  return capiKey.split(":").map((s) => `/items/${s}`).join("");
}
function isPanel(fieldType) {
  return PANEL_FIELD_TYPES.has(fieldType || "");
}
function stripServerFields(entry) {
  const { "capi-key": _k, "capi-index": _i, ...rest } = entry;
  if (rest.items && typeof rest.items === "object" && !Array.isArray(rest.items)) {
    const children = Object.values(rest.items);
    rest.items = children.length > 0 ? children.map(stripServerFields) : [];
  }
  return rest;
}
function findFieldByName(contentModel2, targetName) {
  const formRoot = findFormRoot(contentModel2);
  if (!formRoot) return { found: false };
  const formRootCapiKey = formRoot["capi-key"] || "0";
  const formRootPointer = capiToPointer(formRootCapiKey);
  let result = null;
  walkItems(formRoot.items || {}, "$form", formRootCapiKey, formRootPointer, 1, (entry, ctx) => {
    if (result) return;
    const nameMatch = entry.properties?.name === targetName;
    const idMatch = !entry.properties?.name && entry.id === targetName;
    const titleMatch = entry.properties?.["jcr:title"]?.toLowerCase() === targetName.toLowerCase();
    if (nameMatch || idMatch || titleMatch) {
      const capiKey = entry["capi-key"] || ctx.capiKey;
      const pointer = capiToPointer(capiKey);
      const fieldType = entry.properties?.fieldType || "";
      result = {
        found: true,
        capiKey,
        pointer,
        propertyPointer: pointer + "/properties",
        qualifiedId: ctx.qualifiedId,
        type: fieldTypeToType(fieldType),
        displayName: entry.properties?.["jcr:title"] || ctx.name,
        componentType: entry.componentType || "",
        isPanel: isPanel(fieldType),
        component: stripServerFields(entry)
      };
    }
  });
  return result || { found: false };
}
function findFieldsByNames(contentModel2, names) {
  return names.map((name2) => ({ name: name2, ...findFieldByName(contentModel2, name2) }));
}
var args = process.argv.slice(2);
var get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : void 0;
};
var contentModelJson = get("--content-model");
var contentModelFile = get("--content-model-file");
var name = get("--name");
var namesArg = get("--names");
if (!contentModelJson && !contentModelFile || !name && !namesArg) {
  process.stderr.write(
    'Usage: node find-field.bundle.js --content-model <json> --name <name>\n       node find-field.bundle.js --content-model-file <path> --names "a,b,c"\n'
  );
  process.exit(2);
}
var contentModel;
try {
  const isFilePath = (s) => typeof s === "string" && (s.startsWith("/") || s.startsWith("./") || s.startsWith("~/"));
  const raw = contentModelJson && !isFilePath(contentModelJson) ? contentModelJson : (0, import_fs.readFileSync)(contentModelFile || contentModelJson, "utf8");
  const parsed = JSON.parse(raw);
  contentModel = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
} catch (err) {
  process.stderr.write("Error: could not parse content model: " + err.message + "\n");
  process.exit(2);
}
if (name) {
  const result = findFieldByName(contentModel, name);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result.found ? 0 : 1);
} else {
  const names = namesArg.split(",").map((n) => n.trim()).filter(Boolean);
  const results = findFieldsByNames(contentModel, names);
  process.stdout.write(JSON.stringify(results, null, 2) + "\n");
  process.exit(results.every((r) => r.found) ? 0 : 1);
}
