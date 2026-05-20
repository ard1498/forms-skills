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
    function capiToAppendPointer(panelCapiKey) {
      return capiToPointer(panelCapiKey) + "/items/-";
    }
    function capiToInsertPointer(panelCapiKey, index) {
      return capiToPointer(panelCapiKey) + `/items/${index}`;
    }
    module2.exports = { capiToPointer, capiToPropertyPointer, capiToAppendPointer, capiToInsertPointer };
  }
});

// lib/list-form-fields-logic.js
var require_list_form_fields_logic = __commonJS({
  "lib/list-form-fields-logic.js"(exports2, module2) {
    "use strict";
    var { capiToPointer } = require_capi_to_pointer();
    var PANEL_TYPE_PATTERNS = ["panelcontainer", "accordion", "wizard", "tabsontop", "verticaltabs", "fragment", "review"];
    function isPanel(componentType) {
      if (!componentType) return false;
      const normalized = componentType.toLowerCase();
      return PANEL_TYPE_PATTERNS.some((p) => normalized.includes(p));
    }
    function listFormFields2(contentModel2) {
      const results = [];
      function scan(items, depth, parentCapiKey) {
        for (const entry of Object.values(items || {})) {
          const capiKey = entry["capi-key"];
          const pointer = capiToPointer(capiKey);
          const componentType = entry.componentType || "";
          const hasChildren = entry.items && Object.keys(entry.items).length > 0;
          results.push({
            name: entry.properties?.name || entry.id || null,
            capiKey,
            pointer,
            componentType,
            fieldType: entry.properties?.fieldType || null,
            parentCapiKey: parentCapiKey || null,
            depth,
            isPanel: isPanel(componentType),
            hasChildren: !!hasChildren
          });
          if (hasChildren) {
            scan(entry.items, depth + 1, capiKey);
          }
        }
      }
      scan(contentModel2.items, 1, null);
      return results;
    }
    module2.exports = { listFormFields: listFormFields2 };
  }
});

// list-form-fields.js
var { listFormFields } = require_list_form_fields_logic();
function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : void 0;
  };
  return { contentModelJson: get("--content-model") };
}
var { contentModelJson } = parseArgs(process.argv);
if (!contentModelJson) {
  console.error("Usage: node list-form-fields.js --content-model '<json>'");
  process.exit(2);
}
var contentModel;
try {
  contentModel = JSON.parse(contentModelJson);
} catch {
  console.error("--content-model must be valid JSON");
  process.exit(2);
}
var result = listFormFields(contentModel);
console.log(JSON.stringify(result, null, 2));
process.exit(0);
