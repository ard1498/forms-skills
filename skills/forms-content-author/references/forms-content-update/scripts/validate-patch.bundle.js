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
    function checkNameCollision(contentModel2, proposedName, excludePath = null) {
      const allNames = [];
      let collision = false;
      let existingPath = null;
      function scan(items) {
        for (const entry of Object.values(items || {})) {
          const name = entry.properties?.name;
          const entryPath = entry["capi-key"] ? capiToPointer(entry["capi-key"]) : null;
          if (name) {
            allNames.push(name);
            if (name === proposedName && entryPath !== excludePath && !collision) {
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
    module2.exports = { checkNameCollision };
  }
});

// lib/validate-patch-logic.js
var require_validate_patch_logic = __commonJS({
  "lib/validate-patch-logic.js"(exports2, module2) {
    "use strict";
    var { checkNameCollision } = require_check_name_collision_logic();
    function navigateContent(obj, pointer) {
      const segments = pointer.replace(/^\//, "").split("/").filter(Boolean);
      let current = obj;
      for (const seg of segments) {
        if (current == null || typeof current !== "object") return null;
        if (seg in current) {
          current = current[seg];
        } else if (/^\d+$/.test(seg) && !Array.isArray(current)) {
          const idx = Number(seg);
          const entry = Object.values(current).find((v) => v && v["capi-index"] === idx);
          current = entry ?? null;
        } else {
          current = current[seg];
        }
      }
      return current ?? null;
    }
    function normalizeResourceType(rt) {
      return rt ? rt.replace(/^\/(apps|libs)\//, "") : rt;
    }
    var TYPE_HINT_MAP = {
      "Boolean": { valueType: "boolean", multi: false },
      "String": { valueType: "string", multi: false },
      "String[]": { valueType: "string", multi: true },
      "Long": { valueType: "number", multi: false },
      "Long[]": { valueType: "number", multi: true },
      "Double": { valueType: "number", multi: false },
      "Double[]": { valueType: "number", multi: true }
    };
    function buildDefinitionMap(definition2) {
      const map = /* @__PURE__ */ new Map();
      for (const compDef of definition2.componentDefinitions || []) {
        const typeHints = /* @__PURE__ */ new Map();
        for (const field of compDef.fields || []) {
          const name = field.name.replace(/^\.\//, "");
          if (name.endsWith("@TypeHint") && field.default) {
            typeHints.set(name.slice(0, -"@TypeHint".length), field.default);
          }
        }
        const fields = /* @__PURE__ */ new Map();
        for (const field of compDef.fields || []) {
          const name = field.name.replace(/^\.\//, "");
          if (name.endsWith("@TypeHint")) continue;
          const hint = typeHints.get(name);
          const hintDerived = hint ? TYPE_HINT_MAP[hint] : null;
          const valueType = field.valueType || hintDerived && hintDerived.valueType || null;
          const multi = hintDerived ? hintDerived.multi : field.multi === true;
          fields.set(name, {
            valueType,
            multi,
            required: field.required === true,
            options: (field.options || []).map((o) => typeof o === "object" ? o.value : o)
          });
        }
        const key = normalizeResourceType(compDef.componentType || compDef.resourceType);
        map.set(key, fields);
      }
      return map;
    }
    function getValueType(value) {
      if (value === null) return "null";
      if (Array.isArray(value)) return "array";
      if (typeof value === "boolean") return "boolean";
      if (typeof value === "number") return "number";
      if (typeof value === "string") return "string";
      return typeof value;
    }
    function ensureComponentState(componentStates, pointer, component) {
      if (!componentStates.has(pointer)) {
        componentStates.set(pointer, {
          resourceType: component[":type"] || component.componentType,
          properties: { ...component.properties || {} }
        });
      }
      return componentStates.get(pointer);
    }
    function validatePatchedName(pointer, properties, contentModel2, errors) {
      if (!Object.prototype.hasOwnProperty.call(properties, "name")) return;
      const name = properties.name;
      if (typeof name !== "string") return;
      if (!/^[a-z0-9_]+$/.test(name)) {
        errors.push({
          path: `${pointer}/properties/name`,
          property: "name",
          message: `"name" must use snake_case with letters, digits, and underscores only; got ${JSON.stringify(name)}`
        });
      }
      const collision = checkNameCollision(contentModel2, name, pointer);
      if (collision.collision) {
        errors.push({
          path: `${pointer}/properties/name`,
          property: "name",
          message: `"name" ${JSON.stringify(name)} already exists in the form at ${collision.existingPath}; choose a unique field name`
        });
      }
    }
    function validatePatchedEnums(pointer, properties, errors) {
      const hasEnum = Object.prototype.hasOwnProperty.call(properties, "enum");
      const hasEnumNames = Object.prototype.hasOwnProperty.call(properties, "enumNames");
      if (!hasEnum && !hasEnumNames) return;
      if (!hasEnum) {
        errors.push({
          path: `${pointer}/properties/enumNames`,
          property: "enumNames",
          message: '"enumNames" requires matching "enum" values in the same order'
        });
        return;
      }
      if (!hasEnumNames) {
        errors.push({
          path: `${pointer}/properties/enum`,
          property: "enum",
          message: '"enum" requires matching "enumNames" labels in the same order'
        });
        return;
      }
      if (!Array.isArray(properties.enum)) {
        errors.push({
          path: `${pointer}/properties/enum`,
          property: "enum",
          message: '"enum" must be an array of submitted/stored values'
        });
        return;
      }
      if (!Array.isArray(properties.enumNames)) {
        errors.push({
          path: `${pointer}/properties/enumNames`,
          property: "enumNames",
          message: '"enumNames" must be an array of display labels'
        });
        return;
      }
      const nonStringEnumIndex = properties.enum.findIndex((v) => typeof v !== "string");
      if (nonStringEnumIndex !== -1) {
        errors.push({
          path: `${pointer}/properties/enum[${nonStringEnumIndex}]`,
          property: "enum",
          arrayIndex: nonStringEnumIndex,
          message: `"enum"[${nonStringEnumIndex}] must be a string value`
        });
      }
      const nonStringEnumNameIndex = properties.enumNames.findIndex((v) => typeof v !== "string");
      if (nonStringEnumNameIndex !== -1) {
        errors.push({
          path: `${pointer}/properties/enumNames[${nonStringEnumNameIndex}]`,
          property: "enumNames",
          arrayIndex: nonStringEnumNameIndex,
          message: `"enumNames"[${nonStringEnumNameIndex}] must be a string label`
        });
      }
      if (properties.enum.length !== properties.enumNames.length) {
        errors.push({
          path: `${pointer}/properties/enum`,
          property: "enum",
          message: `"enum" and "enumNames" must have the same length and order; got ${properties.enum.length} values and ${properties.enumNames.length} labels`
        });
      }
    }
    function validatePatchOps2(contentModel2, definition2, patchOps2) {
      const defMap = buildDefinitionMap(definition2);
      const errors = [];
      const componentStates = /* @__PURE__ */ new Map();
      for (const op of patchOps2) {
        const { op: opType, path, value } = op;
        if (!["add", "replace", "remove"].includes(opType)) continue;
        const segments = path.replace(/^\//, "").split("/").filter(Boolean);
        if (segments.length === 0) continue;
        const lastSeg = segments[segments.length - 1];
        const isNumeric = /^\d+$/.test(lastSeg);
        if (isNumeric) continue;
        const secondToLast = segments[segments.length - 2];
        const componentPointer = secondToLast === "properties" ? "/" + segments.slice(0, -2).join("/") : "/" + segments.slice(0, -1).join("/");
        const propertyName = lastSeg;
        const component = navigateContent(contentModel2, componentPointer);
        if (!component || typeof component !== "object") continue;
        const componentState = ensureComponentState(componentStates, componentPointer, component);
        const resourceType = component[":type"] || component["componentType"];
        if (!resourceType) continue;
        const hasDefinitions = (definition2.componentDefinitions || []).length > 0;
        const fieldDefs = defMap.get(normalizeResourceType(resourceType));
        if (!fieldDefs) {
          if (hasDefinitions) {
            errors.push({
              path: componentPointer,
              property: null,
              availableTypes: [...defMap.keys()],
              message: `Component at ${componentPointer} has unknown type "${resourceType}" \u2014 not present in componentDefinitions`
            });
          }
          continue;
        }
        if (opType === "remove") {
          delete componentState.properties[propertyName];
          continue;
        }
        componentState.properties[propertyName] = value;
        const fieldDef = fieldDefs.get(propertyName);
        if (!fieldDef) continue;
        const fieldDefSnapshot = {
          valueType: fieldDef.valueType,
          multi: fieldDef.multi,
          ...fieldDef.options.length > 0 && { options: fieldDef.options },
          ...fieldDef.required && { required: true }
        };
        const isMultiArray = fieldDef.multi && Array.isArray(value);
        const valuesToCheck = isMultiArray ? value : [value];
        for (let i = 0; i < valuesToCheck.length; i++) {
          const v = valuesToCheck[i];
          const elemPath = isMultiArray ? `${path}[${i}]` : path;
          const typeIsCorrect = !fieldDef.valueType || getValueType(v) === fieldDef.valueType;
          if (!typeIsCorrect) {
            errors.push({
              path: elemPath,
              property: propertyName,
              ...isMultiArray && { arrayIndex: i },
              expected: fieldDef.valueType,
              got: getValueType(v),
              fieldDefinition: fieldDefSnapshot,
              message: `"${propertyName}" at ${elemPath}: expected ${fieldDef.valueType}, got ${getValueType(v)} (value: ${JSON.stringify(v)})`
            });
            continue;
          }
          const effectiveAllowed = fieldDef.options && fieldDef.options.length > 0 ? fieldDef.options : [];
          if (effectiveAllowed.length > 0 && !effectiveAllowed.includes(v)) {
            errors.push({
              path: elemPath,
              property: propertyName,
              ...isMultiArray && { arrayIndex: i },
              allowedValues: effectiveAllowed,
              got: v,
              fieldDefinition: fieldDefSnapshot,
              message: `"${propertyName}" at ${elemPath}: ${JSON.stringify(v)} not in allowed values: ${JSON.stringify(effectiveAllowed)}`
            });
          }
        }
      }
      for (const [componentPointer, componentState] of componentStates.entries()) {
        const props = componentState.properties || {};
        validatePatchedName(componentPointer, props, contentModel2, errors);
        validatePatchedEnums(componentPointer, props, errors);
        const hasUncheckedValue = Object.prototype.hasOwnProperty.call(props, "uncheckedValue");
        const hasEnableUncheckedValue = Object.prototype.hasOwnProperty.call(props, "enableUncheckedValue");
        if (hasUncheckedValue && props.enableUncheckedValue !== true) {
          errors.push({
            path: `${componentPointer}/properties/uncheckedValue`,
            property: "uncheckedValue",
            message: '"uncheckedValue" is only valid when "enableUncheckedValue" is true'
          });
        }
        if (hasEnableUncheckedValue && props.enableUncheckedValue === true && !hasUncheckedValue) {
          errors.push({
            path: `${componentPointer}/properties/enableUncheckedValue`,
            property: "enableUncheckedValue",
            message: '"enableUncheckedValue" set to true requires "uncheckedValue"'
          });
        }
      }
      return { valid: errors.length === 0, errors };
    }
    module2.exports = { validatePatchOps: validatePatchOps2, buildDefinitionMap, navigateContent, normalizeResourceType };
  }
});

// validate-patch.js
var { validatePatchOps } = require_validate_patch_logic();
function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : void 0;
  };
  return {
    contentModelJson: get("--content-model"),
    definitionJson: get("--definition"),
    opsJson: get("--ops")
  };
}
var { contentModelJson, definitionJson, opsJson } = parseArgs(process.argv);
if (!contentModelJson || !definitionJson || !opsJson) {
  console.error(
    `Usage: node validate-patch.js --content-model '<json>' --definition '<json>' --ops '[{"op":"replace","path":"...","value":...}]'`
  );
  console.error("");
  console.error("Fetch --content-model via: Sites MCP get-aem-page-content");
  console.error("Fetch --definition via:    Sites MCP get-aem-page-content-definition");
  process.exit(2);
}
var contentModel;
var definition;
var patchOps;
try {
  contentModel = JSON.parse(contentModelJson);
} catch {
  console.error("--content-model must be valid JSON");
  process.exit(2);
}
try {
  definition = JSON.parse(definitionJson);
} catch {
  console.error("--definition must be valid JSON");
  process.exit(2);
}
try {
  patchOps = JSON.parse(opsJson);
} catch {
  console.error("--ops must be a valid JSON array");
  process.exit(2);
}
var result = validatePatchOps(contentModel, definition, patchOps);
console.log(JSON.stringify(result, null, 2));
process.exit(result.valid ? 0 : 1);
