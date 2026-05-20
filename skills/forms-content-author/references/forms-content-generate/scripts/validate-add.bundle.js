#!/usr/bin/env node
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/@aemforms/af-formatters/lib/date/SkeletonParser.js
var require_SkeletonParser = __commonJS({
  "node_modules/@aemforms/af-formatters/lib/date/SkeletonParser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.ShorthandStyles = void 0;
    exports2.getSkeleton = getSkeleton;
    exports2.parseDateTimeSkeleton = parseDateTimeSkeleton;
    var DATE_TIME_REGEX = (
      // eslint-disable-next-line max-len
      /(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvV]{1,5}|[zZOvVxX]{1,3}|S{1,3}|'(?:[^']|'')*')|[^a-zA-Z']+/g
    );
    var ShorthandStyles = ["full", "long", "medium", "short"];
    exports2.ShorthandStyles = ShorthandStyles;
    var testDate = new Date(2e3, 2, 1, 2, 3, 4);
    function getSkeleton(skeleton, language) {
      if (ShorthandStyles.find((type) => skeleton.includes(type))) {
        const parsed = parseDateStyle(skeleton, language);
        const result2 = [];
        const symbols = {
          month: "M",
          year: "Y",
          day: "d"
        };
        parsed.forEach((_ref) => {
          let [type, option, length] = _ref;
          if (type in symbols) {
            result2.push(Array(length).fill(symbols[type]).join(""));
          } else if (type === "literal") {
            result2.push(option);
          }
        });
        return result2.join("");
      }
      return skeleton;
    }
    function parseDateStyle(skeleton, language) {
      const options = {};
      const styles = skeleton.split(/\s/).filter((s) => s.length);
      options.dateStyle = styles[0];
      if (styles.length > 1) options.timeStyle = styles[1];
      const testDate2 = new Date(2e3, 2, 1, 2, 3, 4);
      const parts = new Intl.DateTimeFormat(language, options).formatToParts(testDate2);
      const formattedMarch = parts.find((p) => p.type === "month").value;
      const longMarch = new Intl.DateTimeFormat(language, {
        month: "long"
      }).formatToParts(testDate2)[0].value;
      const shortMarch = new Intl.DateTimeFormat(language, {
        month: "short"
      }).formatToParts(testDate2)[0].value;
      const result2 = [];
      parts.forEach((_ref2) => {
        let {
          type,
          value
        } = _ref2;
        let option;
        if (type === "month") {
          option = {
            [formattedMarch]: skeleton === "medium" ? "short" : "long",
            [longMarch]: "long",
            [shortMarch]: "short",
            "03": "2-digit",
            "3": "numeric"
          }[value];
        }
        if (type === "year") option = {
          "2000": "numeric",
          "00": "2-digit"
        }[value];
        if (["day", "hour", "minute", "second"].includes(type)) option = value.length === 2 ? "2-digit" : "numeric";
        if (type === "literal") option = value;
        if (type === "dayPeriod") option = "short";
        result2.push([type, option, value.length]);
      });
      return result2;
    }
    function parseDateTimeSkeleton(skeleton, language) {
      if (ShorthandStyles.find((type) => skeleton.includes(type))) {
        return parseDateStyle(skeleton, language);
      }
      const result2 = [];
      skeleton.replace(DATE_TIME_REGEX, (match) => {
        const len = match.length;
        switch (match[0]) {
          case "G":
            result2.push(["era", len === 4 ? "long" : len === 5 ? "narrow" : "short", len]);
            break;
          case "y":
            result2.push(["year", len === 2 ? "2-digit" : "numeric", len]);
            break;
          case "Y":
          case "u":
          case "U":
          case "r":
            throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");
          case "q":
          case "Q":
            throw new RangeError("`q/Q` (quarter) patterns are not supported");
          case "M":
          case "L":
            result2.push(["month", ["numeric", "2-digit", "short", "long", "narrow"][len - 1], len]);
            break;
          case "w":
          case "W":
            throw new RangeError("`w/W` (week) patterns are not supported");
          case "d":
            result2.push(["day", ["numeric", "2-digit"][len - 1], len]);
            break;
          case "D":
          case "F":
          case "g":
            throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");
          case "E":
            result2.push(["weekday", ["short", "short", "short", "long", "narrow", "narrow"][len - 1], len]);
            break;
          case "e":
            if (len < 4) {
              throw new RangeError("`e..eee` (weekday) patterns are not supported");
            }
            result2.push(["weekday", ["short", "long", "narrow", "short"][len - 4], len]);
            break;
          case "c":
            if (len < 3 || len > 5) {
              throw new RangeError("`c, cc, cccccc` (weekday) patterns are not supported");
            }
            result2.push(["weekday", ["short", "long", "narrow", "short"][len - 3], len]);
            break;
          case "a":
            result2.push(["hour12", true, 1]);
            break;
          case "b":
          case "B":
            throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");
          case "h":
            result2.push(["hourCycle", "h12"]);
            result2.push(["hour", ["numeric", "2-digit"][len - 1], len]);
            break;
          case "H":
            result2.push(["hourCycle", "h23", 1]);
            result2.push(["hour", ["numeric", "2-digit"][len - 1], len]);
            break;
          case "K":
            result2.push(["hourCycle", "h11", 1]);
            result2.push(["hour", ["numeric", "2-digit"][len - 1], len]);
            break;
          case "k":
            result2.push(["hourCycle", "h24", 1]);
            result2.push(["hour", ["numeric", "2-digit"][len - 1], len]);
            break;
          case "j":
          case "J":
          case "C":
            throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");
          case "m":
            result2.push(["minute", ["numeric", "2-digit"][len - 1], len]);
            break;
          case "s":
            result2.push(["second", ["numeric", "2-digit"][len - 1], len]);
            break;
          case "S":
            result2.push(["fractionalSecondDigits", len, len]);
            break;
          case "A":
            throw new RangeError("`S/A` (millisecond) patterns are not supported, use `s` instead");
          case "O":
            result2.push(["timeZoneName", len < 4 ? "shortOffset" : "longOffset", len]);
            result2.push(["x-timeZoneName", len < 4 ? "O" : "OOOO", len]);
            break;
          case "X":
          case "x":
          case "Z":
            result2.push(["timeZoneName", "longOffset", 1]);
            result2.push(["x-timeZoneName", match, 1]);
            break;
          case "z":
          case "v":
          case "V":
            throw new RangeError("z/v/V` (timeZone) patterns are not supported, use `X/x/Z/O` instead");
          case "'":
            result2.push(["literal", match.slice(1, -1).replace(/''/g, "'"), -1]);
            break;
          default:
            result2.push(["literal", match, -1]);
        }
        return "";
      });
      return result2;
    }
  }
});

// node_modules/@aemforms/af-formatters/lib/number/currencies.js
var require_currencies = __commonJS({
  "node_modules/@aemforms/af-formatters/lib/number/currencies.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.getCurrency = void 0;
    var currencies = {
      "da-DK": "DKK",
      "de-DE": "EUR",
      "en-US": "USD",
      "en-GB": "GBP",
      "es-ES": "EUR",
      "fi-FI": "EUR",
      "fr-FR": "EUR",
      "it-IT": "EUR",
      "ja-JP": "JPY",
      "nb-NO": "NOK",
      "nl-NL": "EUR",
      "pt-BR": "BRL",
      "sv-SE": "SEK",
      "zh-CN": "CNY",
      "zh-TW": "TWD",
      "ko-KR": "KRW",
      "cs-CZ": "CZK",
      "pl-PL": "PLN",
      "ru-RU": "RUB",
      "tr-TR": "TRY"
    };
    var locales = Object.keys(currencies);
    var getCurrency = function(locale) {
      if (locales.indexOf(locale) > -1) {
        return currencies[locale];
      } else {
        const matchingLocale = locales.find((x) => x.startsWith(locale));
        if (matchingLocale) {
          return currencies[matchingLocale];
        }
      }
      return "";
    };
    exports2.getCurrency = getCurrency;
  }
});

// node_modules/@aemforms/af-formatters/lib/number/SkeletonParser.js
var require_SkeletonParser2 = __commonJS({
  "node_modules/@aemforms/af-formatters/lib/number/SkeletonParser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.ShorthandStyles = void 0;
    exports2.parseNumberSkeleton = parseNumberSkeleton;
    var _currencies = require_currencies();
    var NUMBER_REGEX = (
      // eslint-disable-next-line max-len
      /(?:[#]+|[@]+(#+)?|[0]+|[,]|[.]|[-]|[+]|[%]|[¤]{1,4}(?:\/([a-zA-Z]{3}))?|[;]|[K]{1,2}|E{1,2}[+]?|'(?:[^']|'')*')|[^a-zA-Z']+/g
    );
    var supportedUnits = ["acre", "bit", "byte", "celsius", "centimeter", "day", "degree", "fahrenheit", "fluid-ounce", "foot", "gallon", "gigabit", "gigabyte", "gram", "hectare", "hour", "inch", "kilobit", "kilobyte", "kilogram", "kilometer", "liter", "megabit", "megabyte", "meter", "mile", "mile-scandinavian", "milliliter", "millimeter", "millisecond", "minute", "month", "ounce", "percent", "petabyte", "pound", "second", "stone", "terabit", "terabyte", "week", "yard", "year"].join("|");
    var ShorthandStyles = [/^currency(?:\/([a-zA-Z]{3}))?$/, /^decimal$/, /^integer$/, /^percent$/, new RegExp(`^unit/(${supportedUnits})$`)];
    exports2.ShorthandStyles = ShorthandStyles;
    function parseNumberSkeleton(skeleton, language) {
      const options2 = {};
      const order = [];
      let match, index;
      for (index = 0; index < ShorthandStyles.length && match == null; index++) {
        match = ShorthandStyles[index].exec(skeleton);
      }
      if (match) {
        switch (index) {
          case 1:
            options2.style = "currency";
            options2.currencyDisplay = "narrowSymbol";
            if (match[1]) {
              options2.currency = match[1];
            } else {
              options2.currency = (0, _currencies.getCurrency)(language);
            }
            break;
          case 2:
            const defaultOptions = new Intl.NumberFormat(language, {}).resolvedOptions();
            options2.minimumFractionDigits = options2.minimumFractionDigits || 2;
            break;
          case 3:
            options2.minimumFractionDigits = 0;
            options2.maximumFractionDigits = 0;
            break;
          case 4:
            options2.style = "percent";
            options2.maximumFractionDigits = 2;
            break;
          case 5:
            options2.style = "unit";
            options2.unitDisplay = "long";
            options2.unit = match[1];
            break;
        }
        return {
          options: options2,
          order
        };
      }
      options2.useGrouping = false;
      options2.minimumIntegerDigits = 1;
      options2.maximumFractionDigits = 0;
      options2.minimumFractionDigits = 0;
      skeleton.replace(NUMBER_REGEX, (match2, maxSignificantDigits, currencySymbol, offset) => {
        const len = match2.length;
        switch (match2[0]) {
          case "#":
            order.push(["digit", len]);
            if ((options2 === null || options2 === void 0 ? void 0 : options2.decimal) === true) {
              options2.maximumFractionDigits = options2.minimumFractionDigits + len;
            }
            break;
          case "@":
            if (options2 !== null && options2 !== void 0 && options2.minimumSignificantDigits) {
              throw "@ symbol should occur together";
            }
            const hashes = maxSignificantDigits || "";
            order.push(["@", len - hashes.length]);
            options2.minimumSignificantDigits = len - hashes.length;
            options2.maximumSignificantDigits = len;
            order.push(["digit", hashes.length]);
            break;
          case ",":
            if ((options2 === null || options2 === void 0 ? void 0 : options2.decimal) === true) {
              throw "grouping character not supporting for fractions";
            }
            order.push(["group", 1]);
            options2.useGrouping = "auto";
            break;
          case ".":
            if (options2 !== null && options2 !== void 0 && options2.decimal) {
              console.error("only one decimal symbol is allowed");
            } else {
              order.push(["decimal", 1]);
              options2.decimal = true;
            }
            break;
          case "0":
            order.push("0", len);
            if (options2.minimumSignificantDigits || options2.maximumSignificantDigits) {
              throw "0 is not supported with @";
            }
            if ((options2 === null || options2 === void 0 ? void 0 : options2.decimal) === true) {
              options2.minimumFractionDigits = len;
              if (!options2.maximumFractionDigits) {
                options2.maximumFractionDigits = len;
              }
            } else {
              options2.minimumIntegerDigits = len;
            }
            break;
          case "-":
            if (offset !== 0) {
              console.error("sign display is always in the beginning");
            }
            options2.signDisplay = "negative";
            order.push(["signDisplay", 1, "-"]);
            break;
          case "+":
            if (offset !== 0 && order[order.length - 1][0] === "E") {
              console.error("sign display is always in the beginning");
            }
            if (offset === 0) {
              options2.signDisplay = "always";
            }
            order.push(["signDisplay", 1, "+"]);
            break;
          case "\xA4":
            if (offset !== 0 && offset !== skeleton.length - 1) {
              console.error("currency display should be either in the beginning or at the end");
            } else {
              options2.style = "currency";
              options2.currencyDisplay = ["symbol", "code", "name", "narrowSymbol"][len - 1];
              options2.currency = currencySymbol || (0, _currencies.getCurrency)(language);
              order.push(["currency", len]);
            }
            break;
          case "%":
            if (offset !== 0 && offset !== skeleton.length - 1) {
              console.error("percent display should be either in the beginning or at the end");
            } else {
              order.push(["%", 1]);
              options2.style = "percent";
            }
            break;
          case "E":
            order.push(["E", len]);
            options2.style = ["scientific", "engineering"](len - 1);
            break;
          default:
            console.error("unknown chars" + match2);
        }
      });
      return {
        options: options2,
        order
      };
    }
  }
});

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
    function ensureComponentState(componentStates, pointer, component2) {
      if (!componentStates.has(pointer)) {
        componentStates.set(pointer, {
          resourceType: component2[":type"] || component2.componentType,
          properties: { ...component2.properties || {} }
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
    function validatePatchOps(contentModel2, definition2, patchOps) {
      const defMap = buildDefinitionMap(definition2);
      const errors = [];
      const componentStates = /* @__PURE__ */ new Map();
      for (const op of patchOps) {
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
        const component2 = navigateContent(contentModel2, componentPointer);
        if (!component2 || typeof component2 !== "object") continue;
        const componentState = ensureComponentState(componentStates, componentPointer, component2);
        const resourceType = component2[":type"] || component2["componentType"];
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
    module2.exports = { validatePatchOps, buildDefinitionMap, navigateContent, normalizeResourceType };
  }
});

// lib/validate-add-logic.js
var require_validate_add_logic = __commonJS({
  "lib/validate-add-logic.js"(exports2, module2) {
    "use strict";
    var { parseDateTimeSkeleton } = require_SkeletonParser();
    var { parseNumberSkeleton, ShorthandStyles: NUMBER_SHORTHAND } = require_SkeletonParser2();
    var { buildDefinitionMap, normalizeResourceType } = require_validate_patch_logic();
    var { checkNameCollision } = require_check_name_collision_logic();
    function getValueType(value) {
      if (value === null) return "null";
      if (Array.isArray(value)) return "array";
      return typeof value;
    }
    function validateDateSkeleton(value) {
      if (value === "") return null;
      try {
        const parts = parseDateTimeSkeleton(value, "en-US");
        const hasDatePart = parts.some(
          ([type]) => ["year", "month", "day", "weekday"].includes(type)
        );
        if (!hasDatePart) {
          return `"displayFormat" invalid date skeleton "${value}" \u2014 no recognizable date fields (use y=year, M/L=month, d=day, E=weekday, or shorthand full/long/medium/short)`;
        }
        return null;
      } catch (e) {
        return `"displayFormat" invalid date skeleton "${value}": ${e.message}`;
      }
    }
    function validateNumberSkeleton(value) {
      if (value === "") return null;
      if (NUMBER_SHORTHAND.some((re) => re.test(value))) return null;
      try {
        const { order } = parseNumberSkeleton(value, "en-US");
        if (order.length === 0) {
          return `"displayFormat" invalid number skeleton "${value}" \u2014 no recognizable pattern tokens (use shorthand: decimal|integer|percent|currency[/XXX]|unit/<name>, or pattern: #,##0.##)`;
        }
        return null;
      } catch (e) {
        return `"displayFormat" invalid number skeleton "${value}": ${e.message}`;
      }
    }
    function collectRequiredKeys(definition2, componentType) {
      const normalized = normalizeResourceType(componentType);
      const required = /* @__PURE__ */ new Map();
      for (const rule of definition2.placementRules || []) {
        for (const ins of rule.action?.allowedInsertions || []) {
          if (normalizeResourceType(ins.componentDefinitionRef) !== normalized) continue;
          for (const key of ins.requiredKeys || []) {
            const propName = key.replace(/^\.\//, "");
            if (!required.has(propName)) {
              required.set(propName, ins.mandatoryProperties?.[key] || "Required field");
            }
          }
        }
      }
      return required;
    }
    function findNodeByCapiKey(items, targetKey) {
      for (const entry of Object.values(items || {})) {
        if (entry["capi-key"] === targetKey) return entry;
        const found = findNodeByCapiKey(entry.items, targetKey);
        if (found) return found;
      }
      return null;
    }
    function findPlacementRule(definition2, containerId) {
      return (definition2.placementRules || []).find(
        (r) => r.id === containerId || r.id.endsWith("/" + containerId)
      );
    }
    function getContainerContext(definition2, contentModel2, panelCapiKey2) {
      if (!contentModel2 || !panelCapiKey2) return null;
      const parent = findNodeByCapiKey(contentModel2.items, panelCapiKey2);
      if (!parent || !parent.id) return null;
      const directRule = findPlacementRule(definition2, parent.id);
      if (directRule) {
        return { parentId: parent.id, rule: directRule, ruleSource: parent.id };
      }
      if (parent.id !== "guideContainer") {
        const fallbackRule = findPlacementRule(definition2, "guideContainer");
        if (fallbackRule) {
          return { parentId: parent.id, rule: fallbackRule, ruleSource: "guideContainer" };
        }
      }
      return { parentId: parent.id, rule: null, ruleSource: null };
    }
    function listSuggestedComponentTypes(definition2, containerContext, limit = 8) {
      if (containerContext?.rule) {
        return (containerContext.rule.action?.allowedInsertions || []).map((ins) => normalizeResourceType(ins.componentDefinitionRef)).slice(0, limit);
      }
      return (definition2.componentDefinitions || []).map((def) => normalizeResourceType(def.componentType || def.resourceType)).slice(0, limit);
    }
    function validateNameProperties(component2, contentModel2, errors) {
      const props = component2.properties || {};
      if (!Object.prototype.hasOwnProperty.call(props, "name")) return;
      const name = props.name;
      if (typeof name !== "string") return;
      if (!/^[a-z0-9_]+$/.test(name)) {
        errors.push(
          `"name" must use snake_case with letters, digits, and underscores only; got ${JSON.stringify(name)}`
        );
      }
      if (contentModel2) {
        const collision = checkNameCollision(contentModel2, name);
        if (collision.collision) {
          errors.push(
            `"name" ${JSON.stringify(name)} already exists in the form at ${collision.existingPath}; choose a unique field name`
          );
        }
      }
    }
    function validateEnumProperties(component2, errors) {
      const props = component2.properties || {};
      const hasEnum = Object.prototype.hasOwnProperty.call(props, "enum");
      const hasEnumNames = Object.prototype.hasOwnProperty.call(props, "enumNames");
      if (!hasEnum && !hasEnumNames) return;
      if (!hasEnum) {
        errors.push('"enumNames" requires matching "enum" values in the same order');
        return;
      }
      if (!hasEnumNames) {
        errors.push('"enum" requires matching "enumNames" labels in the same order');
        return;
      }
      if (!Array.isArray(props.enum)) {
        errors.push('"enum" must be an array of submitted/stored values');
        return;
      }
      if (!Array.isArray(props.enumNames)) {
        errors.push('"enumNames" must be an array of display labels');
        return;
      }
      const nonStringEnumIndex = props.enum.findIndex((v) => typeof v !== "string");
      if (nonStringEnumIndex !== -1) {
        errors.push(`"enum"[${nonStringEnumIndex}] must be a string value`);
      }
      const nonStringEnumNameIndex = props.enumNames.findIndex((v) => typeof v !== "string");
      if (nonStringEnumNameIndex !== -1) {
        errors.push(`"enumNames"[${nonStringEnumNameIndex}] must be a string label`);
      }
      if (props.enum.length !== props.enumNames.length) {
        errors.push(
          `"enum" and "enumNames" must have the same length and order; got ${props.enum.length} values and ${props.enumNames.length} labels`
        );
      }
    }
    function validateConditionalCheckboxProperties(component2, errors) {
      const props = component2.properties || {};
      const hasUncheckedValue = Object.prototype.hasOwnProperty.call(props, "uncheckedValue");
      const hasEnableUncheckedValue = Object.prototype.hasOwnProperty.call(props, "enableUncheckedValue");
      if (hasUncheckedValue && props.enableUncheckedValue !== true) {
        errors.push(
          '"uncheckedValue" is only valid when "enableUncheckedValue" is true'
        );
      }
      if (hasEnableUncheckedValue && props.enableUncheckedValue === true && !hasUncheckedValue) {
        errors.push(
          '"enableUncheckedValue" set to true requires "uncheckedValue"'
        );
      }
    }
    function checkPlacement(definition2, contentModel2, panelCapiKey2, component2) {
      const containerContext = getContainerContext(definition2, contentModel2, panelCapiKey2);
      if (!containerContext) return [];
      const { parentId, rule, ruleSource } = containerContext;
      if (!rule) return [];
      const normalizedChild = normalizeResourceType(component2.componentType);
      const allowed = (rule.action?.allowedInsertions || []).some(
        (ins) => normalizeResourceType(ins.componentDefinitionRef) === normalizedChild
      );
      if (!allowed) {
        const childName = component2.componentType.split("/").pop();
        const suggestions = listSuggestedComponentTypes(definition2, containerContext).join(", ");
        const sourceNote = ruleSource && ruleSource !== parentId ? ` using "${ruleSource}" fallback rules` : "";
        return [
          `"${childName}" is not an allowed insertion inside container "${parentId}"${sourceNote}. Allowed componentTypes include: ${suggestions}`
        ];
      }
      return [];
    }
    function validateAddComponent2(definition2, component2, contentModel2, panelCapiKey2) {
      const errors = [];
      if (!component2.id) errors.push('missing required field "id"');
      if ("items" in component2 && !Array.isArray(component2.items)) {
        errors.push('"items" must be an array when present \u2014 use [] for empty panels, [child, ...] for panels with pre-populated children; never use {} (object)');
      }
      if (!component2.componentType) errors.push('missing required field "componentType"');
      if ("capi-key" in component2) errors.push('"capi-key" must not be in patch value \u2014 server generates this');
      if ("capi-index" in component2) errors.push('"capi-index" must not be in patch value \u2014 server generates this');
      if (!component2.componentType) return { valid: errors.length === 0, errors };
      const defMap = buildDefinitionMap(definition2);
      const normalizedType = normalizeResourceType(component2.componentType);
      const hasDefinitions = (definition2.componentDefinitions || []).length > 0;
      const fieldDefs = defMap.get(normalizedType);
      const containerContext = getContainerContext(definition2, contentModel2, panelCapiKey2);
      if (!fieldDefs) {
        if (!hasDefinitions) {
          errors.push(
            `definition has no componentDefinitions \u2014 fetch via get-aem-page-content-definition before calling validate-add`
          );
        } else {
          const targetNote = containerContext?.parentId ? ` for target container "${containerContext.parentId}"` : "";
          const sourceNote = containerContext?.ruleSource && containerContext.ruleSource !== containerContext.parentId ? ` (validated with "${containerContext.ruleSource}" fallback rules)` : "";
          const suggestions = listSuggestedComponentTypes(definition2, containerContext).join(", ");
          errors.push(
            `unknown componentType: ${component2.componentType}${targetNote}${sourceNote}. Use one of: ${suggestions}`
          );
        }
        return { valid: false, errors };
      }
      if (fieldDefs && component2.properties) {
        const fieldType = component2.properties.fieldType;
        for (const [propName, propValue] of Object.entries(component2.properties)) {
          if (Array.isArray(propValue)) continue;
          const fieldDef = fieldDefs.get(propName);
          if (!fieldDef) continue;
          const actualType = getValueType(propValue);
          if (fieldDef.valueType && actualType !== fieldDef.valueType) {
            errors.push(
              `"${propName}" expected ${fieldDef.valueType}, got ${actualType} (value: ${JSON.stringify(propValue)})`
            );
            continue;
          }
          if (fieldDef.options && fieldDef.options.length > 0 && !fieldDef.options.includes(propValue)) {
            errors.push(
              `"${propName}" value ${JSON.stringify(propValue)} not in allowed values: ${JSON.stringify(fieldDef.options)}`
            );
          }
          if (propName === "dorColspan") {
            if (!Number.isInteger(propValue) || propValue < 1 || propValue > 12) {
              errors.push(`"dorColspan" must be an integer between 1 and 12, got ${propValue}`);
            }
          }
          if (propName === "displayFormat" || propName === "editFormat") {
            if (fieldType === "date-input") {
              const err = validateDateSkeleton(propValue);
              if (err) errors.push(err);
            } else if (fieldType === "number-input") {
              const err = validateNumberSkeleton(propValue);
              if (err) errors.push(err);
            }
          }
        }
      }
      validateNameProperties(component2, contentModel2, errors);
      validateEnumProperties(component2, errors);
      validateConditionalCheckboxProperties(component2, errors);
      if ((definition2.placementRules || []).length > 0) {
        const required = collectRequiredKeys(definition2, component2.componentType);
        const props = component2.properties || {};
        for (const [propName, desc] of required) {
          if (!(propName in props)) {
            errors.push(`missing required property "${propName}": ${desc}`);
          }
        }
      }
      if (contentModel2 && panelCapiKey2) {
        errors.push(...checkPlacement(definition2, contentModel2, panelCapiKey2, component2));
      }
      return { valid: errors.length === 0, errors };
    }
    module2.exports = { validateAddComponent: validateAddComponent2 };
  }
});

// validate-add.js
var { validateAddComponent } = require_validate_add_logic();
function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : void 0;
  };
  return {
    definitionJson: get("--definition"),
    componentJson: get("--component"),
    contentModelJson: get("--content-model"),
    panelCapiKey: get("--panel-capi-key")
  };
}
var { definitionJson, componentJson, contentModelJson, panelCapiKey } = parseArgs(process.argv);
if (!definitionJson || !componentJson) {
  console.error(
    `Usage: node validate-add.js --definition '<json>' --component '{"id":"...","componentType":"...","properties":{},"items":{}}' [--content-model '<json>'] [--panel-capi-key '0:2']`
  );
  console.error("");
  console.error("Fetch --definition via: Sites MCP get-aem-page-content-definition");
  console.error("Optional: --content-model + --panel-capi-key enables placement check");
  process.exit(2);
}
var definition;
var component;
var contentModel;
try {
  definition = JSON.parse(definitionJson);
} catch {
  console.error("--definition must be valid JSON");
  process.exit(2);
}
try {
  component = JSON.parse(componentJson);
} catch {
  console.error("--component must be valid JSON");
  process.exit(2);
}
if (contentModelJson) {
  try {
    contentModel = JSON.parse(contentModelJson);
  } catch {
    console.error("--content-model must be valid JSON");
    process.exit(2);
  }
}
var result = validateAddComponent(definition, component, contentModel, panelCapiKey);
console.log(JSON.stringify(result, null, 2));
process.exit(result.valid ? 0 : 1);
