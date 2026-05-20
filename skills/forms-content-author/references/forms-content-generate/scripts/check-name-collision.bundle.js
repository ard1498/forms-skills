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

// lib/check-name-collision-logic.js
var require_check_name_collision_logic = __commonJS({
  "lib/check-name-collision-logic.js"(exports2, module2) {
    "use strict";
    var { capiToPointer } = require_capi_to_pointer();
    function checkNameCollision2(contentModel2, proposedName, excludePath = null) {
      const allNames = [];
      let collision = false;
      let existingPath = null;
      function scan(items) {
        for (const entry of Object.values(items || {})) {
          const name2 = entry.properties?.name;
          const entryPath = entry["capi-key"] ? capiToPointer(entry["capi-key"]) : null;
          if (name2) {
            allNames.push(name2);
            if (name2 === proposedName && entryPath !== excludePath && !collision) {
              collision = true;
              existingPath = entryPath;
            }
          }
          if (entry.items && Object.keys(entry.items).length > 0) {
            scan(entry.items);
          }
        }
      }
      scan(contentModel2.items);
      return { collision, existingPath, allNames };
    }
    module2.exports = { checkNameCollision: checkNameCollision2 };
  }
});

// check-name-collision.js
var { checkNameCollision } = require_check_name_collision_logic();
function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : void 0;
  };
  return { contentModelJson: get("--content-model"), name: get("--name") };
}
var { contentModelJson, name } = parseArgs(process.argv);
if (!contentModelJson || !name) {
  console.error("Usage: node check-name-collision.js --content-model '<json>' --name '<name>'");
  process.exit(2);
}
var contentModel;
try {
  contentModel = JSON.parse(contentModelJson);
} catch {
  console.error("--content-model must be valid JSON");
  process.exit(2);
}
var result = checkNameCollision(contentModel, name);
console.log(JSON.stringify(result, null, 2));
process.exit(result.collision ? 1 : 0);
