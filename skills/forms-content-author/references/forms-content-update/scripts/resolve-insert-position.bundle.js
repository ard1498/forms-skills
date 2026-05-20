#!/usr/bin/env node
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/capi-to-pointer.js
var require_capi_to_pointer = __commonJS({
  "lib/capi-to-pointer.js"(exports2, module2) {
    "use strict";
    function capiToPointer(capiKey) {
      return capiKey.split(":").map((s) => `/items/${s}`).join("");
    }
    function capiToPropertyPointer(capiKey, propertyName) {
      return capiToPointer(capiKey) + `/properties/${propertyName}`;
    }
    function capiToAppendPointer(panelCapiKey2) {
      return capiToPointer(panelCapiKey2) + "/items/-";
    }
    function capiToInsertPointer(panelCapiKey2, index) {
      return capiToPointer(panelCapiKey2) + `/items/${index}`;
    }
    module2.exports = { capiToPointer, capiToPropertyPointer, capiToAppendPointer, capiToInsertPointer };
  }
});

// lib/resolve-insert-position-logic.js
var require_resolve_insert_position_logic = __commonJS({
  "lib/resolve-insert-position-logic.js"(exports2, module2) {
    "use strict";
    var { capiToAppendPointer, capiToInsertPointer } = require_capi_to_pointer();
    function navigateToCapiKey(contentModel2, panelCapiKey2) {
      const segments = panelCapiKey2.split(":");
      let currentItems = contentModel2.items;
      let current = null;
      let builtKey = "";
      for (let i = 0; i < segments.length; i++) {
        builtKey = segments.slice(0, i + 1).join(":");
        current = Object.values(currentItems || {}).find((e) => e["capi-key"] === builtKey);
        if (!current) return null;
        if (i < segments.length - 1) currentItems = current.items;
      }
      return current;
    }
    function resolveInsertPosition2(contentModel2, panelCapiKey2) {
      const panel = navigateToCapiKey(contentModel2, panelCapiKey2);
      if (!panel) {
        return { error: `panel not found: ${panelCapiKey2}` };
      }
      const appendPointer = capiToAppendPointer(panelCapiKey2);
      const children = panel.items ? Object.values(panel.items) : [];
      if (children.length === 0) {
        return {
          pointer: appendPointer,
          appendPointer,
          insertBefore: null,
          nextIndex: 0
        };
      }
      let maxCapiIndex = -Infinity;
      for (const child of children) {
        const idx = child["capi-index"];
        if (typeof idx === "number" && idx > maxCapiIndex) maxCapiIndex = idx;
      }
      const actionChildren = children.filter((c) => {
        const ct = c.componentType || "";
        return /\/actions\/(submit|reset)$/.test(ct);
      });
      let actionChild = null;
      if (actionChildren.length > 0) {
        actionChild = actionChildren.reduce(
          (prev, cur) => cur["capi-index"] < prev["capi-index"] ? cur : prev
        );
      }
      if (actionChild) {
        const actionType = /\/actions\/(submit|reset)$/.exec(actionChild.componentType)[1];
        const nextIndex2 = actionChild["capi-index"];
        return {
          pointer: capiToInsertPointer(panelCapiKey2, nextIndex2),
          appendPointer,
          insertBefore: actionType,
          nextIndex: nextIndex2
        };
      }
      const nextIndex = maxCapiIndex + 1;
      return {
        pointer: capiToInsertPointer(panelCapiKey2, nextIndex),
        appendPointer,
        insertBefore: null,
        nextIndex
      };
    }
    module2.exports = { resolveInsertPosition: resolveInsertPosition2, navigateToCapiKey };
  }
});

// resolve-insert-position.js
var { resolveInsertPosition } = require_resolve_insert_position_logic();
function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : void 0;
  };
  return {
    contentModelJson: get("--content-model"),
    panelCapiKey: get("--panel-capi-key")
  };
}
var { contentModelJson, panelCapiKey } = parseArgs(process.argv);
if (!contentModelJson || !panelCapiKey) {
  console.error(
    "Usage: node resolve-insert-position.js --content-model '<json>' --panel-capi-key '0:2'"
  );
  console.error("");
  console.error("Fetch --content-model via: Sites MCP get-aem-page-content");
  process.exit(2);
}
var contentModel;
try {
  contentModel = JSON.parse(contentModelJson);
} catch {
  console.error("--content-model must be valid JSON");
  process.exit(2);
}
var result = resolveInsertPosition(contentModel, panelCapiKey);
if (result.error) {
  console.error(`Error: ${result.error}`);
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
process.exit(0);
