// Shared content model walk utilities.
// Imported at build time by:
//   skills/forms-content-author/forms-content-update/scripts/src/find-field.js
//   skills/forms-content-author/forms-content-update/scripts/src/find-rule-refs.js
//   skills/forms-content-author/forms-content-update/scripts/src/rewrite-rule-refs.js
//
// esbuild inlines this into each bundle — no runtime dependency.

export const PANEL_FIELD_TYPES = new Set([
  "panelcontainer",
  "accordion",
  "wizard",
  "tabsontop",
  "verticaltabs",
  "fragment",
  "review",
]);

export const FIELD_TYPE_TO_TYPE = {
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
  form: "FORM",
};

export function fieldTypeToType(fieldType) {
  if (!fieldType) return "AFCOMPONENT|FIELD";
  if (PANEL_FIELD_TYPES.has(fieldType)) return "AFCOMPONENT|PANEL|OBJECT";
  return FIELD_TYPE_TO_TYPE[fieldType] || "AFCOMPONENT|FIELD";
}

// sortedValues: returns items sorted by numeric capi-index as [{ idx, entry }]
export function sortedValues(itemsObj) {
  if (!itemsObj || typeof itemsObj !== "object") return [];
  return Object.entries(itemsObj)
    .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
    .map(([idx, entry]) => ({ idx, entry }));
}

// findFormRoot: returns the top-level form container (fieldType === 'form') or first item
export function findFormRoot(contentModel) {
  const top = sortedValues(contentModel.items || {});
  const found =
    top.find(({ entry: e }) => e.properties?.fieldType === "form") || top[0];
  return found ? found.entry : null;
}

// walkItems: recursively visits every node in itemsObj.
// visitor(entry, ctx) where ctx = { name, qualifiedId, capiKey, pointer, depth }
// capiKey and pointer are computed from parent path + current index (consistent with capi-key stored in entries).
export function walkItems(
  itemsObj,
  parentQualifiedId,
  parentCapiKey,
  parentPointer,
  depth,
  visitor,
) {
  for (const { idx, entry } of sortedValues(itemsObj)) {
    const name = entry.properties?.name || entry.id || "";
    const qualifiedId = parentQualifiedId
      ? `${parentQualifiedId}.${name}`
      : name;
    const capiKey = parentCapiKey ? `${parentCapiKey}:${idx}` : idx;
    const pointer = `${parentPointer}/items/${idx}`;
    visitor(entry, { name, qualifiedId, capiKey, pointer, depth });
    walkItems(
      entry.items || {},
      qualifiedId,
      capiKey,
      pointer,
      depth + 1,
      visitor,
    );
  }
}
