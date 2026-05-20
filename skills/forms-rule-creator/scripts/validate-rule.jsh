var __import_meta_url__ = require('url').pathToFileURL(__filename).href;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// stub:stub:cfp
var require_stub_cfp = __commonJS({
  "stub:stub:cfp"(exports2, module2) {
    module2.exports = {};
  }
});

// src/cli/_fs.js
var import_fs = require("fs");
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (c) => chunks.push(typeof c === "string" ? c : c.toString("utf8")));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}
async function readFile(p) {
  if (p === 0) {
    return readStdin();
  }
  return import_fs.promises ? import_fs.promises.readFile(p, "utf8") : (0, import_fs.readFile)(p);
}

// src/scope/TypesRegistry.js
var DEFAULT_TYPES_CONFIG = {
  AFCOMPONENT: {
    vars: {
      visible: { name: "visible", type: "BOOLEAN", readOnly: "false" },
      "label.value": { name: "label", type: "STRING", readOnly: "false" },
      "label.visible": { name: "label", type: "BOOLEAN", readOnly: "false" },
      description: { name: "description", type: "STRING", readOnly: "false" },
      properties: { name: "properties", type: "OBJECT", readOnly: "false" },
      tooltip: { name: "tooltip", type: "STRING", readOnly: "true" },
      repeatable: { name: "repeatable", type: "BOOLEAN", readOnly: "true" }
    }
  },
  FIELD: {
    inherits: "AFCOMPONENT",
    vars: {
      dataRef: { name: "dataRef", type: "STRING", readOnly: "true" },
      fieldType: { name: "fieldType", type: "STRING", readOnly: "true" },
      type: { name: "type", type: "STRING", readOnly: "true" },
      lang: { name: "lang", type: "STRING", readOnly: "true" },
      enabled: { name: "enabled", type: "BOOLEAN", readOnly: "false" },
      value: { name: "value", type: "OBJECT|STRING|NUMBER|DATE|BOOLEAN", readOnly: "false" },
      name: { name: "name", type: "STRING", readOnly: "true" },
      readOnly: { name: "readOnly", type: "BOOLEAN", readOnly: "false" },
      required: { name: "required", type: "BOOLEAN", readOnly: "false" },
      screenReaderText: { name: "screenReaderText", type: "STRING", readOnly: "true" },
      valid: { name: "valid", type: "BOOLEAN", readOnly: "false" },
      errorMessage: { name: "errorMessage", type: "STRING", readOnly: "false" },
      placeholder: { name: "placeholder", type: "STRING", readOnly: "false" }
    }
  },
  BUTTON: { inherits: "AFCOMPONENT" },
  "NUMBER FIELD": {
    inherits: "FIELD",
    vars: {
      default: { name: "default", type: "NUMBER", readOnly: "true" },
      minimum: { name: "minimum", type: "NUMBER", readOnly: "false" },
      maximum: { name: "maximum", type: "NUMBER", readOnly: "false" }
    }
  },
  "TEXT FIELD": {
    inherits: "FIELD",
    vars: {
      default: { name: "default", type: "STRING", readOnly: "true" }
    }
  },
  "DATE FIELD": {
    inherits: "FIELD",
    vars: {
      default: { name: "default", type: "DATE", readOnly: "true" },
      minimum: { name: "minimum", type: "DATE", readOnly: "false" },
      maximum: { name: "maximum", type: "DATE", readOnly: "false" }
    }
  },
  "PASSWORD FIELD": {
    inherits: "FIELD",
    vars: {
      default: { name: "default", type: "STRING", readOnly: "true" }
    }
  },
  DROPDOWN: {
    inherits: "FIELD",
    vars: {
      enum: { name: "enum", type: "STRING[]|NUMBER[]|ARRAY", readOnly: "false" },
      enumNames: { name: "enumNames", type: "STRING[]", readOnly: "false" },
      default: { name: "default", type: "STRING", readOnly: "true" }
    }
  },
  "RADIO BUTTON": {
    inherits: "FIELD",
    vars: {
      enum: { name: "enum", type: "STRING[]|NUMBER[]|ARRAY", readOnly: "false" },
      enumNames: { name: "enumNames", type: "STRING[]", readOnly: "false" },
      default: { name: "default", type: "STRING", readOnly: "true" }
    }
  },
  "CHECK BOX": {
    inherits: "FIELD",
    vars: {
      enum: { name: "enum", type: "STRING[]|NUMBER[]|ARRAY", readOnly: "false" },
      enumNames: { name: "enumNames", type: "STRING[]", readOnly: "false" },
      default: { name: "default", type: "STRING", readOnly: "true" }
    }
  },
  SWITCH: {
    inherits: "FIELD",
    vars: {
      default: { name: "default", type: "STRING", readOnly: "true" }
    }
  },
  PANEL: {
    inherits: "AFCOMPONENT",
    vars: {
      valid: { name: "valid", type: "BOOLEAN", readOnly: "true" },
      enabled: { name: "enabled", type: "BOOLEAN", readOnly: "false" },
      title: { name: "title", type: "STRING", readOnly: "false" }
    }
  },
  FORM: {}
};
var FT_TYPE_EXTENSIONS = {
  FT_FORMS_21359: {
    "NUMBER FIELD": {
      minimumMessage: { name: "minimumMessage", type: "STRING", readOnly: "false" },
      maximumMessage: { name: "maximumMessage", type: "STRING", readOnly: "false" }
    },
    "DATE FIELD": {
      minimumMessage: { name: "minimumMessage", type: "STRING", readOnly: "false" },
      maximumMessage: { name: "maximumMessage", type: "STRING", readOnly: "false" }
    }
  }
};
var applyFtExtensions = (baseConfig, toggleProvider) => {
  if (!toggleProvider) {
    return baseConfig;
  }
  const ftVarsByType = Object.entries(FT_TYPE_EXTENSIONS).reduce((acc, [ft, extensions]) => {
    if (!toggleProvider.isEnabled(ft)) {
      return acc;
    }
    Object.entries(extensions).forEach(([typeName, vars]) => {
      acc[typeName] = { ...acc[typeName] || {}, ...vars };
    });
    return acc;
  }, {});
  if (Object.keys(ftVarsByType).length === 0) {
    return baseConfig;
  }
  return Object.fromEntries(
    Object.entries(baseConfig).map(([typeName, typeDef]) => {
      const extra = ftVarsByType[typeName];
      if (!extra) {
        return [typeName, typeDef];
      }
      return [typeName, { ...typeDef, vars: { ...typeDef.vars || {}, ...extra } }];
    })
  );
};
var toTypeTokens = (typeValue) => {
  if (Array.isArray(typeValue)) {
    return typeValue.flatMap((value) => String(value).split("|")).map((value) => value.trim()).filter(Boolean);
  }
  if (typeof typeValue === "string") {
    return typeValue.split("|").map((value) => value.trim()).filter(Boolean);
  }
  return [];
};
var TypesRegistry = class {
  constructor(typesConfig = DEFAULT_TYPES_CONFIG, toggleProvider = null) {
    this.types = applyFtExtensions(typesConfig, toggleProvider);
  }
  getType(typeName) {
    return this.types[typeName];
  }
  getAllowedPropertiesForType(typeValue) {
    const typeTokens = toTypeTokens(typeValue);
    const targetTypes = typeTokens.length > 0 ? typeTokens : ["FIELD"];
    const merged = targetTypes.reduce((acc, typeName) => {
      this._collectTypeVars(typeName).forEach((propertyName) => acc.add(propertyName));
      return acc;
    }, /* @__PURE__ */ new Set());
    return [...merged];
  }
  isPropertyAllowed(typeValue, propertyName) {
    if (typeof propertyName !== "string") {
      return true;
    }
    const allowedProperties = this.getAllowedPropertiesForType(typeValue);
    return allowedProperties.includes(propertyName);
  }
  _collectTypeVars(typeName, visited = /* @__PURE__ */ new Set()) {
    if (!typeName || visited.has(typeName)) {
      return /* @__PURE__ */ new Set();
    }
    const typeConfig = this.getType(typeName);
    if (!typeConfig) {
      return /* @__PURE__ */ new Set();
    }
    const nextVisited = /* @__PURE__ */ new Set([...visited, typeName]);
    const inheritedVars = typeConfig.inherits ? this._collectTypeVars(typeConfig.inherits, nextVisited) : /* @__PURE__ */ new Set();
    const ownVars = new Set(Object.keys(typeConfig.vars || {}));
    return /* @__PURE__ */ new Set([...inheritedVars, ...ownVars]);
  }
};

// src/Toggles.js
var DEFAULT_TOGGLES = {
  // is initialized in binary condition context → true().$value
  FT_FORMS_17090: true,
  // is clicked in binary condition context → true()
  FT_FORMS_21266: true,
  // REMOVE_INSTANCE index strategy: false → length(name) - 1, true → getRelativeInstanceIndex
  FT_FORMS_16466: true,
  // Use awaitFn(retryHandler(requestWithRetry(...))) instead of request(...)
  // for WSDL api-integration
  FT_FORMS_19810: true,
  FT_FORMS_11584: true,
  // Allow EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION as LHS in event conditions
  FT_FORMS_19582: true,
  // TRIGGER_SCRIPTS grammar + validator gating; DISPATCH_EVENT custom: prefix addition
  FT_FORMS_21264: true,
  // TRIGGER_SCRIPTS: map OOTB TRIGGER_EVENTs to canonical event names
  FT_FORMS_23571: true,
  // FORMAT_EXPRESSION transformation — 'Display Pattern using Custom Function'
  FT_FORMS_13193: true,
  // constraintMessage merge — off by default
  // (legacy-aligned; no regressions to existing test suite)
  FT_FORMS_21359: false,
  // Callback/async function call transformation
  // (enterCALLBACK, enterCONDITION_BLOCK_STATEMENTS, enterASYNC_FUNCTION_CALL)
  FT_FORMS_13519: true,
  // EVENT_SCRIPTS Else block — makes Else BLOCK_STATEMENTS an optional suffix
  // off by default (legacy-aligned; most rule sets use 3-item EVENT_SCRIPTS)
  FT_FORMS_12053: true,
  FT_FORMS_20129: true,
  // SAVE_FORM statement + "is saved successfully"/"fails to save" event operators
  FT_FORMS_11581: true,
  // NAVIGATE_IN_PANEL statement support
  FT_FORMS_10781: true,
  // SET_VARIABLE / GET_VARIABLE dynamic variable rules
  FT_FORMS_19884: true,
  // WRITE_JSON_FORMULA statement support
  FT_FORMS_20655: true,
  // schemaRef/schemaType emission in FDM (classic WSDL) payloads
  FT_FORMS_9611: true,
  // AEP integration schema-field enrichment — shares code path with FT_FORMS_9611
  FT_FORMS_15407: true,
  // Repeatable-panel field-id rewrite for array-type COMPONENT args in FUNCTION_CALL
  FT_FORMS_14303: true,
  // Optional/default arg placeholder expansion in enterFUNCTION_CALL ($N=default syntax)
  // and isMandatory:false arity leniency in _validateFunctionNode
  FT_FORMS_19581: true
};

// src/toggles/StaticToggleProvider.js
var StaticToggleProvider = class {
  constructor(toggles = DEFAULT_TOGGLES) {
    this._toggles = toggles;
  }
  isEnabled(key) {
    return this._toggles[key] ?? false;
  }
};

// src/scope/FunctionsConfig.js
function buildOOTBFunctions(toggleProvider = { isEnabled: () => false }) {
  const functions = [
    // Math functions
    {
      id: "abs",
      displayName: "Absolute Value Of",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER",
          name: "value",
          description: "value",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the absolute value of the provided argument $value."
    },
    {
      id: "avg",
      displayName: "Average Of",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER[]",
          name: "elements",
          description: "elements",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the average of the elements in the provided array. An empty array will produce a return value of null."
    },
    {
      id: "ceil",
      displayName: "Ceil",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER",
          name: "value",
          description: "value",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the next highest integer value by rounding up if necessary."
    },
    {
      id: "floor",
      displayName: "Floor",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER",
          name: "value",
          description: "value",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the next lowest integer value by rounding down if necessary."
    },
    {
      id: "exp",
      displayName: "Exponent of",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER",
          name: "input",
          description: "number",
          isMandatory: true
        }
      ],
      impl: "$0()",
      description: "Returns e (the base of natural logarithms) raised to a power x"
    },
    {
      id: "power",
      displayName: "Power of",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER",
          name: "a",
          description: "a",
          isMandatory: true
        },
        {
          type: "NUMBER",
          name: "x",
          description: "x",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Computes `a` raised to a power `x`"
    },
    {
      id: "sqrt",
      displayName: "Square Root Of",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER",
          name: "num",
          description: "number whose square root has to be calculated",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Return the square root of a number"
    },
    {
      id: "mod",
      displayName: "Modulo of",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER",
          name: "dividend",
          description: "dividend",
          isMandatory: true
        },
        {
          type: "NUMBER",
          name: "divisor",
          description: "divisor",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Return the remainder when one number is divided by another number."
    },
    {
      id: "round",
      displayName: "Round",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER",
          name: "num",
          description: "number to round off",
          isMandatory: true
        },
        {
          type: "NUMBER",
          name: "precision",
          description: "number is rounded to the specified precision",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Round a number to a specified precision. If precision is not specified, round to the nearest integer"
    },
    {
      id: "trunc",
      displayName: "Truncate a number",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER",
          name: "numA",
          description: "number to truncate",
          isMandatory: true
        },
        {
          type: "NUMBER",
          name: "numB",
          description: "number of digits to truncate the number to",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Truncate a number to a specified number of digits."
    },
    // String functions
    {
      id: "contains",
      displayName: "Contains",
      type: "BOOLEAN",
      args: [
        {
          type: "STRING[]|NUMBER[]|ARRAY|STRING",
          name: "subject",
          description: "subject",
          isMandatory: true
        },
        {
          type: "STRING|BOOLEAN|NUMBER|DATE",
          name: "search",
          description: "search",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Returns true if the given $subject contains the provided $search string. If $subject is an array, this function returns true if one of the elements in the array is equal to the provided $search value. If the provided $subject is a string, this function returns true if the string contains the provided  $search argument."
    },
    {
      id: "endsWith",
      displayName: "Ends With",
      type: "BOOLEAN",
      args: [
        {
          type: "STRING",
          name: "subject",
          description: "subject",
          isMandatory: true
        },
        {
          type: "STRING",
          name: "prefix",
          description: "prefix",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Returns true if the $subject ends with the $prefix, otherwise this function returns false."
    },
    {
      id: "startsWith",
      displayName: "Starts With",
      type: "BOOLEAN",
      args: [
        {
          type: "STRING",
          name: "subject",
          description: "subject",
          isMandatory: true
        },
        {
          type: "STRING",
          name: "prefix",
          description: "prefix",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Returns true if the $subject starts with the $prefix, otherwise this function returns false."
    },
    {
      id: "lower",
      displayName: "To Lower Case",
      type: "STRING",
      args: [
        {
          type: "STRING",
          name: "input",
          description: "input string",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Converts all the alphabetic characters in a string to lowercase. If the value is not a string it will be converted into string using the default toString method"
    },
    {
      id: "upper",
      displayName: "To Upper Case",
      type: "STRING",
      args: [
        {
          type: "STRING",
          name: "input",
          description: "input string",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Converts all the alphabetic characters in a string to uppercase. If the value is not a string it will be converted into string using the default toString method"
    },
    {
      id: "trim",
      displayName: "Trim",
      type: "STRING",
      args: [
        {
          type: "STRING",
          name: "text",
          description: "string to trim",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Remove leading and trailing spaces, and replace all internal multiple spaces with a single space."
    },
    {
      id: "split",
      displayName: "Split a string into array",
      type: "STRING[]",
      args: [
        {
          type: "STRING",
          name: "string",
          description: "string to split",
          isMandatory: true
        },
        {
          type: "STRING",
          name: "separator",
          description: "separator where the split should occur",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Split a string into an array, given a separator"
    },
    {
      id: "mid",
      displayName: "Substring Of",
      type: "STRING|ARRAY|STRING[]|NUMBER[]|FILE[]|DATE[]|BOOLEAN[]",
      args: [
        {
          type: "STRING|ARRAY",
          name: "subject",
          description: "subject",
          isMandatory: true
        },
        {
          type: "NUMBER",
          name: "startPos",
          description: "startPos",
          isMandatory: true
        },
        {
          type: "NUMBER",
          name: "length",
          description: "length",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2,$3)",
      description: "Returns extracted text, given an original text, starting position, and length. or in case of array, extracts a subset of the array from start till the length number of elements. Returns null"
    },
    {
      id: "proper",
      displayName: "To Uppercase First Letter",
      type: "STRING",
      args: [
        {
          type: "STRING",
          name: "text",
          description: "text",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Return the input string with the first letter of each word converted to an uppercase letter and the rest of the letters in the word converted to lowercase."
    },
    {
      id: "rept",
      displayName: "Repeat String",
      type: "STRING",
      args: [
        {
          type: "STRING",
          name: "text",
          description: "text to repeat",
          isMandatory: true
        },
        {
          type: "NUMBER",
          name: "count",
          description: "number of times to repeat the text",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Return text repeated Count times. rept('x', 5) returns 'xxxxx'"
    },
    {
      id: "replace",
      displayName: "Replace",
      type: "STRING",
      args: [
        {
          type: "STRING",
          name: "text",
          description: "original text",
          isMandatory: true
        },
        {
          type: "NUMBER",
          name: "start",
          description: "index in the original text from where to begin the replacement.",
          isMandatory: true
        },
        {
          type: "NUMBER",
          name: "length",
          description: "number of characters to be replaced",
          isMandatory: true
        },
        {
          type: "STRING",
          name: "replacement",
          description: "string to replace at the start index",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2,$3,$4)",
      description: "Returns text where an old text is substituted at a given start position and length, with a new text."
    },
    {
      id: "_toString",
      displayName: "Convert To String",
      type: "STRING",
      args: [
        {
          type: "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|ARRAY|OBJECT",
          name: "arg",
          description: "arg",
          isMandatory: true
        }
      ],
      impl: "toString($1)",
      description: "Converts the passed arg to a string string - Returns the passed in value. number/array/object/boolean - The JSON encoded value of the object."
    },
    // Array functions
    {
      id: "sum",
      displayName: "Sum",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER[]",
          name: "collection",
          description: "collection",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the sum of the provided array argument. An empty array will produce a return value of 0."
    },
    {
      id: "min",
      displayName: "Minimum",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER[]|STRING[]",
          name: "collection",
          description: "collection",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the lowest found number in the provided $collection argument."
    },
    {
      id: "max",
      displayName: "Maximum",
      type: "NUMBER",
      args: [
        {
          type: "NUMBER[]|STRING[]",
          name: "collection",
          description: "collection",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the highest found number in the provided array argument. An empty array will produce a return value of null."
    },
    {
      id: "sort",
      displayName: "Sort",
      type: "NUMBER[]|STRING[]",
      args: [
        {
          type: "NUMBER[]|STRING[]",
          name: "list",
          description: "list",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "This function accepts an array $list argument and returns the sorted elements of the $list as an array. The array must be a list of strings or numbers. Sorting strings is based on code points. Locale is not taken into account."
    },
    {
      id: "join",
      displayName: "Join",
      type: "STRING",
      args: [
        {
          type: "STRING",
          name: "glue",
          description: "glue",
          isMandatory: true
        },
        {
          type: "STRING[]",
          name: "stringsarray",
          description: "stringsarray",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Returns all of the elements from the provided $stringsarray array joined together using the $glue argument as a separator between each."
    },
    {
      id: "reverse",
      displayName: "Reverse",
      type: "STRING|STRING[]|NUMBER[]|ARRAY",
      args: [
        {
          type: "STRING|STRING[]|NUMBER[]|ARRAY",
          name: "argument",
          description: "argument",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Reverses the order of the $argument."
    },
    {
      id: "toArray",
      displayName: "Convert To Array",
      type: "STRING[]|NUMBER[]|ARRAY|DATE[]|BOOLEAN[]",
      args: [
        {
          type: "STRING|NUMBER|BOOLEAN|DATE|OBJECT",
          name: "arg",
          description: "arg",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Converts the passed arg to an array array - Returns the passed in value. number/string/object/boolean - Returns a one element array containing the passed in argument."
    },
    {
      id: "unique",
      displayName: "Unique Values Of",
      type: "ARRAY|STRING[]|NUMBER[]|DATE[]|BOOLEAN[]",
      args: [
        {
          type: "ARRAY",
          name: "input",
          description: "input array",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Takes an array and returns unique elements within it"
    },
    {
      id: "length",
      displayName: "Length",
      type: "NUMBER",
      args: [
        {
          type: "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|DATE[]|BOOLEAN[]|FILE[]|ARRAY|OBJECT|PANEL",
          name: "subject",
          description: "subject",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the length of the given argument using the following types rules: string: returns the number of code points in the string array: returns the number of elements in the array object: returns the number of key-value pairs in the object: returns the number instances in panel"
    },
    // Object functions
    {
      id: "keys",
      displayName: "Keys",
      type: "STRING[]",
      args: [
        {
          type: "OBJECT",
          name: "obj",
          description: "obj",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns an array containing the keys of the provided object. If the passed object is null, the value returned is an empty array"
    },
    {
      id: "values",
      displayName: "Values",
      type: "STRING[]|NUMBER[]|ARRAY",
      args: [
        {
          type: "OBJECT",
          name: "obj",
          description: "obj",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the values of the provided object. Note that because JSON hashes are inheritently unordered, the values associated with the provided object obj are inheritently unordered."
    },
    {
      id: "type",
      displayName: "Type",
      type: "STRING",
      args: [
        {
          type: "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|ARRAY|OBJECT",
          name: "subject",
          description: "subject",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Returns the JavaScript type of the given $subject argument as a string value. The return value MUST be one of the following: number string boolean array object null"
    },
    // Conversion
    {
      id: "toNumber",
      displayName: "Convert To Number",
      type: "NUMBER",
      args: [
        {
          type: "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|ARRAY|OBJECT",
          name: "arg",
          description: "arg",
          isMandatory: true
        }
      ],
      impl: "$0($1)",
      description: "Converts the passed arg to a number string - Returns the parsed number. number - Returns the passed in value. array - null object - null boolean - null null - null"
    },
    // Date
    {
      id: "today",
      displayName: "Get Current Date",
      type: "DATE",
      args: [],
      impl: "$0()",
      description: "Returns current date"
    },
    // Form validation
    {
      id: "_validateForm",
      displayName: "Validate Form",
      type: "BOOLEAN",
      args: [],
      impl: "validate($form).length==0",
      description: "Validate Form"
    },
    // Error handling
    {
      id: "defaultErrorHandler",
      displayName: "Default Invoke Service Error Handler",
      type: "ANY",
      args: [
        {
          type: "OBJECT",
          name: "response",
          description: "response",
          isMandatory: true
        },
        {
          type: "OBJECT",
          name: "header",
          description: "header",
          isMandatory: true
        }
      ],
      impl: "$0($1,$2)",
      description: "Default Invoke Service Error Handler",
      isErrorHandler: true
    }
  ];
  if (toggleProvider.isEnabled("FT_FORMS_13209")) {
    functions.push(
      {
        id: "defaultSubmitSuccessHandler",
        displayName: "Default Submit Form Success Handler",
        type: "ANY",
        args: [],
        impl: "$0()",
        description: "Default Submit Form Success Handler"
      },
      {
        id: "defaultSubmitErrorHandler",
        displayName: "Default Submit Form Error Handler",
        type: "ANY",
        args: [
          {
            type: "STRING",
            name: "defaultSubmitErrorMessage",
            description: "Localized error message",
            isMandatory: true
          }
        ],
        impl: "$0($1)",
        description: "Default Submit Form Error Handler"
      }
    );
  }
  if (toggleProvider.isEnabled("FT_FORMS_13519")) {
    functions.push({
      id: "getEventPayload",
      displayName: "Get Event Payload",
      type: "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|DATE[]|BOOLEAN[]|FILE[]|ARRAY|OBJECT",
      args: [
        {
          type: "STRING",
          name: "input",
          description: "input param",
          isMandatory: false
        }
      ],
      impl: "$event.payload.$1",
      description: "Get Event Payload"
    });
  }
  if (toggleProvider.isEnabled("FT_FORMS_19884")) {
    functions.push(
      {
        id: "setVariable",
        displayName: "Set Variable Value",
        type: "VOID",
        args: [
          {
            type: "STRING",
            name: "variableName",
            description: "Name of the variable (supports dot notation e.g. 'address.city')",
            isMandatory: true
          },
          {
            type: "STRING|NUMBER|BOOLEAN|DATE|AFCOMPONENT|OBJECT|ARRAY",
            name: "variableValue",
            description: "Value to set for the variable",
            isMandatory: true
          },
          {
            type: "AFCOMPONENT|FORM",
            name: "normalFieldOrPanel",
            description: "Field or panel component to set the variable on (defaults to actual Form)",
            isMandatory: false
          }
        ],
        impl: "$0($1,$2,$3)",
        description: "Set variable value on a field or form"
      },
      {
        id: "getVariable",
        displayName: "Get Variable Value",
        type: "STRING|NUMBER|BOOLEAN|DATE|OBJECT|ARRAY|AFCOMPONENT",
        args: [
          {
            type: "STRING",
            name: "variableName",
            description: "Name of the variable (supports dot notation e.g. 'address.city')",
            isMandatory: true
          },
          {
            type: "AFCOMPONENT|FORM",
            name: "normalFieldOrPanel",
            description: "Field or panel component to get the value from (defaults to actual Form)",
            isMandatory: false
          }
        ],
        impl: "$0($1,$2)",
        description: "Get field or form variable value"
      }
    );
  }
  if (toggleProvider.isEnabled("FT_FORMS_20002")) {
    functions.push(
      {
        id: "exportFormData",
        displayName: "Export Form Data",
        type: "STRING|OBJECT",
        args: [
          {
            type: "BOOLEAN",
            name: "stringify",
            description: "Convert the form data to a JSON string, defaults to true",
            isMandatory: false
          },
          {
            type: "STRING",
            name: "key",
            description: "The key to get the value for (supports dot notation e.g. 'address.city'), defaults to all form data",
            isMandatory: false
          }
        ],
        impl: "$0($1,$2)",
        description: "Export form data as a JSON string"
      },
      {
        id: "importData",
        displayName: "Import Form Data",
        type: "VOID",
        args: [
          {
            type: "OBJECT",
            name: "data",
            description: "The form data to set",
            isMandatory: true
          }
        ],
        impl: "importData($1)",
        description: "Import Form Data"
      }
    );
  }
  if (toggleProvider.isEnabled("FT_FORMS_20129")) {
    functions.push({
      id: "validate",
      displayName: "Validate",
      type: "BOOLEAN",
      args: [
        {
          type: "AFCOMPONENT|FORM",
          name: "field",
          description: "Field, panel or form component to validate",
          isMandatory: true
        }
      ],
      impl: "$0($1).length==0",
      description: "Validate"
    });
  }
  if (toggleProvider.isEnabled("FT_FORMS_17789")) {
    functions.push({
      id: "downloadDoR",
      displayName: "Download DoR",
      type: "ANY",
      args: [
        {
          type: "STRING",
          name: "fileName",
          description: "The name of the file to be downloaded. Defaults to 'Downloaded_DoR.pdf' if not specified.",
          isMandatory: false
        }
      ],
      impl: "$0($1)",
      description: "Download DoR"
    });
  }
  return functions;
}

// src/scope/RBScope.js
var RBScope = class {
  /**
   * Create a scope from form tree JSON and optional custom functions.
   *
   * @param {Object} treeJson - Root node of the form/component tree.
   * @param {Array|Object} [customFunctions=[]] - Custom function list or legacy wrapper
   *   with `customFunction`.
   * @param {Object} [toggleProvider] - ToggleProvider instance with isEnabled(key) method.
   *   Defaults to StaticToggleProvider(DEFAULT_TOGGLES).
   * @param {Array} [apiIntegrations=[]] - API integration endpoint specs from FDM cloud config.
   *   Each item: { confPath, inputJson } where confPath matches wsdlInfo.formDataModelId in rules.
   */
  constructor(treeJson, customFunctions = [], toggleProvider = new StaticToggleProvider(DEFAULT_TOGGLES), apiIntegrations = []) {
    if (!treeJson) {
      throw new Error("RBScope requires treeJson");
    }
    const normalizedCustomFunctions = Array.isArray(customFunctions) ? customFunctions : customFunctions?.customFunction || [];
    this.treeJson = treeJson;
    this.customFunctions = normalizedCustomFunctions;
    this.toggleProvider = toggleProvider;
    this.variables = {};
    this.varsByType = {};
    this.components = {};
    this.functions = {};
    this.funcsByType = {};
    this.typeRegistry = new TypesRegistry(void 0, this.toggleProvider);
    this.apiIntegrations = /* @__PURE__ */ new Map();
    this._initializeFromTree(treeJson);
    this._registerOOTBFunctions();
    this._registerCustomFunctions(normalizedCustomFunctions);
    this._registerApiIntegrations(apiIntegrations);
  }
  /**
   * Populate variable and component registries by traversing the tree.
   *
   * @param {Object} treeJson - Root node of the form/component tree.
   * @returns {void}
   */
  _initializeFromTree(treeJson) {
    this._traverse(treeJson, (node) => {
      this.variables[node.id] = {
        id: node.id,
        name: node.name,
        type: node.type,
        path: node.path
      };
      let typeTokens = [];
      if (node.type) {
        typeTokens = Array.isArray(node.type) ? node.type : [node.type];
      }
      typeTokens.forEach((typeToken) => {
        this.varsByType[typeToken] = this.varsByType[typeToken] || [];
        this.varsByType[typeToken].push(this.variables[node.id]);
      });
      if (node.fieldType) {
        this.components[node.id] = { ...node };
      }
    });
  }
  /**
   * Depth-first traversal over tree nodes.
   *
   * @param {Object} node - Current tree node.
   * @param {Function} callback - Callback executed for each node.
   * @returns {void}
   */
  _traverse(node, callback) {
    callback(node);
    if (node.items && Array.isArray(node.items)) {
      node.items.forEach((child) => {
        this._traverse(child, callback);
      });
    }
  }
  /**
   * Register built-in (OOTB) functions from catalog with toggle-aware filtering.
   *
   * @returns {void}
   */
  _registerOOTBFunctions() {
    const ootbFunctions = buildOOTBFunctions(this.toggleProvider);
    ootbFunctions.forEach((fn) => {
      this.functions[fn.id] = fn;
      (this.funcsByType[fn.type] = this.funcsByType[fn.type] || []).push(fn);
    });
  }
  /**
   * Register user-provided custom functions.
   *
   * @param {Array<Object>} customFunctions - Custom function definitions.
   * @returns {void}
   */
  _registerCustomFunctions(customFunctions) {
    customFunctions.forEach((fn) => {
      this.functions[fn.id] = fn;
      (this.funcsByType[fn.type] = this.funcsByType[fn.type] || []).push(fn);
    });
  }
  /**
   * Register API integration specs from form-level apiIntegration items.
   *
   * @param {Array<Object>} items - API integration items, each with a `confPath` (string)
   *   and `inputJson` (string or object) endpoint spec.
   * @returns {void}
   */
  _registerApiIntegrations(items) {
    if (!Array.isArray(items)) {
      return;
    }
    items.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }
      if (!item.confPath || !item.inputJson) {
        return;
      }
      try {
        const spec = typeof item.inputJson === "string" ? JSON.parse(item.inputJson) : item.inputJson;
        this.apiIntegrations.set(item.confPath, spec);
      } catch {
        console.warn(`[RBScope] Skipping malformed inputJson for apiIntegration: ${item.confPath}`);
      }
    });
  }
  /**
   * @param {string} confPath - wsdlInfo.formDataModelId value from the rule
   * @returns {Object|undefined} Parsed endpoint spec, or undefined if not registered
   */
  getApiIntegration(confPath) {
    return this.apiIntegrations.get(confPath);
  }
  /**
   * Get variable metadata by id.
   *
   * @param {string} id - Variable/component id.
   * @returns {Object|undefined}
   */
  getVariable(id) {
    return this.variables[id];
  }
  /**
   * Get function definition by id.
   *
   * @param {string} id - Function id.
   * @returns {Object|undefined}
   */
  getFunction(id) {
    return this.functions[id];
  }
  /**
   * Get component node metadata by id.
   *
   * @param {string} id - Component id.
   * @returns {Object|undefined}
   */
  getComponent(id) {
    return this.components[id];
  }
  /**
   * Check whether a variable exists in scope.
   *
   * @param {string} id - Variable id.
   * @returns {boolean}
   */
  hasVariable(id) {
    return id in this.variables;
  }
  /**
   * Check whether a function exists in scope.
   *
   * @param {string} id - Function id.
   * @returns {boolean}
   */
  hasFunction(id) {
    return id in this.functions;
  }
  /**
   * Resolve allowed member properties for a component type expression.
   *
   * @param {string|string[]} typeValue - Type token(s), optionally pipe-delimited.
   * @returns {string[]}
   */
  getAllowedPropertiesForType(typeValue) {
    return this.typeRegistry.getAllowedPropertiesForType(typeValue);
  }
  /**
   * Check whether a property is allowed for a given type expression.
   *
   * @param {string|string[]} typeValue - Type token(s), optionally pipe-delimited.
   * @param {string} propertyName - Candidate property name.
   * @returns {boolean}
   */
  isPropertyAllowedForType(typeValue, propertyName) {
    return this.typeRegistry.isPropertyAllowed(typeValue, propertyName);
  }
  /**
   * Resolve allowed member properties for a specific component id.
   *
   * @param {string} componentId - Component id.
   * @returns {string[]}
   */
  getAllowedPropertiesForComponent(componentId) {
    const component = this.getComponent(componentId);
    if (!component) {
      return [];
    }
    return this.getAllowedPropertiesForType(component.type);
  }
  /**
   * Check whether a property is allowed for a specific component id.
   *
   * @param {string} componentId - Component id.
   * @param {string} propertyName - Candidate property name.
   * @returns {boolean}
   */
  isPropertyAllowedForComponent(componentId, propertyName) {
    const component = this.getComponent(componentId);
    if (!component) {
      return false;
    }
    return this.isPropertyAllowedForType(component.type, propertyName);
  }
  /**
   * Find a component by an exact property match.
   * `displayName` is matched case-insensitively; all other properties are exact.
   *
   * @param {string} property - 'name', 'displayName', 'path', or 'id'
   * @param {string} value
   * @returns {Object} found result or `{ found: false }`
   */
  findField(property, value) {
    const lower = value.toLowerCase();
    const match = Object.values(this.components).find((c) => {
      if (property === "displayName") {
        return (c.displayName || "").toLowerCase() === lower;
      }
      return c[property] === value;
    });
    if (!match) {
      return { found: false };
    }
    return {
      found: true,
      qualifiedId: match.id,
      name: match.name,
      type: match.type,
      displayName: match.displayName || match.name,
      fieldType: match.fieldType,
      isPanel: match.fieldType === "panel"
    };
  }
  /**
   * Find components by value, tried against name → displayName → path → id.
   *
   * @param {string[]} values - Field names, display names, JCR paths, or qualified ids.
   * @returns {Array<Object>} One result per value, in the same order.
   */
  findByNames(values) {
    return values.map((value) => {
      for (const property of ["name", "displayName", "path", "id"]) {
        const result = this.findField(property, value);
        if (result.found) {
          return result;
        }
      }
      return { found: false, name: value };
    });
  }
  /**
   * Find all variables whose type array contains any of the requested types.
   *
   * @param {string} types - Pipe-separated type string, e.g. "STRING" or "STRING|NUMBER".
   * @returns {Array<Object>} Matching variable objects, deduplicated.
   */
  findVarByType(types) {
    const tokens = types.split("|").map((t) => t.trim());
    const seen = /* @__PURE__ */ new Set();
    return tokens.flatMap((token) => this.varsByType[token] || []).filter((v) => {
      if (seen.has(v.id)) {
        return false;
      }
      seen.add(v.id);
      return true;
    });
  }
  /**
   * Find all functions whose return type matches any of the requested types.
   *
   * @param {string} types - Pipe-separated type string, e.g. "NUMBER" or "NUMBER|STRING".
   * @returns {Array<Object>} Matching function objects, deduplicated.
   */
  findFunctionsByType(types) {
    const tokens = types.split("|").map((t) => t.trim());
    const seen = /* @__PURE__ */ new Set();
    return tokens.flatMap((token) => this.funcsByType[token] || []).filter((fn) => {
      if (seen.has(fn.id)) {
        return false;
      }
      seen.add(fn.id);
      return true;
    });
  }
};

// src/RuleTransformer.js
var import_json_formula = __toESM(require("@adobe/json-formula"), 1);

// src/models/BaseModel.js
var BaseModel = class {
  constructor(json, nodeName) {
    this.json = json;
    this.nodeName = nodeName || json.nodeName;
    this.items = json.items || [];
  }
  accept(visitor) {
    return visitor.visit(this);
  }
  get(index) {
    return this.items[index];
  }
};

// src/models/TerminalModel.js
var TerminalModel = class extends BaseModel {
  constructor(json, nodeName) {
    super(json, nodeName);
    this.value = json.value;
    if (json.properties) {
      this.properties = json.properties;
    } else if (json.value && typeof json.value === "object" && !Array.isArray(json.value)) {
      this.properties = json.value;
    } else {
      this.properties = {};
    }
  }
  getValue() {
    return this.value;
  }
  getProperty(key) {
    return this.properties[key];
  }
};

// src/models/ChoiceModel.js
var ChoiceModel = class extends BaseModel {
  constructor(json, nodeName) {
    super(json, nodeName);
    this.choice = json.choice || null;
  }
  /**
   * Get the selected choice model
   * @returns {Object|null}
   */
  getChoice() {
    return this.choice;
  }
  /**
   * Set the selected choice model
   * @param {Object} model
   */
  setChoice(model) {
    this.choice = model;
  }
  /**
   * Accept visitor pattern
   * @param {Object} visitor
   */
  accept(visitor) {
    const enterMethod = `enter${this.nodeName}`;
    const exitMethod = `exit${this.nodeName}`;
    let skipChildren = false;
    if (visitor[enterMethod]) {
      skipChildren = visitor[enterMethod](this) === false;
    }
    if (!skipChildren && this.choice) {
      this.choice.accept(visitor);
    }
    if (visitor[exitMethod]) {
      visitor[exitMethod](this);
    }
  }
  /**
   * Get child at index (for compatibility)
   * @param {number} index
   * @returns {Object|null}
   */
  get(index) {
    return index === 0 ? this.choice : null;
  }
};

// src/models/SequenceModel.js
var SequenceModel = class extends BaseModel {
  constructor(json, nodeName) {
    super(json, nodeName);
    this.items = json.items || [];
  }
  /**
   * Get child at index
   * @param {number} index
   * @returns {Object|null}
   */
  get(index) {
    return this.items[index] || null;
  }
  /**
   * Set child at index
   * @param {number} index
   * @param {Object} model
   */
  set(index, model) {
    this.items[index] = model;
  }
  /**
   * Get number of children
   * @returns {number}
   */
  size() {
    return this.items.length;
  }
  /**
   * Accept visitor pattern
   * @param {Object} visitor
   */
  accept(visitor) {
    const enterMethod = `enter${this.nodeName}`;
    const exitMethod = `exit${this.nodeName}`;
    let skipChildren = false;
    if (visitor[enterMethod]) {
      skipChildren = visitor[enterMethod](this) === false;
    }
    if (!skipChildren) {
      this.items.forEach((item) => {
        if (item) {
          item.accept(visitor);
        }
      });
    }
    if (visitor[exitMethod]) {
      visitor[exitMethod](this);
    }
  }
};

// src/models/ListModel.js
var ListModel = class extends BaseModel {
  constructor(json, nodeName) {
    super(json, nodeName);
    this.items = json.items || [];
  }
  /**
   * Add item to list
   * @param {Object} model
   */
  add(model) {
    this.items.push(model);
  }
  /**
   * Remove item at index
   * @param {number} index
   */
  remove(index) {
    this.items.splice(index, 1);
  }
  /**
   * Move item from index to newIndex
   * @param {number} index
   * @param {number} newIndex
   */
  move(index, newIndex) {
    this.items.splice(newIndex, 0, this.items.splice(index, 1)[0]);
  }
  /**
   * Get item at index
   * @param {number} index
   * @returns {Object|null}
   */
  get(index) {
    return this.items[index] || null;
  }
  /**
   * Set item at index
   * @param {number} index
   * @param {Object} model
   */
  set(index, model) {
    if (index > -1 && index < this.items.length) {
      this.items[index] = model;
    }
  }
  /**
   * Get number of items
   * @returns {number}
   */
  size() {
    return this.items.length;
  }
  /**
   * Clear all items
   */
  clear() {
    this.items = [];
  }
  /**
   * Accept visitor pattern
   * @param {Object} visitor
   */
  accept(visitor) {
    const enterMethod = `enter${this.nodeName}`;
    const exitMethod = `exit${this.nodeName}`;
    let skipChildren = false;
    if (visitor[enterMethod]) {
      skipChildren = visitor[enterMethod](this) === false;
    }
    if (!skipChildren) {
      this.items.forEach((item) => {
        if (item) {
          item.accept(visitor);
        }
      });
    }
    if (visitor[exitMethod]) {
      visitor[exitMethod](this);
    }
  }
};

// src/models/FunctionModel.js
var FunctionModel = class extends BaseModel {
  constructor(json, nodeName) {
    super(json, nodeName);
    this.functionName = json.functionName ?? null;
    this.params = Array.isArray(json.params) ? json.params : [];
    this.callbacks = json.callbacks ?? null;
  }
  getFunctionName() {
    return this.functionName;
  }
  getParams() {
    return this.params;
  }
};

// src/grammar/GrammarConfig.js
var OperatorGroups = {
  // Arithmetic operators for mathematical calculations
  ARITHMETIC: ["PLUS", "MINUS", "MULTIPLY", "DIVIDE"],
  // String concatenation
  STRING: ["CONCAT"],
  // Numeric and value comparison
  COMPARISON: [
    "EQUALS_TO",
    "NOT_EQUALS_TO",
    "GREATER_THAN",
    "LESS_THAN",
    "GREATER_THAN_EQUAL",
    "LESS_THAN_EQUAL"
  ],
  // String-specific comparison (function-based)
  STRING_COMPARISON: [
    "CONTAINS",
    "STARTS_WITH",
    "ENDS_WITH",
    "DOES_NOT_CONTAIN"
  ],
  // Unary operators (single operand)
  UNARY: [
    "IS_EMPTY",
    "IS_NOT_EMPTY",
    "IS_TRUE",
    "IS_FALSE"
  ],
  // Logical operators for boolean combination
  LOGICAL: ["AND", "OR"]
};
var LITERAL_NODE_TYPE_MAP = {
  STRING_LITERAL: "STRING",
  NUMERIC_LITERAL: "NUMBER",
  BOOLEAN_LITERAL: "BOOLEAN"
};
var BASE_STATEMENT_CHOICES = [
  "EVENT_SCRIPTS",
  "CALC_EXPRESSION",
  "FORMAT_EXPRESSION",
  "VALIDATE_EXPRESSION",
  "CLEAR_EXPRESSION",
  "VISIBLE_EXPRESSION",
  "SHOW_EXPRESSION",
  "ACCESS_EXPRESSION",
  "DISABLE_EXPRESSION"
];
var GrammarConfig = {
  // Root
  ROOT: {
    rule: "STATEMENT"
  },
  STATEMENT: {
    rule: BASE_STATEMENT_CHOICES.join(" | "),
    ftRule: {
      FT_FORMS_21264: {
        rule: [...BASE_STATEMENT_CHOICES, "TRIGGER_SCRIPTS"].join(" | "),
        allowBase: true
      }
    }
  },
  // Event Scripts (When-Then rules)
  EVENT_SCRIPTS: {
    rule: "EVENT_CONDITION Then BLOCK_STATEMENTS",
    ftRule: {
      FT_FORMS_12053: { rule: "EVENT_CONDITION Then BLOCK_STATEMENTS Else BLOCK_STATEMENTS", allowBase: true }
    }
  },
  EVENT_CONDITION: {
    rule: "EVENT_AND_COMPARISON | BINARY_EVENT_CONDITION"
  },
  EVENT_AND_COMPARISON: {
    rule: "COMPONENT EVENT_AND_COMPARISON_OPERATOR PRIMITIVE_EXPRESSION",
    ftRule: {
      FT_FORMS_19582: { rule: "EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION EVENT_AND_COMPARISON_OPERATOR PRIMITIVE_EXPRESSION", allowBase: true }
    }
  },
  EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION: {
    rule: "COMPONENT | FUNCTION_CALL"
  },
  EVENT_AND_COMPARISON_OPERATOR: {
    rule: "is changed | is clicked | is initialized | EQUALS_TO | NOT_EQUALS_TO | GREATER_THAN | LESS_THAN | HAS_SELECTED | STARTS_WITH | ENDS_WITH | CONTAINS | DOES_NOT_CONTAIN | IS_EMPTY | IS_NOT_EMPTY | IS_BEFORE | IS_AFTER | IS_TRUE | IS_FALSE | IS_VALID | IS_NOT_VALID | is submitted successfully | submission fails | is saved successfully | fails to save"
  },
  BINARY_EVENT_CONDITION: {
    rule: "EVENT_CONDITION OPERATOR EVENT_CONDITION",
    validOperators: {
      groups: ["LOGICAL"]
    }
  },
  // Block Statements (list of actions)
  BLOCK_STATEMENTS: {
    rule: "BLOCK_STATEMENT+"
  },
  BLOCK_STATEMENT: {
    // FT-gated alternatives (SAVE_FORM, NAVIGATE_IN_PANEL, WRITE_JSON_FORMULA, SET_VARIABLE,
    // ASYNC_FUNCTION_CALL) are listed here unconditionally but gated via FT_GATED_NODES in
    // RuleValidator — matching the pattern used for ASYNC_FUNCTION_CALL / FORMAT_EXPRESSION.
    rule: "HIDE_STATEMENT | SHOW_STATEMENT | ENABLE_STATEMENT | DISABLE_STATEMENT | SET_VALUE_STATEMENT | WSDL_STATEMENT | SET_PROPERTY | CLEAR_VALUE_STATEMENT | SET_FOCUS | SUBMIT_FORM | RESET_FORM | VALIDATE_FORM | ADD_INSTANCE | REMOVE_INSTANCE | FUNCTION_CALL | DISPATCH_EVENT | NAVIGATE_TO | SAVE_FORM | NAVIGATE_IN_PANEL | WRITE_JSON_FORMULA | SET_VARIABLE | ASYNC_FUNCTION_CALL"
  },
  // Statement types
  HIDE_STATEMENT: {
    rule: "AFCOMPONENT"
  },
  SHOW_STATEMENT: {
    rule: "AFCOMPONENT"
  },
  ENABLE_STATEMENT: {
    rule: "AFCOMPONENT"
  },
  DISABLE_STATEMENT: {
    rule: "AFCOMPONENT"
  },
  SET_VALUE_STATEMENT: {
    rule: "VALUE_FIELD to EXPRESSION"
  },
  CLEAR_VALUE_STATEMENT: {
    rule: "VALUE_FIELD"
  },
  SET_PROPERTY: {
    rule: "MEMBER_EXPRESSION to EXTENDED_EXPRESSION"
  },
  SET_FOCUS: {
    rule: "to AFCOMPONENT"
  },
  DISPATCH_EVENT: {
    rule: "STRING_LITERAL on AFCOMPONENT"
  },
  ADD_INSTANCE: {
    rule: "of REPEATABLE_COMPONENT"
  },
  REMOVE_INSTANCE: {
    rule: "of REPEATABLE_COMPONENT"
  },
  NAVIGATE_TO: {
    rule: "NAVIGATE_TO_EXPRESSION in NAVIGATE_METHOD_OPTIONS"
  },
  NAVIGATE_TO_EXPRESSION: {
    rule: "URL_LITERAL | COMPONENT | FUNCTION_CALL"
  },
  NAVIGATE_METHOD_OPTIONS: {
    rule: "NEW_WINDOW | NEW_TAB | SAME_TAB"
  },
  NAVIGATE_IN_PANEL: {
    rule: "PANEL_FOCUS_OPTION of PANEL"
  },
  PANEL_FOCUS_OPTION: {
    rule: "NEXT_ITEM | PREVIOUS_ITEM"
  },
  // Function call — rule type "function": { functionName: {id}, params: EXPRESSION[] }
  // impl and args are not stored in the AST — they are resolved from scope at transform time.
  // Each entry in params must be an EXPRESSION choice node (nodeName: 'EXPRESSION', choice: {...}).
  FUNCTION_CALL: {
    rule: "FUNCTION"
  },
  // Expressions
  EXPRESSION: {
    rule: "COMPONENT | STRING_LITERAL | NUMERIC_LITERAL | FUNCTION_CALL | BINARY_EXPRESSION | COMPARISON_EXPRESSION | MEMBER_EXPRESSION"
  },
  EXTENDED_EXPRESSION: {
    rule: "COMPONENT | DATE_LITERAL | STRING_LITERAL | BOOLEAN_LITERAL | NUMERIC_LITERAL | FUNCTION_CALL | BINARY_EXPRESSION | MEMBER_EXPRESSION"
  },
  PRIMITIVE_EXPRESSION: {
    rule: "STRING_LITERAL | NUMERIC_LITERAL | DATE_LITERAL | BOOLEAN_LITERAL"
  },
  BOOLEAN_LITERAL: {
    rule: "True | False"
  },
  COMPARISON_EXPRESSION: {
    rule: "EXPRESSION OPERATOR EXPRESSION",
    validOperators: {
      groups: ["COMPARISON", "STRING_COMPARISON", "UNARY"]
    }
  },
  BINARY_EXPRESSION: {
    rule: "EXPRESSION OPERATOR EXPRESSION",
    validOperators: {
      groups: ["ARITHMETIC", "STRING"]
    }
  },
  BOOLEAN_BINARY_EXPRESSION: {
    rule: "CONDITION OPERATOR CONDITION"
  },
  MEMBER_EXPRESSION: {
    rule: "PROPERTY_LIST of COMPONENT"
  },
  NUMBER_FORMAT_EXPRESSION: {
    rule: "STRING_LITERAL | FUNCTION_CALL | BINARY_EXPRESSION | MEMBER_EXPRESSION"
  },
  CONDITION: {
    rule: "COMPARISON_EXPRESSION | BOOLEAN_BINARY_EXPRESSION"
  },
  // Calculate/Clear/Format/Validate expressions
  CALC_EXPRESSION: {
    rule: "VALUE_FIELD to EXPRESSION When CONDITIONORALWAYS"
  },
  CLEAR_EXPRESSION: {
    rule: "VALUE_FIELD When CONDITIONORALWAYS"
  },
  FORMAT_EXPRESSION: {
    rule: "VALUE_FIELD Using Expression NUMBER_FORMAT_EXPRESSION"
  },
  VALIDATE_EXPRESSION: {
    rule: "AFCOMPONENT Using Expression CONDITION"
  },
  // Visibility/Enabled expressions (V2 baseline)
  VISIBLE_EXPRESSION: {
    rule: "AFCOMPONENT When CONDITIONORALWAYS Else DONOTHING_OR_SHOW"
  },
  SHOW_EXPRESSION: {
    rule: "AFCOMPONENT When CONDITIONORALWAYS Else DONOTHING_OR_HIDE"
  },
  ACCESS_EXPRESSION: {
    rule: "AFCOMPONENT When CONDITIONORALWAYS Else DONOTHING_OR_DISABLE"
  },
  DISABLE_EXPRESSION: {
    rule: "AFCOMPONENT When CONDITIONORALWAYS Else DONOTHING_OR_ENABLE"
  },
  // Conditional and else-action nodes (V2 baseline)
  CONDITIONORALWAYS: {
    rule: "COMPARISON_EXPRESSION | BOOLEAN_BINARY_EXPRESSION"
  },
  DONOTHING_OR_SHOW: {
    rule: "Show | No action"
  },
  DONOTHING_OR_HIDE: {
    rule: "Hide | No action"
  },
  DONOTHING_OR_ENABLE: {
    rule: "Enable | No action"
  },
  DONOTHING_OR_DISABLE: {
    rule: "Disable | No action"
  },
  // Dynamic variable rules — FT_FORMS_19884
  SET_VARIABLE: {
    rule: "key VARIABLE_NAME value VARIABLE_VALUE on AFCOMPONENT"
  },
  GET_VARIABLE: {
    rule: "key VARIABLE_NAME from AFCOMPONENT"
  },
  VARIABLE_NAME: {
    rule: "AFCOMPONENT | STRING_LITERAL | FUNCTION_CALL | GET_VARIABLE | BINARY_EXPRESSION"
  },
  VARIABLE_VALUE: {
    rule: "STRING_LITERAL | NUMERIC_LITERAL | BOOLEAN_LITERAL | AFCOMPONENT | FUNCTION_CALL | GET_VARIABLE | BINARY_EXPRESSION"
  },
  // JSON Formula write support — FT_FORMS_20655
  WRITE_JSON_FORMULA: {
    rule: "STRING_LITERAL"
  },
  // Async function call — FT_FORMS_13519
  ASYNC_FUNCTION_CALL: {
    rule: "FUNCTION"
  },
  // Component model (special terminal with metadata)
  // COMPONENT: {
  //   model: 'ComponentModel',
  // },
  // TRIGGER_SCRIPTS nodes (activated when FT_FORMS_21264 is on)
  TRIGGER_SCRIPTS: {
    rule: "SINGLE_TRIGGER_SCRIPTS+"
  },
  SINGLE_TRIGGER_SCRIPTS: {
    rule: "COMPONENT TRIGGER_EVENT When TRIGGER_EVENT_SCRIPTS"
  },
  // TRIGGER_EVENT has no rule entry — falls back to TerminalModel, reads .value directly
  TRIGGER_EVENT_SCRIPTS: {
    rule: "CONDITION Then BLOCK_STATEMENTS",
    ftRule: {
      FT_FORMS_12053: {
        rule: "CONDITION Then BLOCK_STATEMENTS Else BLOCK_STATEMENTS",
        allowBase: true
      }
    }
  }
};
var getRule = (nodeName, toggleProvider) => {
  const config = GrammarConfig[nodeName];
  if (config?.ftRule) {
    for (const [ft, ftConfig] of Object.entries(config.ftRule)) {
      if (toggleProvider?.isEnabled?.(ft)) {
        return typeof ftConfig === "string" ? ftConfig : ftConfig.rule;
      }
    }
  }
  return config?.rule;
};
var isFtBaseAllowed = (nodeName, toggleProvider) => {
  const config = GrammarConfig[nodeName];
  if (config?.ftRule) {
    for (const [ft, ftConfig] of Object.entries(config.ftRule)) {
      if (toggleProvider?.isEnabled?.(ft)) {
        return typeof ftConfig === "object" && ftConfig.allowBase === true;
      }
    }
  }
  return false;
};

// src/models/ModelFactory.js
var MODEL_CONSTRUCTORS = {
  BaseModel,
  ChoiceModel,
  SequenceModel,
  ListModel,
  TerminalModel,
  FunctionModel,
  RootModel: BaseModel,
  CalcExpressionModel: BaseModel,
  ComponentModel: TerminalModel,
  ExpressionModel: BaseModel
};
var ModelFactory = class {
  /**
   * Determine model type from grammar rule pattern
   * @param {string} rule - The grammar rule
   * @returns {string} - Model name
   */
  static getModelTypeFromRule(rule) {
    if (!rule || typeof rule !== "string") {
      return "TerminalModel";
    }
    if (rule.includes("|")) {
      return "ChoiceModel";
    }
    if (rule.endsWith("+") || rule.endsWith("*")) {
      return "ListModel";
    }
    if (rule === "VARIABLE" || rule === "") {
      return "TerminalModel";
    }
    if (rule === "FUNCTION") {
      return "FunctionModel";
    }
    return "SequenceModel";
  }
  static createModel(json) {
    if (!json || !json.nodeName) {
      return null;
    }
    const { nodeName } = json;
    const grammarEntry = GrammarConfig[nodeName];
    let modelName;
    if (grammarEntry?.model) {
      modelName = grammarEntry.model;
    } else if (grammarEntry?.rule) {
      modelName = this.getModelTypeFromRule(grammarEntry.rule);
    } else {
      modelName = "TerminalModel";
    }
    const ModelConstructor = MODEL_CONSTRUCTORS[modelName] || BaseModel;
    const model = new ModelConstructor(json, nodeName);
    if (json.choice) {
      model.choice = this.createModel(json.choice);
    }
    if (json.items && Array.isArray(json.items)) {
      model.items = json.items.map((item) => this.createModel(item));
    }
    return model;
  }
};

// src/transformers/BaseTransformer.js
var BaseTransformer = class {
  constructor(scope) {
    this.scope = scope;
  }
  /**
   * Visit a model node
   */
  visit(model) {
    if (!model) {
      return "";
    }
    const { nodeName } = model;
    const methodName = `enter${nodeName}`;
    if (typeof this[methodName] === "function") {
      return this[methodName](model);
    }
    if (model.choice) {
      return this.visit(model.choice);
    }
    if (model.items && model.items.length > 0) {
      return model.items.map((item) => this.visit(item)).join("");
    }
    return "";
  }
  /**
   * Transform a model tree
   */
  transform(model) {
    return this.visit(model);
  }
};

// src/transformers/JsonFormulaTransformer.js
var PRIMITIVE_TYPES = /* @__PURE__ */ new Set(["STRING", "NUMBER", "DATE", "BOOLEAN", "BINARY"]);
var OOTB_TRIGGER_EVENTS = {
  click: "Click",
  init: "Initialize",
  valueCommit: "Value Commit",
  submitSuccess: "Successful Submission",
  submitError: "Error in Submission"
};
var wsdlCallSeq = 0;
var isArrayTypeToken = (t) => {
  if (typeof t !== "string") {
    return false;
  }
  const normalizedTypeToken = t.trim().toUpperCase();
  return normalizedTypeToken === "ARRAY" || normalizedTypeToken.endsWith("[]");
};
function modifyRepeatablePanelFieldId(fieldId) {
  let bracketDepth = 0;
  let foundBrackets = false;
  let balancedStartIndex = 0;
  let balancedLastIndex = -1;
  for (let i = fieldId.length - 1; i >= 0; i -= 1) {
    if (fieldId[i] === "]") {
      foundBrackets = true;
      bracketDepth += 1;
      if (balancedLastIndex === -1) {
        balancedLastIndex = i;
      }
    } else if (fieldId[i] === "[") {
      bracketDepth -= 1;
    }
    if (bracketDepth === 0 && foundBrackets) {
      balancedStartIndex = i + 1;
      break;
    }
  }
  if (!foundBrackets) {
    return fieldId;
  }
  return `${fieldId.slice(0, balancedStartIndex)}*${fieldId.slice(balancedLastIndex)}`;
}
var JsonFormulaTransformer = class _JsonFormulaTransformer extends BaseTransformer {
  constructor(scope, toggleProvider) {
    super(scope);
    this.toggleProvider = toggleProvider ?? new StaticToggleProvider(DEFAULT_TOGGLES);
    this.result = {
      script: {
        content: ""
      }
    };
    this.currentRuleType = null;
    this.eventCondition = null;
    this.eventSourceComponentId = null;
    this.componentActions = /* @__PURE__ */ new Map();
    this.inFunctionCall = false;
    this.inFunctionCallAsObject = false;
    this.inBinaryCondition = false;
    this.otherEvents = {};
    this.currentEvent = {
      field: null,
      name: null,
      model: null,
      otherEvents: null
    };
  }
  /**
   * Transform and return result in single-rule format
   * @returns {{ field, event, model, content, otherEvents }}
   */
  transform(model) {
    const script = this.visit(model);
    if (!Array.isArray(this.result.script.content)) {
      this.result.script.content = script;
    }
    return {
      field: this.currentEvent.field,
      event: this.currentEvent.name || this.eventType || null,
      model: null,
      content: this.result.script.content,
      otherEvents: this.result.otherEvents || null
    };
  }
  /**
   * Returns the relative name of fieldToCheck with respect to currentField.
   */
  static getRelativeName(fieldToCheck, currentField) {
    if (!fieldToCheck) {
      return "";
    }
    if (fieldToCheck === currentField) {
      return "$field";
    }
    const parentOfField = fieldToCheck.split(".").slice(0, -1).join(".");
    if (parentOfField.startsWith(currentField)) {
      return fieldToCheck.substring(currentField.length + 1);
    }
    const parentOfCurrentField = currentField.split(".").slice(0, -1).join(".");
    if (parentOfCurrentField === parentOfField) {
      return fieldToCheck.split(".").slice(-1)[0];
    }
    return fieldToCheck;
  }
  /**
   * Handle ROOT node
   */
  enterROOT(model) {
    if (model.items && model.items.length > 0) {
      return this.visit(model.items[0]);
    }
    return "";
  }
  /**
   * Handle CALC_EXPRESSION node
   */
  enterCALC_EXPRESSION(model) {
    const valueExpression = model.items[2];
    const conditionOrAlways = model.items[4];
    if (model.items[0] && model.items[0].properties && model.items[0].properties.id) {
      this.currentEvent.field = model.items[0].properties.id;
    } else if (this.eventSourceComponentId) {
      this.currentEvent.field = this.eventSourceComponentId;
    }
    const valueScript = this.visit(valueExpression);
    const conditionChild = conditionOrAlways?.choice;
    let finalScript;
    if (conditionChild) {
      const conditionScript = this.visit(conditionChild);
      finalScript = `if(${conditionScript},${valueScript},$field)`;
    } else {
      finalScript = valueScript;
    }
    this.result.rules = {
      value: finalScript,
      validationStatus: "valid"
    };
    return finalScript;
  }
  /**
   * Handle EXPRESSION node
   */
  enterEXPRESSION(model) {
    if (model.choice) {
      return this.visit(model.choice);
    }
    return "";
  }
  /**
   * Handle BOOLEAN_LITERAL node
   */
  enterBOOLEAN_LITERAL(model) {
    if (model.choice) {
      return this.visit(model.choice);
    }
    return "";
  }
  /**
   * Handle False node
   */
  // eslint-disable-next-line class-methods-use-this
  enterFalse(_) {
    return "false()";
  }
  /**
   * Handle True node
   */
  // eslint-disable-next-line class-methods-use-this
  enterTrue(_) {
    return "true()";
  }
  /**
   * Handle COMPONENT node
   */
  enterCOMPONENT(model) {
    const id = model.getProperty?.("id") ?? model.value?.id;
    if (!id) {
      return "";
    }
    if (id === "$globalForm" && this.inFunctionCall) {
      return "undefined";
    }
    let componentName;
    const refField = this.currentEvent.field || this.eventSourceComponentId;
    if (refField) {
      componentName = _JsonFormulaTransformer.getRelativeName(id, refField);
    } else {
      const parts = id.split(".");
      componentName = parts[parts.length - 1];
    }
    const type = model.getProperty?.("type") ?? model.value?.type;
    const firstType = type ? type.split("|")[0].trim() : "";
    const primitive = type && PRIMITIVE_TYPES.has(firstType);
    if (primitive && !this.inFunctionCallAsObject) {
      return `${componentName}.$value`;
    }
    return componentName;
  }
  /**
   * Handle AFCOMPONENT node (Adaptive Form component)
   */
  enterAFCOMPONENT(model) {
    const id = model.getProperty?.("id") || model.value?.id;
    if (!id) {
      return "";
    }
    const refField = this.currentEvent.field || this.eventSourceComponentId;
    if (refField) {
      return _JsonFormulaTransformer.getRelativeName(id, refField);
    }
    return id.split(".").pop();
  }
  /**
   * Handle STRING_LITERAL node
   */
  // eslint-disable-next-line class-methods-use-this
  enterSTRING_LITERAL(model) {
    const value = model.getValue ? model.getValue() : model.value;
    if (value === null) {
      return void 0;
    }
    return `'${value}'`;
  }
  /**
   * Handle DATE_LITERAL node
   */
  // eslint-disable-next-line class-methods-use-this
  enterDATE_LITERAL(model) {
    const value = model.getValue ? model.getValue() : model.value;
    return `'${value}'`;
  }
  /**
   * Handle URL_LITERAL node
   */
  // eslint-disable-next-line class-methods-use-this
  enterURL_LITERAL(model) {
    const value = model.getValue ? model.getValue() : model.value;
    return `'${value}'`;
  }
  /**
   * Handle URL_DETAILS node — generates getURLDetail('detail')
   */
  // eslint-disable-next-line class-methods-use-this
  enterURL_DETAILS(model) {
    const value = model.getValue ? model.getValue() : model.value;
    return `getURLDetail('${value}')`;
  }
  /**
   * Handle UTM_PARAMETER node — generates getQueryParameter('paramName')
   */
  // eslint-disable-next-line class-methods-use-this
  enterUTM_PARAMETER(model) {
    const value = model.getValue ? model.getValue() : model.value;
    return `getQueryParameter('${value}')`;
  }
  /**
   * Handle QUERY_PARAMETER node — generates getQueryParameter('paramName')
   */
  // eslint-disable-next-line class-methods-use-this
  enterQUERY_PARAMETER(model) {
    const value = model.getValue ? model.getValue() : model.value;
    return `getQueryParameter('${value}')`;
  }
  // eslint-disable-next-line class-methods-use-this
  enterBROWSER_DETAILS(model) {
    const value = model.getValue ? model.getValue() : model.value;
    return `getBrowserDetail('${value}')`;
  }
  enterEVENT_PAYLOAD(model) {
    const value = model.getValue ? model.getValue() : model.value;
    const sep = value && value.startsWith("[") ? "" : ".";
    if (this._encryptedCallback) {
      return `toObject($event.payload)${sep}${value}`;
    }
    return `toObject($event.payload.body)${sep}${value}`;
  }
  /**
   * Handle NAVIGATE_TO_EXPRESSION node
   */
  enterNAVIGATE_TO_EXPRESSION(model) {
    if (model.choice) {
      return this.visit(model.choice);
    }
    if (model.items && model.items.length > 0) {
      return this.visit(model.items[0]);
    }
    return "";
  }
  /**
   * Handle COMPARISON_EXPRESSION node
   */
  enterCOMPARISON_EXPRESSION(model) {
    const operatorNode = model.items[1];
    const operatorName = operatorNode.choice?.nodeName || operatorNode.nodeName;
    const left = this.visit(model.items[0]);
    if (operatorName === "IS_NOT_EMPTY") {
      return `!(!(${left}))`;
    }
    if (operatorName === "IS_EMPTY") {
      return `!(${left})`;
    }
    if (operatorName === "IS_TRUE") {
      return `${left} == true() `;
    }
    if (operatorName === "IS_FALSE") {
      return `${left} == false() `;
    }
    if (operatorName === "CONTAINS") {
      const right2 = this.visit(model.items[2]);
      return `contains(${left}, ${right2})`;
    }
    if (operatorName === "STARTS_WITH") {
      const right2 = this.visit(model.items[2]);
      return `startsWith(${left}, ${right2})`;
    }
    if (operatorName === "ENDS_WITH") {
      const right2 = this.visit(model.items[2]);
      return `endsWith(${left}, ${right2})`;
    }
    if (operatorName === "DOES_NOT_CONTAIN") {
      const right2 = this.visit(model.items[2]);
      return `!contains(${left}, ${right2})`;
    }
    const right = this.visit(model.items[2]);
    const operator = this.visit(operatorNode);
    return `${left} ${operator} ${right}`;
  }
  /**
   * Handle CONDITION node — wraps result in parens if nested=true
   */
  enterCONDITION(model) {
    let result;
    if (model.choice) {
      result = this.visit(model.choice);
    } else if (model.items && model.items.length > 0) {
      result = this.visit(model.items[0]);
    } else {
      result = "";
    }
    return model.json?.nested ? `(${result})` : result;
  }
  /**
   * Handle BOOLEAN_BINARY_EXPRESSION node — flat list of CONDITIONs and OPERATORs
   */
  enterBOOLEAN_BINARY_EXPRESSION(model) {
    if (!model.items) {
      return "";
    }
    return model.items.map((item) => this.visit(item)).join(" ");
  }
  /**
   * Handle ACCESS_EXPRESSION node (fd:enabled rules)
   * Structure: AFCOMPONENT, When, CONDITIONORALWAYS[, Else, DONOTHING_OR_DISABLE]
   * Else "No action" → if(cond, true(), $field.$enabled)  (keep current state when false)
   * Else "Disable" or no else → cond  (enabled = condition value directly)
   */
  enterACCESS_EXPRESSION(model) {
    const component = model.items?.[0];
    const componentId = component?.value?.id || component?.properties?.id;
    if (componentId) {
      this.currentEvent.field = componentId;
    }
    const conditionOrAlways = model.items?.[2];
    const condition = conditionOrAlways ? this.visit(conditionOrAlways) : "";
    const elseChoice = model.items?.[4]?.choice?.nodeName;
    if (elseChoice === "No action") {
      return `if(${condition},true(),$field.$enabled)`;
    }
    return condition;
  }
  /**
   * Handle SHOW_EXPRESSION / HIDE_EXPRESSION / ENABLE_EXPRESSION / DISABLE_EXPRESSION
   * Structure: AFCOMPONENT, When, CONDITIONORALWAYS[, Else, DONOTHING_OR_*]
   * SHOW/ENABLE → return condition as-is
   * HIDE/DISABLE → return !(condition)
   */
  _enterVisibilityExpression(model, negate) {
    const component = model.items?.[0];
    const componentId = component?.value?.id || component?.properties?.id;
    if (componentId) {
      this.currentEvent.field = componentId;
    }
    const conditionOrAlways = model.items?.[2];
    const hasCondition = conditionOrAlways?.choice != null;
    if (!hasCondition) {
      return negate ? "false()" : "true()";
    }
    const condition = this.visit(conditionOrAlways);
    return negate ? `!(${condition})` : condition;
  }
  enterSHOW_EXPRESSION(model) {
    return this._enterVisibilityExpression(model, false);
  }
  enterHIDE_EXPRESSION(model) {
    return this._enterVisibilityExpression(model, true);
  }
  enterENABLE_EXPRESSION(model) {
    return this._enterVisibilityExpression(model, false);
  }
  enterDISABLE_EXPRESSION(model) {
    return this._enterVisibilityExpression(model, true);
  }
  enterVISIBLE_EXPRESSION(model) {
    return this._enterVisibilityExpression(model, true);
  }
  /**
   * Handle TRIGGER_SCRIPTS node
   * Structure: SINGLE_TRIGGER_SCRIPTS[]
   *   SINGLE_TRIGGER_SCRIPTS: [COMPONENT, TRIGGER_EVENT, When, TRIGGER_EVENT_SCRIPTS]
   *   TRIGGER_EVENT_SCRIPTS: [CONDITION, Then, BLOCK_STATEMENTS]
   */
  enterTRIGGER_SCRIPTS(model) {
    (model.items || []).forEach((singleTrigger) => {
      if (!singleTrigger || singleTrigger.nodeName !== "SINGLE_TRIGGER_SCRIPTS") {
        return;
      }
      const component = singleTrigger.items?.[0];
      const componentId = component?.value?.id || component?.properties?.id;
      if (componentId) {
        this.currentEvent.field = componentId;
        this.eventSourceComponentId = componentId;
      }
      const triggerEvent = singleTrigger.items?.[1]?.value;
      let outputKey;
      if (triggerEvent && this.toggleProvider?.isEnabled("FT_FORMS_23571") && OOTB_TRIGGER_EVENTS[triggerEvent]) {
        outputKey = OOTB_TRIGGER_EVENTS[triggerEvent];
      } else if (triggerEvent) {
        outputKey = `custom:${triggerEvent}`;
      }
      const triggerEventScripts = singleTrigger.items?.[3];
      if (!triggerEventScripts || !outputKey) {
        return;
      }
      const conditionNode = triggerEventScripts.items?.[0];
      const blockStatements = triggerEventScripts.items?.[2];
      const conditionScript = conditionNode && conditionNode.choice ? this.visit(conditionNode) : null;
      const scripts = [];
      this.componentActions.clear();
      if (blockStatements && blockStatements.items) {
        blockStatements.items.forEach((stmt) => this.processBlockStatement(stmt));
      }
      this.componentActions.forEach((actions, comp) => {
        if (comp === "__global__") {
          actions.forEach((action) => {
            const script = this.generateGlobalActionScript(action);
            scripts.push(conditionScript ? `if(${conditionScript}, ${script}, {})` : script);
          });
        } else {
          const baseScript = this.generateActionScript(comp, actions);
          if (baseScript !== null) {
            scripts.push(conditionScript ? `if(${conditionScript}, ${baseScript}, {})` : baseScript);
          }
        }
      });
      const elseBlockStatements = triggerEventScripts.items?.length >= 5 ? triggerEventScripts.items[4] : null;
      if (elseBlockStatements && conditionScript) {
        const elseCondition = `!(${conditionScript})`;
        this.componentActions.clear();
        if (elseBlockStatements.items) {
          elseBlockStatements.items.forEach((stmt) => this.processBlockStatement(stmt));
        }
        this.componentActions.forEach((actions, comp) => {
          if (comp === "__global__") {
            actions.forEach((action) => {
              const script = this.generateGlobalActionScript(action);
              scripts.push(`if(${elseCondition}, ${script}, {})`);
            });
          } else {
            const baseScript = this.generateActionScript(comp, actions);
            if (baseScript !== null) {
              scripts.push(`if(${elseCondition}, ${baseScript}, {})`);
            }
          }
        });
      }
      if (scripts.length > 0) {
        if (!this.otherEvents[outputKey]) {
          this.otherEvents[outputKey] = [];
        }
        this.otherEvents[outputKey].push(...scripts);
      }
    });
    this.result.script.content = [];
    if (Object.keys(this.otherEvents).length > 0) {
      this.result.otherEvents = this.otherEvents;
    }
    return "";
  }
  /**
   * Handle EQUALS_TO operator
   */
  // eslint-disable-next-line class-methods-use-this
  enterEQUALS_TO(_) {
    return "==";
  }
  // eslint-disable-next-line class-methods-use-this
  enterNOT_EQUALS_TO(_) {
    return "!=";
  }
  // eslint-disable-next-line class-methods-use-this
  enterGREATER_THAN(_) {
    return ">";
  }
  // eslint-disable-next-line class-methods-use-this
  enterLESS_THAN(_) {
    return "<";
  }
  // eslint-disable-next-line class-methods-use-this
  enterGREATER_THAN_EQUAL(_) {
    return ">=";
  }
  // eslint-disable-next-line class-methods-use-this
  enterLESS_THAN_EQUAL(_) {
    return "<=";
  }
  /**
   * Handle EVENT_SCRIPTS node
   * Supports both new format (items: [EVENT_CONDITION, Then, BLOCK_STATEMENTS])
   * and legacy format (choice.items: [IF, EVENT_CONDITION, THEN, BLOCK_STATEMENTS])
   */
  enterEVENT_SCRIPTS(model) {
    if (!model.items || model.items.length < 3) {
      return "";
    }
    const eventConditionNode = model.items[0];
    const blockStatements = model.items[2];
    this.eventType = this.determineEventType(eventConditionNode);
    const eventNameMap = {
      click: "Click",
      change: "Value Commit",
      initialize: "Initialize"
    };
    this.currentEvent.name = eventNameMap[this.eventType] || this.eventType;
    this.eventCondition = this.extractEventCondition(eventConditionNode);
    this.currentEvent.field = this.eventSourceComponentId;
    const changeWrapper = "contains($event.payload.changes[].propertyName, 'value')";
    const changeWrapperPrefix = `(${changeWrapper} && `;
    if (this.eventType === "change" && this.eventCondition?.startsWith(changeWrapperPrefix)) {
      this.eventCondition = this.eventCondition.slice(changeWrapperPrefix.length, -1);
    }
    this.componentActions.clear();
    if (blockStatements && blockStatements.items) {
      blockStatements.items.forEach((stmt) => {
        this.processBlockStatement(stmt);
      });
    }
    const scripts = [];
    const mergedScripts = [];
    const isChangeEvent = this.eventType === "change";
    const hasNoCondition = this.eventCondition === "__NO_CONDITION__";
    const hasBinaryCondition = isChangeEvent && this.eventCondition && this.eventCondition !== changeWrapper && !hasNoCondition;
    const wrapWithConditions = (baseScript) => {
      if (hasNoCondition) {
        return baseScript;
      }
      if (isChangeEvent) {
        const innerScript = hasBinaryCondition ? `if(${this.eventCondition}, ${baseScript}, {})` : baseScript;
        return { unwrapped: innerScript, wrapped: `if(${changeWrapper}, ${innerScript}, {})` };
      }
      return { wrapped: `if(${this.eventCondition}, ${baseScript}, {})` };
    };
    const applyCondition = (baseScript, wrapFn) => {
      const condResult = wrapFn(baseScript);
      if (typeof condResult === "string") {
        scripts.push(condResult);
        return;
      }
      if (isChangeEvent) {
        scripts.push(condResult.unwrapped);
        mergedScripts.push(condResult.wrapped);
      } else {
        scripts.push(condResult.wrapped);
      }
    };
    this.componentActions.forEach((actions, component) => {
      if (component === "__global__") {
        actions.forEach((action) => {
          const globalScript = this.generateGlobalActionScript(action);
          applyCondition(globalScript, wrapWithConditions);
        });
        return;
      }
      const baseScript = this.generateActionScript(component, actions);
      if (baseScript !== null) {
        applyCondition(baseScript, wrapWithConditions);
      }
    });
    const elseBlockStatements = model.items?.length >= 5 ? model.items[4] : null;
    if (elseBlockStatements) {
      if (hasNoCondition) {
        const elseComponentActions = /* @__PURE__ */ new Map();
        const savedActions = this.componentActions;
        this.componentActions = elseComponentActions;
        if (elseBlockStatements.items) {
          elseBlockStatements.items.forEach((stmt) => this.processBlockStatement(stmt));
        }
        this.componentActions = savedActions;
        const elseScripts = [];
        elseComponentActions.forEach((actions, component) => {
          if (component === "__global__") {
            actions.forEach((action) => {
              const script = this.generateGlobalActionScript(action);
              if (script) {
                elseScripts.push(script);
              }
            });
            return;
          }
          const baseScript = this.generateActionScript(component, actions);
          if (baseScript !== null && baseScript !== "") {
            elseScripts.push(baseScript);
          }
        });
        const dispatchRe = /^(dispatchEvent\()(.+?)(, 'custom:setProperty', \{)(.+)(\}\))$/;
        elseScripts.forEach((elseScript) => {
          const elseMatch = elseScript.match(dispatchRe);
          if (!elseMatch) {
            scripts.push(elseScript);
            return;
          }
          const elseComp = elseMatch[2];
          const elseProps = elseMatch[4];
          const thenIdx = scripts.findIndex((s) => {
            const m = s.match(dispatchRe);
            return m && m[2] === elseComp;
          });
          if (thenIdx >= 0) {
            const thenMatch = scripts[thenIdx].match(dispatchRe);
            scripts[thenIdx] = `dispatchEvent(${elseComp}, 'custom:setProperty', {${thenMatch[4]}, ${elseProps}})`;
          } else {
            scripts.push(elseScript);
          }
        });
      } else {
        const elseCondition = `!(${this.eventCondition})`;
        const wrapWithElseConditions = (baseScript) => {
          if (isChangeEvent) {
            const innerScript = `if(${elseCondition}, ${baseScript}, {})`;
            return { unwrapped: innerScript, wrapped: `if(${changeWrapper}, ${innerScript}, {})` };
          }
          return { wrapped: `if(${elseCondition}, ${baseScript}, {})` };
        };
        this.componentActions.clear();
        if (elseBlockStatements.items) {
          elseBlockStatements.items.forEach((stmt) => this.processBlockStatement(stmt));
        }
        this.componentActions.forEach((actions, component) => {
          if (component === "__global__") {
            actions.forEach((action) => {
              const elseActionScript = this.generateGlobalActionScript(action);
              applyCondition(elseActionScript, wrapWithElseConditions);
            });
            return;
          }
          const baseScript = this.generateActionScript(component, actions);
          if (baseScript !== null) {
            applyCondition(baseScript, wrapWithElseConditions);
          }
        });
      }
    }
    this.result.script.content = scripts;
    this.result.rules = { validationStatus: "valid" };
    if (Object.keys(this.otherEvents).length > 0) {
      this.result.otherEvents = this.otherEvents;
    }
    return "";
  }
  /**
   * Determine event type from event condition node
   */
  // eslint-disable-next-line class-methods-use-this
  determineEventType(eventConditionNode) {
    const chosenCondition = eventConditionNode.choice;
    const getEventTypeFromComparison = (node) => {
      if (!node || node.nodeName !== "EVENT_AND_COMPARISON" || !node.items || node.items.length < 2) {
        return null;
      }
      const operator = node.items[1];
      const operatorNode = operator?.choice || operator;
      if (operatorNode?.nodeName === "is clicked") {
        return "click";
      }
      if (operatorNode?.nodeName === "is initialized") {
        return "initialize";
      }
      if (operatorNode?.nodeName === "is changed") {
        return "change";
      }
      return null;
    };
    if (chosenCondition?.nodeName === "BINARY_EVENT_CONDITION") {
      const firstCondition = chosenCondition.items?.[0];
      const innerComparison = firstCondition?.choice || firstCondition?.items?.[0];
      return getEventTypeFromComparison(innerComparison);
    }
    return getEventTypeFromComparison(chosenCondition);
  }
  /**
   * Extract event condition script
   */
  extractEventCondition(eventConditionNode) {
    const chosenCondition = eventConditionNode.choice;
    if (!chosenCondition) {
      return "__NO_CONDITION__";
    }
    if (chosenCondition.nodeName === "BINARY_EVENT_CONDITION") {
      return this.visit(chosenCondition);
    }
    if (chosenCondition.nodeName === "EVENT_AND_COMPARISON") {
      return this.visit(chosenCondition);
    }
    return "";
  }
  /**
   * Handle BINARY_EVENT_CONDITION node (multiple conditions with AND/OR)
   */
  enterBINARY_EVENT_CONDITION(model) {
    const prevInBinary = this.inBinaryCondition;
    this.inBinaryCondition = true;
    const left = this.visit(model.items[0]);
    const operator = this.visit(model.items[1]);
    const right = this.visit(model.items[2]);
    this.inBinaryCondition = prevInBinary;
    return `(${left} ${operator} ${right})`;
  }
  /**
   * Handle AND operator
   */
  // eslint-disable-next-line class-methods-use-this
  enterAND(_) {
    return "&&";
  }
  // eslint-disable-next-line class-methods-use-this
  enterOR(_) {
    return "||";
  }
  /**
   * Handle EVENT_AND_COMPARISON node
   */
  enterEVENT_AND_COMPARISON(model) {
    const componentWrapper = model.items[0];
    const operatorWrapper = model.items[1];
    const component = componentWrapper.choice || componentWrapper;
    const operator = operatorWrapper.choice || operatorWrapper;
    if (component && component.properties?.id && !this.eventSourceComponentId) {
      this.eventSourceComponentId = component.properties.id;
    }
    if (operator.nodeName === "is initialized") {
      if (this.toggleProvider.isEnabled("FT_FORMS_17090") && this.inBinaryCondition) {
        const type = component.value?.type;
        const isPrimitive = type && PRIMITIVE_TYPES.has(type.split("|")[0].trim());
        return isPrimitive ? "true().$value" : "true()";
      }
      return "__NO_CONDITION__";
    }
    if (operator.nodeName === "is clicked") {
      if (this.toggleProvider.isEnabled("FT_FORMS_21266") && this.inBinaryCondition) {
        if (component.value?.metadata?.isFirstField) {
          return "true()";
        }
        return this.visit(componentWrapper);
      }
      return "__NO_CONDITION__";
    }
    if (operator.nodeName === "HAS_SELECTED") {
      const right = model.items[2];
      const rightValue = this.visit(right);
      return `contains($field, ${rightValue})`;
    }
    if (operator.nodeName === "is changed") {
      if (this.inBinaryCondition) {
        const compRef = this.visit(componentWrapper);
        const primitiveExpr = model.items[2];
        const primitiveChoice = primitiveExpr?.choice;
        if (primitiveChoice && primitiveChoice.value != null) {
          const val = this.visit(primitiveExpr);
          return `${compRef}${val}`;
        }
        return compRef;
      }
      return "contains($event.payload.changes[].propertyName, 'value')";
    }
    if (operator.nodeName === "IS_TRUE") {
      const leftValue = this.visit(componentWrapper);
      return `${leftValue} == true() `;
    }
    if (operator.nodeName === "IS_FALSE") {
      const leftValue = this.visit(componentWrapper);
      return `${leftValue} == false() `;
    }
    if (operator.nodeName === "EQUALS_TO") {
      const leftValue = this.visit(model.items[0]);
      const rightValue = this.visit(model.items[2]);
      return `${leftValue} == ${rightValue}`;
    }
    if (operator.nodeName === "NOT_EQUALS_TO") {
      const leftValue = this.visit(model.items[0]);
      const rightValue = this.visit(model.items[2]);
      return `${leftValue} != ${rightValue}`;
    }
    if (operator.nodeName === "IS_EMPTY") {
      const leftValue = this.visit(model.items[0]);
      return `!(${leftValue})`;
    }
    if (operator.nodeName === "IS_NOT_EMPTY") {
      const leftValue = this.visit(model.items[0]);
      return `!(!(${leftValue}))`;
    }
    if (operator.nodeName === "LESS_THAN") {
      const leftValue = this.visit(model.items[0]);
      const rightValue = this.visit(model.items[2]);
      return `${leftValue} < ${rightValue}`;
    }
    if (operator.nodeName === "GREATER_THAN") {
      const leftValue = this.visit(model.items[0]);
      const rightValue = this.visit(model.items[2]);
      return `${leftValue} > ${rightValue}`;
    }
    if (operator.nodeName === "LESS_THAN_EQUAL") {
      const leftValue = this.visit(model.items[0]);
      const rightValue = this.visit(model.items[2]);
      return `${leftValue} <= ${rightValue}`;
    }
    if (operator.nodeName === "GREATER_THAN_EQUAL") {
      const leftValue = this.visit(model.items[0]);
      const rightValue = this.visit(model.items[2]);
      return `${leftValue} >= ${rightValue}`;
    }
    if (operator.nodeName === "IS_VALID") {
      if (this.toggleProvider.isEnabled("FT_FORMS_17090")) {
        let item = model.items[0];
        if (item?.nodeName === "EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION") {
          item = item.choice;
        }
        const validatedId = item?.value?.id || item?.properties?.id;
        if (!validatedId) {
          return "validate().length==0";
        }
        return `validate(${validatedId}).length==0`;
      }
      return `validate(${this.eventSourceComponentId}).length==0`;
    }
    if (operator.nodeName === "IS_NOT_VALID") {
      if (this.toggleProvider.isEnabled("FT_FORMS_17090")) {
        let item = model.items[0];
        if (item?.nodeName === "EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION") {
          item = item.choice;
        }
        const validatedId = item?.value?.id || item?.properties?.id;
        if (!validatedId) {
          return "validate().length!=0";
        }
        return `validate(${validatedId}).length!=0`;
      }
      return `validate(${this.eventSourceComponentId}).length!=0`;
    }
    if (operator.nodeName === "HAS_CHANGED") {
      return this.inBinaryCondition ? "$field" : "contains($event.payload.changes[].propertyName, 'value')";
    }
    if (operator.nodeName === "CONTAINS") {
      const leftValue = this.visit(componentWrapper);
      const rightValue = this.visit(model.items[2]);
      return `contains(${leftValue}, ${rightValue})`;
    }
    if (operator.nodeName === "DOES_NOT_CONTAIN") {
      const leftValue = this.visit(componentWrapper);
      const rightValue = this.visit(model.items[2]);
      return `!contains(${leftValue}, ${rightValue})`;
    }
    if (model.items[2]?.choice === null || model.items[2]?.choice === void 0) {
      return "__NO_CONDITION__";
    }
    return "";
  }
  /**
   * Process a BLOCK_STATEMENT and extract action
   */
  processBlockStatement(stmt) {
    const action = stmt.nodeName === "BLOCK_STATEMENT" || stmt.nodeName === "WSDL_BLOCK_STATEMENT" ? stmt.choice : stmt;
    if (!action) {
      return;
    }
    const actionType = action.nodeName;
    const addToComponentBucket = (componentId, entry) => {
      if (!this.componentActions.has(componentId)) {
        this.componentActions.set(componentId, []);
      }
      this.componentActions.get(componentId).push(entry);
    };
    if (["HIDE_STATEMENT", "SHOW_STATEMENT", "ENABLE_STATEMENT", "DISABLE_STATEMENT"].includes(actionType)) {
      if (action.items && action.items.length > 0) {
        const component = action.items[0];
        const componentId = component.properties?.id || component.value?.id;
        if (componentId) {
          addToComponentBucket(componentId, actionType);
        }
      }
    } else if (actionType === "SET_VALUE_STATEMENT" || actionType === "SET_PROPERTY") {
      let targetId;
      if (actionType === "SET_VALUE_STATEMENT") {
        targetId = action.items?.[0]?.value?.id || action.items?.[0]?.properties?.id;
      } else {
        const memberExpr = action.items?.[0];
        const componentNode = memberExpr?.items?.[2];
        targetId = componentNode?.value?.id || componentNode?.properties?.id;
      }
      if (targetId) {
        addToComponentBucket(targetId, action);
      } else {
        addToComponentBucket("__global__", action);
      }
    } else if (actionType === "CLEAR_VALUE_STATEMENT") {
      const targetId = action.items?.[0]?.value?.id || action.items?.[0]?.properties?.id;
      if (targetId) {
        addToComponentBucket(targetId, "CLEAR_VALUE");
      } else {
        addToComponentBucket("__global__", action);
      }
    } else {
      addToComponentBucket("__global__", action);
    }
  }
  /**
   * Generate action script for a component
   */
  generateActionScript(componentId, actions) {
    const scripts = [];
    const mergedProps = [];
    const constraintMessages = [];
    let constraintInsertIndex = -1;
    const CONSTRAINT_MESSAGE_KEYS = {
      minimumMessage: "minimum",
      maximumMessage: "maximum"
    };
    const flushMerged = () => {
      if (mergedProps.length === 0 && constraintMessages.length === 0) {
        return;
      }
      let allProps = mergedProps;
      if (this.toggleProvider.isEnabled("FT_FORMS_21359") && constraintMessages.length > 0) {
        const merged = `constraintMessage : [${constraintMessages.join(", ")}]`;
        const insertAt = constraintInsertIndex >= 0 ? constraintInsertIndex : mergedProps.length;
        allProps = [
          ...mergedProps.slice(0, insertAt),
          [null, merged],
          ...mergedProps.slice(insertAt)
        ];
        constraintInsertIndex = -1;
      }
      const propStr = allProps.map(([key, val]) => key === null ? val : this.generateNestedProperty(key, val)).join(", ");
      const componentName = this.currentEvent.field ? _JsonFormulaTransformer.getRelativeName(componentId, this.currentEvent.field) : componentId.split(".").pop();
      const isEventSource = componentId === this.eventSourceComponentId;
      scripts.push(isEventSource ? `{${propStr}}` : `dispatchEvent(${componentName}, 'custom:setProperty', {${propStr}})`);
      mergedProps.length = 0;
      constraintMessages.length = 0;
    };
    actions.forEach((action) => {
      if (typeof action === "string") {
        switch (action) {
          case "HIDE_STATEMENT":
            mergedProps.push(["visible", "false()"]);
            break;
          case "SHOW_STATEMENT":
            mergedProps.push(["visible", "true()"]);
            break;
          case "ENABLE_STATEMENT":
            mergedProps.push(["enabled", "true()"]);
            break;
          case "DISABLE_STATEMENT":
            mergedProps.push(["enabled", "false()"]);
            break;
          case "CLEAR_VALUE":
            mergedProps.push(["value", "`null`"]);
            break;
          default:
            break;
        }
      } else if (action.nodeName === "SET_PROPERTY") {
        const memberExpr = action.items?.[0];
        const propertyName = memberExpr?.items?.[0]?.value;
        const value = this.visit(action.items?.[2]);
        if (propertyName) {
          const constraintType = this.toggleProvider.isEnabled("FT_FORMS_21359") && CONSTRAINT_MESSAGE_KEYS[propertyName];
          if (constraintType) {
            if (constraintInsertIndex < 0) {
              constraintInsertIndex = mergedProps.length;
            }
            constraintMessages.push(`{ type : '${constraintType}', message : ${value} }`);
          } else {
            mergedProps.push([propertyName, value]);
          }
        }
      } else if (action.nodeName === "SET_VALUE_STATEMENT") {
        const targetField = action.items?.[0];
        const targetType = targetField?.value?.type || targetField?.properties?.type;
        const targetId = targetField?.value?.id || targetField?.properties?.id;
        const value = this.visit(action.items?.[2]);
        if (targetType === "PANEL" || targetType === "CONTAINER") {
          flushMerged();
          scripts.push(`importData(${value},'${targetId}')`);
        } else {
          mergedProps.push(["value", value]);
        }
      } else {
        flushMerged();
        scripts.push(this.generateGlobalActionScript(action));
      }
    });
    flushMerged();
    return scripts.join("\n");
  }
  /**
   * Build guide container path for WSDL/FDM requests
   * Appends JCR structure path to form path for AEM repository access
   * @param {string} formPath - Base form path (e.g., /content/forms/af/my-form)
   * @returns {string} - Full path with guide container
   */
  // eslint-disable-next-line class-methods-use-this
  getGuideContainerPath(formPath) {
    if (!formPath) {
      return "";
    }
    return `${formPath}/jcr:content/guideContainer`;
  }
  /**
   * Get JCR path for field from scope tree
   * Looks up field in scope tree and returns its path property
   * @param {string} fieldId - Field ID like $form.afJsonSchemaRoot.Pet.id_1
   * @returns {string} - Full JCR path from scope tree
   */
  getGuideNodePath(fieldId) {
    if (!fieldId) {
      return "";
    }
    const field = this.findNodeInTree(this.scope.treeJson, fieldId);
    if (!field || !field.path) {
      return "";
    }
    return field.path;
  }
  /**
   * Find a node in the tree by ID
   * @param {Object} node - Tree node to search
   * @param {string} targetId - ID to find
   * @returns {Object|null} - Found node or null
   */
  findNodeInTree(node, targetId) {
    if (!node) {
      return null;
    }
    if (node.id === targetId) {
      return node;
    }
    if (node.items && Array.isArray(node.items)) {
      for (const child of node.items) {
        const found = this.findNodeInTree(child, targetId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
  /**
   * Build WSDL input JSON structure from inputModel
   */
  buildWSDLInputJson(inputModel) {
    const result = {};
    const expressions = [];
    const savedInFunctionCall = this.inFunctionCall;
    this.inFunctionCall = true;
    Object.entries(inputModel).forEach(([key, param]) => {
      const { choice } = param;
      if (!choice) {
        return;
      }
      let expr;
      const model = ModelFactory.createModel(choice);
      expr = model ? this.visit(model) : null;
      if (!expr) {
        return;
      }
      const choiceNodeName = choice.nodeName;
      if ((choiceNodeName === "COMPONENT" || choiceNodeName === "AFCOMPONENT") && !expr.endsWith(".$value")) {
        expr = `${expr}.$value`;
      }
      const placeholder = `__EXPR_${expressions.length}__`;
      expressions.push(expr);
      if (key.includes(".")) {
        const parts = key.split(".");
        let current = result;
        for (let i = 0; i < parts.length; i += 1) {
          const part = parts[i];
          if (i === parts.length - 1) {
            current[part] = placeholder;
          } else {
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }
        }
      } else {
        result[key] = placeholder;
      }
    });
    this.inFunctionCall = savedInFunctionCall;
    let jsonStr = JSON.stringify(result, null, 0);
    expressions.forEach((expr, i) => {
      jsonStr = jsonStr.replace(`"__EXPR_${i}__"`, expr);
    });
    jsonStr = jsonStr.replace(/":"/g, '": "');
    jsonStr = jsonStr.replace(/":/g, '": ');
    return jsonStr;
  }
  /**
   * Build request body for api-integration WSDL from inputModel + inputMapping.
   * Body params come from inputModel entries or inputMapping defaultValues.
   */
  buildApiIntegrationBody(inputModel, inputMapping) {
    const mappingByKey = {};
    (inputMapping || []).forEach((m) => {
      mappingByKey[m.apiKey] = m;
    });
    const result = {};
    let hasValues = false;
    const expressions = [];
    const savedInFunctionCall = this.inFunctionCall;
    this.inFunctionCall = true;
    Object.entries(inputModel || {}).forEach(([key, param]) => {
      const mapping = mappingByKey[key];
      if (mapping && mapping.in !== "body") {
        return;
      }
      let expr;
      if (param.choice) {
        const model = ModelFactory.createModel(param.choice);
        expr = model ? this.visit(model) : null;
      } else if (mapping?.defaultValue) {
        expr = `'${mapping.defaultValue}'`;
      }
      if (!expr) {
        return;
      }
      const choiceNode = param.choice;
      const choiceName = choiceNode?.nodeName;
      const isValueComponent = choiceName === "COMPONENT" || choiceName === "AFCOMPONENT";
      const mapType = (mapping?.type || "").trim().toUpperCase();
      if (isValueComponent && isArrayTypeToken(mapType)) {
        expr = modifyRepeatablePanelFieldId(expr);
      }
      if (isValueComponent && (mapType === "OBJECT" || mapType === "ARRAY") && !expr.endsWith(".$value")) {
        expr = `${expr}.$value`;
      }
      hasValues = true;
      const placeholder = `__EXPR_${expressions.length}__`;
      expressions.push(expr);
      const parts = key.split(".");
      let current = result;
      for (let i = 0; i < parts.length - 1; i += 1) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = placeholder;
    });
    this.inFunctionCall = savedInFunctionCall;
    if (!hasValues) {
      return "{}";
    }
    let jsonStr = JSON.stringify(result, null, 0);
    expressions.forEach((expr, i) => {
      jsonStr = jsonStr.replace(`"__EXPR_${i}__"`, expr);
    });
    jsonStr = jsonStr.replace(/":"/g, '": "');
    jsonStr = jsonStr.replace(/":/g, '": ');
    return jsonStr;
  }
  /**
   * Convert dotted property name to nested object notation
   * e.g., 'label.value' with 'test' becomes 'label : {value : 'test'}'
   */
  // eslint-disable-next-line class-methods-use-this
  generateNestedProperty(propertyName, value) {
    const parts = propertyName.split(".");
    if (parts.length === 1) {
      return `${propertyName} : ${value}`;
    }
    let result = value;
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      if (i === parts.length - 1) {
        result = `${parts[i]} : ${result}`;
      } else {
        result = `${parts[i]} : {${result}}`;
      }
    }
    return result;
  }
  /**
   * Generate script for global actions (SUBMIT_FORM, DISPATCH_EVENT, etc.)
   */
  generateGlobalActionScript(action) {
    const actionType = action.nodeName;
    switch (actionType) {
      case "SUBMIT_FORM":
        return "submitForm()";
      case "DISPATCH_EVENT": {
        const dispatchRawName = this.visit(action.items[0]);
        const addCustomPrefix = this.toggleProvider.isEnabled("FT_FORMS_21264");
        const isCustomPrefixed = dispatchRawName.startsWith("'custom:");
        const dispatchEventName = addCustomPrefix && !isCustomPrefixed ? dispatchRawName.replace(/^'/, "'custom:") : dispatchRawName;
        const targetComp = action.items[2];
        const targetId = targetComp?.properties?.id || targetComp?.value?.id || "";
        const targetType = targetComp?.properties?.type || targetComp?.value?.type || "";
        const eventSourceRoot = this.eventSourceComponentId?.split(".")[0] || "$form";
        if (targetType === "FORM" && targetId !== eventSourceRoot) {
          return `dispatchEvent(${dispatchEventName})`;
        }
        const dispatchTarget = this.currentEvent.field ? _JsonFormulaTransformer.getRelativeName(targetId, this.currentEvent.field) : targetId;
        return `dispatchEvent(${dispatchTarget}, ${dispatchEventName})`;
      }
      case "RESET_FORM": {
        const targetId = action.value?.id || action.properties?.id;
        if (targetId) {
          const componentName = this.currentEvent.field ? _JsonFormulaTransformer.getRelativeName(targetId, this.currentEvent.field) : targetId.split(".").pop();
          return `dispatchEvent(${componentName}, 'reset')`;
        }
        return "dispatchEvent('reset')";
      }
      case "VALIDATE_FORM": {
        const fieldId = action.value?.id;
        if (fieldId) {
          return `validate(${_JsonFormulaTransformer.getRelativeName(fieldId, this.currentEvent.field)})`;
        }
        return "validate()";
      }
      case "ADD_INSTANCE": {
        const compNode = action.items[1];
        const fieldId = compNode?.properties?.id || compNode?.value?.id || "";
        const refField = this.currentEvent.field;
        const name = refField ? _JsonFormulaTransformer.getRelativeName(fieldId, refField) : fieldId;
        if (this.toggleProvider.isEnabled("FT_FORMS_16466")) {
          return `addInstance(${name}, getRelativeInstanceIndex(${fieldId}) + 1)`;
        }
        return `addInstance(${name})`;
      }
      case "REMOVE_INSTANCE": {
        const fieldId = action.items[1]?.properties?.id || "";
        const refField = this.currentEvent.field;
        const name = refField ? _JsonFormulaTransformer.getRelativeName(fieldId, refField) : fieldId;
        if (this.toggleProvider.isEnabled("FT_FORMS_16466")) {
          return `removeInstance(${name}, getRelativeInstanceIndex(${fieldId}))`;
        }
        return `removeInstance(${name}, length(${name}) - 1)`;
      }
      case "SET_FOCUS": {
        const component = action.items[1];
        const componentId = component?.value?.id || component?.properties?.id || "";
        let componentName;
        if (this.currentEvent.field) {
          const { field } = this.currentEvent;
          componentName = _JsonFormulaTransformer.getRelativeName(componentId, field);
        } else {
          componentName = componentId ? componentId.split(".").pop() : "";
        }
        return `dispatchEvent(${componentName},'focus')`;
      }
      case "NAVIGATE_IN_PANEL": {
        const focusOption = action.items[0];
        const panel = action.items[2];
        const panelId = panel?.properties?.id || panel?.value?.id || "";
        const direction = focusOption.choice?.nodeName;
        const directionStr = direction === "NEXT_ITEM" ? "nextItem" : "previousItem";
        return `setFocus(${panelId},'${directionStr}')`;
      }
      case "WSDL_STATEMENT": {
        const wsdlData = action.properties || {};
        const wsdlInfo = wsdlData.wsdlInfo || {};
        const callbacks = action.json?.callbacks || wsdlData.callbacks || {};
        wsdlCallSeq += 1;
        const callbackId = `${callbacks.id || 0}_${wsdlCallSeq}`;
        const successEvent = `custom:wsdlSuccess_${callbackId}`;
        const errorEvent = `custom:wsdlError_${callbackId}`;
        const processCallbacks = (callbackMap, eventName) => {
          const handlers = [];
          Object.values(callbackMap || {}).forEach((callbackNode) => {
            if (!callbackNode || callbackNode.nodeName !== "WSDL_CALLBACK_STATEMENT") {
              return;
            }
            const items = callbackNode.items || [];
            let conditionNode = null;
            let blockStmtsNode = null;
            items.forEach((item) => {
              if (item.nodeName === "CONDITION") {
                conditionNode = item;
              }
              if (item.nodeName === "WSDL_BLOCK_STATEMENTS") {
                blockStmtsNode = item;
              }
            });
            const conditionScript = conditionNode?.choice ? this.visit(ModelFactory.createModel(conditionNode.choice)) : null;
            const savedComponentActions = this.componentActions;
            this.componentActions = /* @__PURE__ */ new Map();
            (blockStmtsNode?.items || []).forEach((stmt) => {
              if (stmt.nodeName === "WSDL_BLOCK_STATEMENT") {
                this.processBlockStatement(stmt);
              }
            });
            this.componentActions.forEach((actions, comp) => {
              if (comp === "__global__") {
                actions.forEach((act) => {
                  const script = this.generateGlobalActionScript(act);
                  if (script) {
                    handlers.push(conditionScript ? `if(${conditionScript}, ${script}, {})` : script);
                  }
                });
              } else {
                const baseScript = this.generateActionScript(comp, actions);
                if (baseScript) {
                  baseScript.split("\n").forEach((line) => {
                    handlers.push(conditionScript ? `if(${conditionScript}, ${line}, {})` : line);
                  });
                }
              }
            });
            this.componentActions = savedComponentActions;
          });
          this.otherEvents[eventName] = { content: handlers, preserveEmpty: true };
        };
        if (wsdlInfo.type === "api-integration") {
          const scopeSpec = this.scope?.getApiIntegration?.(wsdlInfo.formDataModelId);
          const inputJsonSpec = scopeSpec ?? JSON.parse(wsdlInfo.inputJson || "{}");
          const {
            url: urlTemplate = "",
            method = "GET",
            contentType: rawContentType = "",
            inputMapping = [],
            encryptionRequired,
            publicKey
          } = inputJsonSpec;
          const contentType = rawContentType || "application/json";
          const inputModel2 = wsdlData.inputModel || {};
          const pathParams = inputMapping.filter((m) => m.in === "path").map((m) => m.apiKey);
          let urlExpr;
          if (pathParams.length === 0) {
            urlExpr = `'${urlTemplate}'`;
          } else {
            const parts = [];
            let remaining = urlTemplate;
            pathParams.forEach((param) => {
              const placeholder = `{${param}}`;
              const idx = remaining.indexOf(placeholder);
              if (idx >= 0) {
                if (idx > 0) {
                  parts.push(`'${remaining.slice(0, idx)}'`);
                }
                const paramData = inputModel2[param];
                const expr = paramData?.choice ? this.visit(ModelFactory.createModel(paramData.choice)) : "undefined";
                parts.push(expr);
                remaining = remaining.slice(idx + placeholder.length);
              }
            });
            if (remaining) {
              parts.push(`'${remaining}'`);
            }
            urlExpr = parts.join(" & ");
          }
          const body = this.buildApiIntegrationBody(inputModel2, inputMapping);
          const headers = `{"Content-Type": '${contentType}'}`;
          const decryptSuccessEvent = `custom:decryptSuccess_${callbackId}`;
          const decryptErrorEvent = `custom:decryptError_${callbackId}`;
          if (encryptionRequired && publicKey) {
            this.otherEvents[successEvent] = {
              content: `awaitFn(decrypt($event.payload.body, $event.payload.originalRequest), '${decryptSuccessEvent}', '${decryptErrorEvent}')`,
              scalar: true
            };
            this._encryptedCallback = true;
            processCallbacks(callbacks.success || wsdlData.onSuccess || {}, decryptSuccessEvent);
            this._encryptedCallback = false;
          } else {
            processCallbacks(callbacks.success || wsdlData.onSuccess || {}, successEvent);
          }
          processCallbacks(callbacks.failure || wsdlData.onFailure || {}, errorEvent);
          if (this.toggleProvider.isEnabled("FT_FORMS_19810")) {
            if (encryptionRequired && publicKey) {
              return `awaitFn(retryHandler(requestWithRetry(externalize(${urlExpr}), '${method}', encrypt({body: ${body}, headers: ${headers}}, '${publicKey}'), '${successEvent}','${errorEvent}')))`;
            }
            return `awaitFn(retryHandler(requestWithRetry(externalize(${urlExpr}), '${method}', ${body}, ${headers}, '${successEvent}','${errorEvent}')))`;
          }
          if (encryptionRequired && publicKey) {
            return `request(externalize(${urlExpr}),'${method}', encrypt({body: ${body}, headers: ${headers}}, '${publicKey}'), '${successEvent}','${errorEvent}')`;
          }
          return `request(externalize(${urlExpr}),'${method}', ${body}, ${headers}, '${successEvent}','${errorEvent}')`;
        }
        const formPath = wsdlData.formPath || this.scope?.treeJson?.path || "";
        const inputModel = wsdlData.inputModel || {};
        const outputModel = wsdlData.outputModel || {};
        const inputJson = this.buildWSDLInputJson(inputModel);
        const requestParams = {
          operationName: wsdlInfo.operationName,
          input: `toString(${inputJson})`,
          functionToExecute: "invokeFDMOperation",
          apiVersion: "2",
          formDataModelId: wsdlInfo.formDataModelId,
          runValidation: String(wsdlInfo.runValidation || false)
        };
        const currentFieldId = this.currentEvent.field;
        if (currentFieldId) {
          const guideNodePath = this.getGuideNodePath(currentFieldId);
          if (guideNodePath) {
            requestParams.guideNodePath = guideNodePath;
          }
        }
        if ((this.toggleProvider.isEnabled("FT_FORMS_9611") || this.toggleProvider.isEnabled("FT_FORMS_15407")) && wsdlInfo.schemaRef) {
          requestParams.schemaRef = wsdlInfo.schemaRef;
        }
        if ((this.toggleProvider.isEnabled("FT_FORMS_9611") || this.toggleProvider.isEnabled("FT_FORMS_15407")) && wsdlInfo.schemaType) {
          requestParams.schemaType = wsdlInfo.schemaType;
        }
        const paramsStr = Object.entries(requestParams).map(([key, val]) => key === "input" ? `"${key}":${val}` : `"${key}":'${val}'`).join(",");
        const successKeys = Object.keys(callbacks.success || wsdlData.onSuccess || {});
        const failureKeys = Object.keys(callbacks.failure || wsdlData.onFailure || {});
        const hasCallbacks = successKeys.length > 0 || failureKeys.length > 0;
        if (hasCallbacks) {
          processCallbacks(callbacks.success || wsdlData.onSuccess || {}, successEvent);
          processCallbacks(callbacks.failure || wsdlData.onFailure || {}, errorEvent);
        } else {
          const successHandlers = Object.entries(outputModel).map(([key, component]) => {
            const componentId = component.properties?.id || component.value?.id;
            const componentName = componentId ? componentId.split(".").pop() : key;
            return `dispatchEvent(${componentName},'custom:setProperty', {value: toObject($event.payload.body).${key}})`;
          });
          this.otherEvents[successEvent] = { content: successHandlers, preserveEmpty: true };
          this.otherEvents[errorEvent] = { content: [], preserveEmpty: true };
        }
        const guidePath = this.getGuideContainerPath(formPath);
        return `request(externalize('${guidePath}.af.dermis'), 'POST', {${paramsStr}}, {"Content-Type" : 'application/x-www-form-urlencoded'}, '${successEvent}','${errorEvent}')`;
      }
      case "NAVIGATE_TO": {
        const urlExpression = action.items[0];
        const methodOptions = action.items[2];
        const url = this.visit(urlExpression);
        const method = methodOptions?.items?.[0]?.nodeName ?? methodOptions?.choice?.nodeName;
        let target;
        if (method === "NEW_WINDOW") {
          target = "_newwindow";
        } else if (method === "NEW_TAB") {
          target = "_blank";
        } else {
          target = "_self";
        }
        return `navigateTo(${url}, '${target}')`;
      }
      case "SET_VALUE_STATEMENT": {
        const valueField = action.items[0];
        const expression = action.items[2];
        const componentId = valueField?.properties?.id;
        const value = this.visit(expression);
        if (componentId === this.eventSourceComponentId) {
          return `{value : ${value}}`;
        }
        let svComponentName;
        if (this.currentEvent.field) {
          svComponentName = _JsonFormulaTransformer.getRelativeName(componentId, this.currentEvent.field);
        } else {
          svComponentName = componentId ? componentId.split(".").pop() : "";
        }
        return `dispatchEvent(${svComponentName}, 'custom:setProperty', {value : ${value}})`;
      }
      case "SET_PROPERTY": {
        const memberExpression = action.items[0];
        const valueExpression = action.items[2];
        const propList = memberExpression.items[0];
        const propertyName = propList.value || propList.getValue();
        const component = memberExpression.items[2];
        const componentId = component?.properties?.id;
        const value = this.visit(valueExpression);
        const propertyObject = this.generateNestedProperty(propertyName, value);
        if (componentId === this.eventSourceComponentId) {
          return `{${propertyObject}}`;
        }
        let spComponentName;
        if (this.currentEvent.field) {
          spComponentName = _JsonFormulaTransformer.getRelativeName(componentId, this.currentEvent.field);
        } else {
          spComponentName = componentId ? componentId.split(".").pop() : "";
        }
        return `dispatchEvent(${spComponentName}, 'custom:setProperty', {${propertyObject}})`;
      }
      case "FUNCTION_CALL":
      case "SET_VARIABLE":
      case "ASYNC_FUNCTION_CALL":
        return this.visit(action);
      case "SAVE_FORM": {
        const originalId = this.scope?.treeJson?.options?.originalId;
        const formId = originalId ? btoa(originalId) : this.scope?.treeJson?.items?.find?.((n) => n.type?.includes?.("FORM"))?.id || "";
        return `saveForm(externalize('/adobe/forms/af/save/${formId}'))`;
      }
      case "WRITE_JSON_FORMULA": {
        const raw = this.visit(action.items[0]);
        return raw.replace(/^['"]|['"]$/g, "");
      }
      default:
        return "";
    }
  }
  /**
   * Handle VALIDATE_EXPRESSION node
   */
  enterVALIDATE_EXPRESSION(model) {
    const condition = model.items[3];
    if (model.items[0] && model.items[0].properties && model.items[0].properties.id) {
      this.currentEvent.field = model.items[0].properties.id;
    } else if (this.eventSourceComponentId) {
      this.currentEvent.field = this.eventSourceComponentId;
    }
    const conditionScript = this.visit(condition);
    this.result.validationExpression = conditionScript;
    this.result.rules = {
      validationStatus: "valid"
    };
    return conditionScript;
  }
  /**
   * Handle CONDITION node (duplicate removed — merged into the one at top of class)
   */
  /**
   * Handle FORMAT_EXPRESSION node
   */
  enterFORMAT_EXPRESSION(model) {
    const formatExpression = model.items[3];
    if (model.items[0] && model.items[0].properties && model.items[0].properties.id) {
      this.currentEvent.field = model.items[0].properties.id;
    } else if (this.eventSourceComponentId) {
      this.currentEvent.field = this.eventSourceComponentId;
    }
    const formatScript = this.visit(formatExpression);
    this.result.displayValueExpression = formatScript;
    this.result.rules = {
      validationStatus: "valid"
    };
    return formatScript;
  }
  /**
   * Handle NUMBER_FORMAT_EXPRESSION node
   */
  enterNUMBER_FORMAT_EXPRESSION(model) {
    if (model.choice) {
      return this.visit(model.choice);
    }
    return "";
  }
  /**
   * Handle CLEAR_EXPRESSION node
   */
  enterCLEAR_EXPRESSION(model) {
    const conditionOrAlways = model.items[2];
    if (model.items[0] && model.items[0].properties && model.items[0].properties.id) {
      this.currentEvent.field = model.items[0].properties.id;
    } else if (this.eventSourceComponentId) {
      this.currentEvent.field = this.eventSourceComponentId;
    }
    const valueScript = "null()";
    const conditionChild = conditionOrAlways?.choice;
    let finalScript;
    if (conditionChild) {
      const conditionScript = this.visit(conditionChild);
      finalScript = `if(${conditionScript},${valueScript},$field)`;
    } else {
      finalScript = valueScript;
    }
    this.result.rules = {
      value: finalScript,
      validationStatus: "valid"
    };
    return finalScript;
  }
  /**
   * Handle MEMBER_EXPRESSION node (e.g., component.property)
   */
  enterMEMBER_EXPRESSION(model) {
    const propertyList = model.items[0];
    const component = model.items[2];
    const propertyName = propertyList.getValue();
    const componentId = component?.getProperty?.("id") || component?.value?.id;
    if (componentId && typeof propertyName === "string" && this.scope) {
      const scopeComponent = this.scope.getComponent(componentId);
      if (!scopeComponent) {
        throw new Error(`Unknown component '${componentId}' in member expression`);
      }
      const allowed = this.scope.isPropertyAllowedForComponent(componentId, propertyName);
      if (!allowed) {
        throw new Error(`Invalid member property '${propertyName}' for component '${componentId}'`);
      }
    }
    const componentName = this.visit(component);
    return `${componentName}.$${propertyName}`;
  }
  /**
   * Handle PRIMITIVE_EXPRESSION node
   */
  enterPRIMITIVE_EXPRESSION(model) {
    if (model.choice) {
      return this.visit(model.choice);
    }
    if (model.items && model.items.length > 0) {
      return this.visit(model.items[0]);
    }
    return "";
  }
  /**
   * Handle EXTENDED_EXPRESSION node
   */
  enterEXTENDED_EXPRESSION(model) {
    if (model.choice) {
      return this.visit(model.choice);
    }
    return "";
  }
  /**
   * Handle BINARY_EXPRESSION node
   */
  enterBINARY_EXPRESSION(model) {
    const left = this.visit(model.items[0]);
    const operator = this.visit(model.items[1]);
    const right = this.visit(model.items[2]);
    return `(${left} ${operator} ${right})`;
  }
  /**
   * Handle CONCAT operator
   */
  // eslint-disable-next-line class-methods-use-this
  enterCONCAT(_) {
    return "&";
  }
  /**
   * Handle NUMERIC_LITERAL node
   */
  // eslint-disable-next-line class-methods-use-this
  enterNUMERIC_LITERAL(model) {
    const value = model.getValue ? model.getValue() : model.value;
    return String(value);
  }
  /**
   * Handle PLUS operator
   */
  // eslint-disable-next-line class-methods-use-this
  enterPLUS(_) {
    return "+";
  }
  // eslint-disable-next-line class-methods-use-this
  enterMINUS(_) {
    return "-";
  }
  // eslint-disable-next-line class-methods-use-this
  enterMULTIPLY(_) {
    return "*";
  }
  // eslint-disable-next-line class-methods-use-this
  enterDIVIDE(_) {
    return "/";
  }
  /**
   * Handle DISPATCH_EVENT node visited directly (e.g. from WSDL callback blocks).
   * Delegates to generateGlobalActionScript which handles both raw JSON and model instances.
   */
  enterDISPATCH_EVENT(model) {
    return this.generateGlobalActionScript(model);
  }
  /**
   * Handle FUNCTION_CALL node
   */
  enterFUNCTION_CALL(model) {
    const functionInfo = model.functionName || {};
    const functionName = functionInfo.id;
    const { impl } = functionInfo;
    const funcArgs = functionInfo.args || [];
    if (!functionName) {
      return "";
    }
    const rawArgs = model.params || [];
    if (functionName === "getEventPayload") {
      const param = rawArgs[0];
      if (param && param.choice !== null) {
        const key = this.visit(ModelFactory.createModel(param));
        return `$event.payload.${key.replace(/^'|'$/g, "")}`;
      }
      return "$event.payload";
    }
    const scopeFunctionDef = this.scope?.getFunction?.(functionName);
    if (scopeFunctionDef?.isErrorHandler) {
      const callPayload = "toObject($event.payload.body), $event.payload.headers";
      if (functionName === "defaultErrorHandler") {
        return `${functionName}(${callPayload})`;
      }
      return `${functionName}(${callPayload}) && defaultErrorHandler(${callPayload})`;
    }
    let resolvedImpl = impl;
    let resolvedFuncArgs = funcArgs;
    if (!resolvedImpl && scopeFunctionDef) {
      resolvedImpl = scopeFunctionDef.impl;
      resolvedFuncArgs = scopeFunctionDef.args || [];
    }
    if (!resolvedImpl) {
      return "";
    }
    const previousInFunctionCall = this.inFunctionCall;
    const previousInFunctionCallAsObject = this.inFunctionCallAsObject;
    const args = rawArgs.map((arg, index) => {
      const isEmptySlot = !arg || arg.choice === null || arg.choice?.nodeName === "COMPONENT" && !arg.choice?.value;
      if (isEmptySlot) {
        return null;
      }
      const argType = resolvedFuncArgs[index]?.type ?? "";
      const hasPrimitiveType = /STRING|NUMBER|BOOLEAN|DATE/.test(argType);
      const isComponentArg = !hasPrimitiveType && /OBJECT|AFCOMPONENT|FORM/.test(argType);
      this.inFunctionCall = true;
      this.inFunctionCallAsObject = isComponentArg;
      const argModel = ModelFactory.createModel(arg);
      let result2 = this.visit(argModel);
      if (this.toggleProvider.isEnabled("FT_FORMS_14303") && arg.choice?.nodeName === "COMPONENT" && arg.choice?.value && argType.split("|").some((t) => isArrayTypeToken(t.trim()))) {
        const fieldId = arg.choice.value.id;
        if (this.scope?.getComponent?.(fieldId)?.isAncestorRepeatable) {
          result2 = modifyRepeatablePanelFieldId(result2);
        }
      }
      return result2;
    });
    this.inFunctionCall = previousInFunctionCall;
    this.inFunctionCallAsObject = previousInFunctionCallAsObject;
    const ft19581On = this.toggleProvider?.isEnabled("FT_FORMS_19581") ?? true;
    let result = resolvedImpl.replace("$0", functionName);
    args.forEach((arg, index) => {
      const n = index + 1;
      const withDefault = new RegExp(`\\$${n}=([^,)]+)`);
      if (withDefault.test(result)) {
        result = result.replace(
          withDefault,
          ft19581On ? (_, defaultVal) => arg === null ? defaultVal : arg : () => arg === null ? "undefined" : arg
        );
      } else {
        result = result.replace(`$${n}`, arg === null ? "undefined" : arg);
      }
    });
    return result;
  }
  /**
   * Handle ASYNC_FUNCTION_CALL node.
   * Wraps the underlying function call with awaitFn(). If callbacks are present,
   * registers success/failure custom events and passes their names to awaitFn().
   */
  enterASYNC_FUNCTION_CALL(model) {
    const funcCallModel = ModelFactory.createModel({
      nodeName: "FUNCTION_CALL",
      functionName: model.functionName,
      params: model.params
    });
    const funcScript = this.visit(funcCallModel);
    if (!model.callbacks) {
      return `awaitFn(${funcScript})`;
    }
    const callbackId = model.callbacks.id;
    const funcId = model.functionName?.id || "fn";
    const successEvent = `custom:${funcId}_success_${callbackId}`;
    const failureEvent = `custom:${funcId}_failure_${callbackId}`;
    ["success", "failure"].forEach((type) => {
      const callbackNode = model.callbacks[type];
      if (!callbackNode) {
        return;
      }
      const eventName = type === "success" ? successEvent : failureEvent;
      const subTransformer = new _JsonFormulaTransformer(this.scope, this.toggleProvider);
      subTransformer.currentEvent = { ...this.currentEvent };
      subTransformer.eventSourceComponentId = this.eventSourceComponentId;
      const callbackModel = ModelFactory.createModel(callbackNode);
      const callbackScript = subTransformer.visit(callbackModel);
      let content;
      if (Array.isArray(callbackScript)) {
        content = callbackScript;
      } else if (typeof callbackScript === "string" && callbackScript) {
        content = callbackScript.split("\n").filter(Boolean);
      } else if (Array.isArray(callbackScript?.content)) {
        content = callbackScript.content;
      } else if (Array.isArray(subTransformer.result?.script?.content)) {
        content = subTransformer.result.script.content;
      } else {
        content = [];
      }
      this.otherEvents[eventName] = { content, preserveEmpty: true };
      Object.entries(subTransformer.otherEvents || {}).forEach(([k, v]) => {
        if (k !== eventName) {
          this.otherEvents[k] = v;
        }
      });
    });
    return `awaitFn(${funcScript}, '${successEvent}', '${failureEvent}')`;
  }
  /**
   * Handle CALLBACK node — a list of CONDITION_BLOCK_STATEMENTS items.
   */
  enterCALLBACK(model) {
    if (!Array.isArray(model.items) || model.items.length === 0) {
      return "";
    }
    const scripts = [];
    model.items.forEach((item) => {
      const subTransformer = new _JsonFormulaTransformer(this.scope, this.toggleProvider);
      subTransformer.currentEvent = { ...this.currentEvent };
      subTransformer.eventSourceComponentId = this.eventSourceComponentId;
      const itemScript = subTransformer.visit(item);
      if (Array.isArray(itemScript)) {
        scripts.push(...itemScript);
      } else if (itemScript) {
        scripts.push(itemScript);
      } else {
        const content = subTransformer.result?.script?.content;
        if (Array.isArray(content)) {
          scripts.push(...content);
        } else if (content) {
          scripts.push(content);
        }
      }
      Object.entries(subTransformer.otherEvents || {}).forEach(([k, v]) => {
        this.otherEvents[k] = v;
      });
    });
    return scripts.join("\n");
  }
  /**
   * Handle CONDITION_BLOCK_STATEMENTS node.
   * Grammar: When CONDITION Then BLOCK_STATEMENTS
   * items: [When, CONDITION, Then, BLOCK_STATEMENTS]
   */
  enterCONDITION_BLOCK_STATEMENTS(model) {
    const conditionNode = model.items?.[1];
    const blockStatementsNode = model.items?.[3];
    if (!conditionNode || !blockStatementsNode) {
      return "";
    }
    const condScript = this.visit(conditionNode);
    const savedComponentActions = this.componentActions;
    this.componentActions = /* @__PURE__ */ new Map();
    (blockStatementsNode.items || []).forEach((stmt) => {
      this.processBlockStatement(stmt);
    });
    const scripts = [];
    this.componentActions.forEach((actions, comp) => {
      if (comp === "__global__") {
        actions.forEach((act) => {
          const script = this.generateGlobalActionScript(act);
          if (script) {
            scripts.push(condScript ? `if(${condScript}, ${script}, {})` : script);
          }
        });
      } else {
        const baseScript = this.generateActionScript(comp, actions);
        if (baseScript) {
          baseScript.split("\n").forEach((line) => {
            scripts.push(condScript ? `if(${condScript}, ${line}, {})` : line);
          });
        }
      }
    });
    this.componentActions = savedComponentActions;
    return scripts.join("\n");
  }
  /**
   * Handle SET_VARIABLE node
   * Structure: [key, VARIABLE_NAME(choice=name), value, VARIABLE_VALUE(choice=expr),
   *   on, AFCOMPONENT]
   */
  enterSET_VARIABLE(model) {
    const name = this.visit(ModelFactory.createModel(model.items[1]));
    const varValueNode = model.items[3];
    const varValueChoice = varValueNode?.choice;
    let val;
    if (varValueChoice?.nodeName === "AFCOMPONENT") {
      const refId = varValueChoice?.value?.id || varValueChoice?.properties?.id;
      const refField2 = this.currentEvent.field || this.eventSourceComponentId;
      val = refField2 ? _JsonFormulaTransformer.getRelativeName(refId, refField2) : refId || "";
    } else {
      val = this.visit(varValueNode);
    }
    const componentNode = model.items[5];
    const componentId = componentNode?.value?.id || componentNode?.properties?.id;
    if (!componentId || componentId === "$globalForm") {
      return `setVariable(${name}, ${val})`;
    }
    const refField = this.currentEvent.field || this.eventSourceComponentId;
    const component = refField ? _JsonFormulaTransformer.getRelativeName(componentId, refField) : componentId;
    return `setVariable(${name}, ${val}, ${component})`;
  }
  /**
   * Handle GET_VARIABLE node (old grammar, backward-compat with saved JCR data)
   * Structure: [key, VARIABLE_NAME(choice=name), from, AFCOMPONENT]
   */
  enterGET_VARIABLE(model) {
    const name = this.visit(ModelFactory.createModel(model.items[1]));
    const componentNode = model.items[3];
    const componentId = componentNode?.value?.id || componentNode?.properties?.id;
    if (!componentId || componentId === "$globalForm") {
      return `getVariable(${name})`;
    }
    const refField = this.currentEvent.field || this.eventSourceComponentId;
    const component = refField ? _JsonFormulaTransformer.getRelativeName(componentId, refField) : componentId;
    return `getVariable(${name}, ${component})`;
  }
};

// src/transformers/JsonFormulaMerger.js
var ARRAY_EVENTS = ["Value Commit", "Click", "Initialize"];
var isArrayEvent = (eventName) => ARRAY_EVENTS.indexOf(eventName) > -1 || eventName && eventName.startsWith("custom:");
var wrapValueCommitLine = (line) => `if(contains($event.payload.changes[].propertyName, 'value'), ${line}, {})`;
var mergeIntoField = (fieldEvents, script) => {
  const {
    event: eventName,
    content,
    scalar,
    preserveEmpty
  } = script;
  if (scalar) {
    return { ...fieldEvents, [eventName]: { content, scalar: true } };
  }
  const isEvent = isArrayEvent(eventName);
  const existing = fieldEvents[eventName] || { content: isEvent ? [] : "" };
  const existingPreserveEmpty = existing.preserveEmpty || false;
  let mergedContent;
  if (isEvent) {
    const newContent = eventName === "Value Commit" ? content.map(wrapValueCommitLine) : content;
    const combined = existing.content.concat(newContent);
    mergedContent = combined;
  } else {
    mergedContent = existing.content ? `${existing.content} || ${content}` : content;
  }
  const merged = preserveEmpty || existingPreserveEmpty;
  return { ...fieldEvents, [eventName]: { content: mergedContent, preserveEmpty: merged } };
};
var mergeScript = (scriptArray) => scriptArray.reduce((fields, script) => {
  const { field } = script;
  const fieldEvents = fields[field] || {};
  return { ...fields, [field]: mergeIntoField(fieldEvents, script) };
}, {});
var JsonFormulaMerger = { mergeScript };

// src/validators/RuleValidator.js
var CONTEXT_RULES = {
  "fd:click": /* @__PURE__ */ new Set(["EVENT_SCRIPTS", "TRIGGER_SCRIPTS"]),
  "fd:init": /* @__PURE__ */ new Set(["EVENT_SCRIPTS", "TRIGGER_SCRIPTS"]),
  // Legacy mapping stores change-event scripts under fd:valueCommit.
  "fd:valueCommit": /* @__PURE__ */ new Set(["EVENT_SCRIPTS", "TRIGGER_SCRIPTS"]),
  "fd:submitSuccess": /* @__PURE__ */ new Set(["EVENT_SCRIPTS", "TRIGGER_SCRIPTS"]),
  "fd:submitError": /* @__PURE__ */ new Set(["EVENT_SCRIPTS", "TRIGGER_SCRIPTS"]),
  // fd:calc stores calculate/clear expressions in legacy rule persistence.
  "fd:calc": /* @__PURE__ */ new Set(["CALC_EXPRESSION", "CLEAR_EXPRESSION"]),
  "fd:format": /* @__PURE__ */ new Set(["FORMAT_EXPRESSION"]),
  "fd:validate": /* @__PURE__ */ new Set(["VALIDATE_EXPRESSION"]),
  // fd:visible stores conditional visibility expressions (hide when / show when).
  "fd:visible": /* @__PURE__ */ new Set(["VISIBLE_EXPRESSION", "SHOW_EXPRESSION"]),
  // fd:enabled stores conditional enabled/disabled expressions (enable when / disable when).
  "fd:enabled": /* @__PURE__ */ new Set(["ACCESS_EXPRESSION", "DISABLE_EXPRESSION"])
};
var FT_GATED_NODES = {
  FORMAT_EXPRESSION: "FT_FORMS_13193",
  ASYNC_FUNCTION_CALL: "FT_FORMS_13519",
  CALLBACK: "FT_FORMS_13519",
  CONDITION_BLOCK_STATEMENTS: "FT_FORMS_13519",
  WSDL_CALLBACK_STATEMENT: "FT_FORMS_11584",
  IS_VALID: "FT_FORMS_17090",
  IS_NOT_VALID: "FT_FORMS_17090",
  // Form-level save events — only available when FT_FORMS_11581 (SAVE_FORM) is enabled
  "is saved successfully": "FT_FORMS_11581",
  "fails to save": "FT_FORMS_11581",
  SAVE_FORM: "FT_FORMS_11581",
  NAVIGATE_IN_PANEL: "FT_FORMS_10781",
  WRITE_JSON_FORMULA: "FT_FORMS_20655",
  SET_VARIABLE: "FT_FORMS_19884",
  GET_VARIABLE: "FT_FORMS_19884"
};
var pushDiagnostic = (diagnostics, severity, details) => {
  diagnostics[severity].push({
    code: details.code,
    message: details.message,
    path: details.path,
    node: details.node ?? null,
    expected: details.expected,
    actual: details.actual,
    alternatives: details.alternatives,
    available: details.available,
    requiredToggle: details.requiredToggle
  });
};
var parseSequenceRule = (nodeName, toggleProvider) => {
  const ruleText = getRule(nodeName, toggleProvider);
  if (!ruleText) {
    return null;
  }
  if (ruleText.includes("|") || ruleText.includes("+") || ruleText.includes("*")) {
    return null;
  }
  return ruleText.split(/\s+/).filter(Boolean);
};
var getGrammarModelType = (nodeName, toggleProvider) => {
  const ruleText = getRule(nodeName, toggleProvider);
  if (!ruleText) {
    return "unknown";
  }
  if (ruleText.includes("|")) {
    return "choice";
  }
  if (ruleText.includes("+") || ruleText.includes("*")) {
    return "list";
  }
  if (ruleText === "FUNCTION") {
    return "function";
  }
  return "sequence";
};
var collectTreeIds = (treeNode) => {
  if (!treeNode || typeof treeNode !== "object") {
    return /* @__PURE__ */ new Set();
  }
  const currentId = treeNode.id ? [treeNode.id] : [];
  const nestedIds = Array.isArray(treeNode.items) ? treeNode.items.flatMap((child) => [...collectTreeIds(child)]) : [];
  return /* @__PURE__ */ new Set([...currentId, ...nestedIds]);
};
var formatTypeTokens = (typeValue) => {
  if (Array.isArray(typeValue)) {
    return typeValue.flatMap((token) => String(token).split("|")).map((token) => token.trim()).filter(Boolean);
  }
  if (typeof typeValue === "string") {
    return typeValue.split("|").map((token) => token.trim()).filter(Boolean);
  }
  return [];
};
var validateSequenceNode = (node, path, diagnostics, toggleProvider) => {
  const expectedSequence = parseSequenceRule(node.nodeName, toggleProvider);
  if (!expectedSequence || !Array.isArray(node.items)) {
    return;
  }
  const actualNodeNames = node.items.map((item) => item?.nodeName);
  const ftLength = expectedSequence.length;
  const allowBase = isFtBaseAllowed(node.nodeName, toggleProvider);
  const baseSequence = allowBase ? parseSequenceRule(node.nodeName, null) : null;
  const baseLength = baseSequence?.length ?? ftLength;
  const matchesFt = actualNodeNames.length === ftLength;
  const matchesBase = allowBase && actualNodeNames.length === baseLength;
  if (!matchesFt && !matchesBase) {
    const lengthDesc = allowBase && baseLength !== ftLength ? `${baseLength} or ${ftLength}` : String(ftLength);
    pushDiagnostic(diagnostics, "errors", {
      code: "GRAMMAR_SEQUENCE_MISMATCH",
      message: `Expected ${lengthDesc} nodes for ${node.nodeName}, found ${actualNodeNames.length}`,
      path: `${path}.items`,
      node: node.nodeName,
      expected: expectedSequence,
      actual: actualNodeNames,
      alternatives: expectedSequence
    });
    return;
  }
  const primarySequence = !matchesFt && matchesBase ? baseSequence : expectedSequence;
  const fallbackSequence = allowBase && matchesFt && matchesBase ? baseSequence : null;
  const mismatches = [];
  primarySequence.forEach((expectedNode, index) => {
    const actual = actualNodeNames[index];
    if (actual !== expectedNode) {
      mismatches.push({ index, expectedNode, actual });
    }
  });
  if (mismatches.length > 0 && fallbackSequence) {
    const fallbackMismatches = fallbackSequence.filter((expectedNode, index) => actualNodeNames[index] !== expectedNode);
    if (fallbackMismatches.length === 0) {
      return;
    }
  }
  mismatches.forEach(({ index, expectedNode, actual }) => {
    pushDiagnostic(diagnostics, "errors", {
      code: "GRAMMAR_SEQUENCE_MISMATCH",
      message: `Expected ${expectedNode} at index ${index} for ${node.nodeName}, found ${actual ?? "undefined"}`,
      path: `${path}.items[${index}].nodeName`,
      node: node.nodeName,
      expected: expectedNode,
      actual: actual ?? null,
      alternatives: primarySequence
    });
  });
};
var validateChoiceNode = (node, path, diagnostics, toggleProvider) => {
  if (!GrammarConfig[node.nodeName]?.ftRule) {
    return;
  }
  const ruleText = getRule(node.nodeName, toggleProvider);
  if (!ruleText || !ruleText.includes("|")) {
    return;
  }
  if (!node.choice?.nodeName) {
    return;
  }
  const validChoices = ruleText.split("|").map((s) => s.trim()).filter(Boolean);
  if (!validChoices.includes(node.choice.nodeName)) {
    pushDiagnostic(diagnostics, "errors", {
      code: "GRAMMAR_CHOICE_INVALID",
      message: `${node.choice.nodeName} is not a valid choice for ${node.nodeName}`,
      path: `${path}.choice.nodeName`,
      node: node.nodeName,
      expected: validChoices,
      actual: node.choice.nodeName
    });
  }
};
var validateContext = (ruleAST, storagePath, diagnostics, toggleProvider) => {
  if (!storagePath) {
    return;
  }
  const actualStatement = ruleAST?.items?.[0]?.choice?.nodeName;
  if (!CONTEXT_RULES[storagePath]) {
    if (toggleProvider?.isEnabled("FT_FORMS_21264") && actualStatement && actualStatement !== "TRIGGER_SCRIPTS") {
      pushDiagnostic(diagnostics, "errors", {
        code: "CONTEXT_STATEMENT_MISMATCH",
        message: `Statement ${actualStatement} is invalid for ${storagePath} context`,
        path: "$.items[0].choice.nodeName",
        node: "STATEMENT",
        expected: ["TRIGGER_SCRIPTS"],
        actual: actualStatement,
        alternatives: ["TRIGGER_SCRIPTS"]
      });
    }
    return;
  }
  if (!actualStatement) {
    return;
  }
  if (CONTEXT_RULES[storagePath].has(actualStatement)) {
    return;
  }
  pushDiagnostic(diagnostics, "errors", {
    code: "CONTEXT_STATEMENT_MISMATCH",
    message: `Statement ${actualStatement} is invalid for ${storagePath} context`,
    path: "$.items[0].choice.nodeName",
    node: "STATEMENT",
    expected: [...CONTEXT_RULES[storagePath]],
    actual: actualStatement,
    alternatives: [...CONTEXT_RULES[storagePath]]
  });
};
var RuleValidator = class _RuleValidator {
  constructor(scope, toggleProvider) {
    this.scope = scope;
    this.componentIds = collectTreeIds(this.scope.treeJson);
    this.toggleProvider = toggleProvider || new StaticToggleProvider();
  }
  validate(ruleAST, storagePath) {
    const diagnostics = {
      errors: [],
      warnings: []
    };
    if (!ruleAST || typeof ruleAST !== "object") {
      pushDiagnostic(diagnostics, "errors", {
        code: "VALIDATION_INPUT_INVALID",
        message: "validate expects a non-null object",
        path: "$",
        node: null
      });
      return { valid: false, ...diagnostics };
    }
    this._walk(ruleAST, "$", diagnostics);
    validateContext(ruleAST, storagePath, diagnostics, this.toggleProvider);
    return {
      valid: diagnostics.errors.length === 0,
      ...diagnostics
    };
  }
  _walk(node, path, diagnostics, parent = null) {
    if (!node || typeof node !== "object") {
      pushDiagnostic(diagnostics, "errors", {
        code: "GRAMMAR_NODE_INVALID",
        message: "Expected AST node object",
        path,
        node: null
      });
      return;
    }
    if (!node.nodeName || typeof node.nodeName !== "string") {
      pushDiagnostic(diagnostics, "errors", {
        code: "GRAMMAR_NODE_NAME_MISSING",
        message: "Each AST node must contain nodeName",
        path: `${path}.nodeName`,
        node: null
      });
      return;
    }
    const requiredToggle = FT_GATED_NODES[node.nodeName];
    if (requiredToggle && this.toggleProvider && !this.toggleProvider.isEnabled(requiredToggle)) {
      pushDiagnostic(diagnostics, "errors", {
        code: "FT_MISMATCH",
        message: `${node.nodeName} requires feature toggle ${requiredToggle} to be enabled`,
        path,
        node: node.nodeName,
        requiredToggle
      });
      return;
    }
    if (node.nodeName === "SET_VALUE_STATEMENT" && this.toggleProvider && !this.toggleProvider.isEnabled("FT_FORMS_11584")) {
      const targetField = node.items?.[0];
      const targetType = targetField?.value?.type || targetField?.properties?.type;
      if (targetType === "PANEL" || targetType === "CONTAINER") {
        pushDiagnostic(diagnostics, "errors", {
          code: "FT_MISMATCH",
          message: "SET_VALUE_STATEMENT targeting PANEL/CONTAINER requires feature toggle FT_FORMS_11584 to be enabled",
          path,
          node: "SET_VALUE_STATEMENT",
          requiredToggle: "FT_FORMS_11584"
        });
        return;
      }
    }
    validateSequenceNode(node, path, diagnostics, this.toggleProvider);
    validateChoiceNode(node, path, diagnostics, this.toggleProvider);
    this._validateFunctionNode(node, path, diagnostics);
    this._validateMemberExpression(node, path, diagnostics);
    _RuleValidator.validateOperatorNode(node, path, diagnostics, parent);
    this._validateWsdlStatement(node, path, diagnostics);
    const modelType = getGrammarModelType(node.nodeName, this.toggleProvider);
    if ((modelType === "sequence" || modelType === "list") && Object.prototype.hasOwnProperty.call(node, "items") && !Array.isArray(node.items)) {
      pushDiagnostic(diagnostics, "errors", {
        code: "GRAMMAR_MODEL_MISMATCH",
        message: `Node ${node.nodeName} must use items as an array`,
        path: `${path}.items`,
        node: node.nodeName,
        expected: "items[]",
        actual: typeof node.items
      });
      return;
    }
    if (modelType === "choice" && Object.prototype.hasOwnProperty.call(node, "choice") && node.choice != null && typeof node.choice !== "object") {
      pushDiagnostic(diagnostics, "errors", {
        code: "GRAMMAR_MODEL_MISMATCH",
        message: `Node ${node.nodeName} must use choice as an object or null`,
        path: `${path}.choice`,
        node: node.nodeName,
        expected: "choice object | null",
        actual: typeof node.choice
      });
      return;
    }
    if (Array.isArray(node.items)) {
      node.items.forEach((child, index) => {
        this._walk(child, `${path}.items[${index}]`, diagnostics, node);
      });
    }
    if (node.choice) {
      this._walk(node.choice, `${path}.choice`, diagnostics, node);
    }
  }
  _validateFunctionNode(node, path, diagnostics) {
    if (node.nodeName !== "FUNCTION_CALL") {
      return;
    }
    const functionId = node?.functionName?.id || node?.functionName?.name;
    if (!functionId) {
      pushDiagnostic(diagnostics, "errors", {
        code: "SEMANTIC_FUNCTION_NAME_MISSING",
        message: "FUNCTION_CALL requires functionName.id",
        path: `${path}.functionName.id`,
        node: "FUNCTION_CALL"
      });
      return;
    }
    const functionDef = this.scope.getFunction?.(functionId);
    if (!functionDef) {
      const availableFunctions = Object.keys(this.scope.functions || {}).sort();
      pushDiagnostic(diagnostics, "errors", {
        code: "SEMANTIC_FUNCTION_UNKNOWN",
        message: `Function '${functionId}' was not found in scope definitions`,
        path: `${path}.functionName.id`,
        node: "FUNCTION_CALL",
        available: availableFunctions
      });
      return;
    }
    const nonGlobalsArgs = Array.isArray(functionDef.args) ? functionDef.args.filter((a) => a.name !== "globals") : [];
    const ft19581On = this.toggleProvider?.isEnabled("FT_FORMS_19581") ?? true;
    const mandatoryCount = ft19581On ? nonGlobalsArgs.filter((a) => a.isMandatory !== false).length : nonGlobalsArgs.length;
    const maxCount = nonGlobalsArgs.length;
    const params = Array.isArray(node.params) ? node.params : [];
    const isEmptySlotParam = (p) => p?.choice === null || p?.choice?.nodeName === "COMPONENT" && !p?.choice?.value;
    const actualArity = ft19581On ? params.length : params.filter((p) => !isEmptySlotParam(p)).length;
    if (actualArity < mandatoryCount || actualArity > maxCount) {
      const arityDesc = mandatoryCount === maxCount ? String(mandatoryCount) : `${mandatoryCount}-${maxCount}`;
      pushDiagnostic(diagnostics, "errors", {
        code: "SEMANTIC_FUNCTION_ARITY_MISMATCH",
        message: `Function '${functionId}' expects ${arityDesc} arguments but received ${actualArity}`,
        path: `${path}.params`,
        node: "FUNCTION_CALL"
      });
    }
    if (Object.hasOwn(node, "params") && !Array.isArray(node.params)) {
      pushDiagnostic(diagnostics, "errors", {
        code: "GRAMMAR_MODEL_MISMATCH",
        message: "FUNCTION_CALL params must be an array",
        path: `${path}.params`,
        node: "FUNCTION_CALL",
        expected: "params[]",
        actual: typeof node.params
      });
      return;
    }
    (Array.isArray(node.params) ? node.params : []).forEach((param, i) => {
      const paramPath = `${path}.params[${i}]`;
      if (!param || param.nodeName !== "EXPRESSION" || !Object.hasOwn(param, "choice")) {
        pushDiagnostic(diagnostics, "errors", {
          code: "SEMANTIC_FUNCTION_PARAM_NOT_EXPRESSION",
          message: `Param ${i} of '${functionId}' must be an EXPRESSION choice node`,
          path: paramPath,
          node: "FUNCTION_CALL"
        });
        return;
      }
      this._walk(param, paramPath, diagnostics, node);
    });
    nonGlobalsArgs.forEach((argDef, index) => {
      const param = node.params?.[index];
      if (!param) {
        return;
      }
      const choiceNodeName = param.choice?.nodeName;
      const literalType = LITERAL_NODE_TYPE_MAP[choiceNodeName];
      if (!literalType) {
        return;
      }
      const expectedTypes = argDef.type.split("|").map((t) => t.trim());
      if (!expectedTypes.includes(literalType)) {
        pushDiagnostic(diagnostics, "errors", {
          code: "SEMANTIC_FUNCTION_ARG_TYPE_MISMATCH",
          message: `Argument ${index + 1} of '${functionId}' expects ${argDef.type} but received ${literalType}`,
          path: `${path}.params[${index}]`,
          node: "FUNCTION_CALL",
          expected: argDef.type,
          actual: literalType
        });
      }
    });
  }
  _validateWsdlStatement(node, path, diagnostics) {
    if (node.nodeName !== "WSDL_STATEMENT") {
      return;
    }
    const wsdlInfo = node.properties?.wsdlInfo || {};
    if (wsdlInfo.type !== "api-integration") {
      return;
    }
    const hasInline = Boolean(wsdlInfo.inputJson);
    const hasScopeEntry = Boolean(this.scope.getApiIntegration?.(wsdlInfo.formDataModelId));
    if (!hasInline && !hasScopeEntry) {
      pushDiagnostic(diagnostics, "errors", {
        code: "API_INTEGRATION_MISSING",
        message: `api-integration spec not found for ${wsdlInfo.formDataModelId}: provide wsdlInfo.inputJson or register it in scope.apiIntegrations`,
        path: `${path}.properties.wsdlInfo`,
        node: "WSDL_STATEMENT"
      });
    }
  }
  _validateMemberExpression(node, path, diagnostics) {
    if (node.nodeName !== "MEMBER_EXPRESSION") {
      return;
    }
    if (!Array.isArray(node.items) || node.items.length < 3) {
      return;
    }
    const property = node.items[0]?.value;
    const componentId = node.items[2]?.value?.id;
    if (!componentId) {
      return;
    }
    if (!this.componentIds.has(componentId)) {
      pushDiagnostic(diagnostics, "errors", {
        code: "SEMANTIC_MEMBER_COMPONENT_UNKNOWN",
        message: `Component '${componentId}' was not found in scope`,
        path: `${path}.items[2].value.id`,
        node: "MEMBER_EXPRESSION"
      });
      return;
    }
    const componentNode = this._findComponent(this.scope.treeJson, componentId);
    const availableProperties = this._getAllowedMemberProperties(componentNode?.type);
    if (typeof property === "string" && !availableProperties.includes(property)) {
      const typeTokens = formatTypeTokens(componentNode?.type);
      const typeLabel = typeTokens.length > 0 ? typeTokens.join("|") : "unknown";
      pushDiagnostic(diagnostics, "errors", {
        code: "SEMANTIC_MEMBER_PROPERTY_INVALID",
        message: `Property '${property}' is not valid for component '${componentId}' (types: ${typeLabel})`,
        path: `${path}.items[0].value`,
        node: "MEMBER_EXPRESSION",
        available: [...availableProperties].sort()
      });
    }
  }
  static validateOperatorNode(node, path, diagnostics, parent) {
    if (node.nodeName !== "OPERATOR") {
      return;
    }
    const operatorName = node.choice?.nodeName;
    if (!operatorName) {
      pushDiagnostic(diagnostics, "errors", {
        code: "GRAMMAR_OPERATOR_MISSING",
        message: "OPERATOR node must have a choice",
        path: `${path}.choice`,
        node: "OPERATOR"
      });
      return;
    }
    if (!parent) {
      return;
    }
    const validOperators = _RuleValidator.getValidOperatorsForContext(parent.nodeName);
    if (!validOperators || validOperators.length === 0) {
      return;
    }
    if (!validOperators.includes(operatorName)) {
      pushDiagnostic(diagnostics, "errors", {
        code: "GRAMMAR_OPERATOR_INVALID",
        message: `Operator '${operatorName}' is not valid in ${parent.nodeName} context`,
        path: `${path}.choice.nodeName`,
        node: parent.nodeName,
        expected: validOperators,
        actual: operatorName,
        alternatives: validOperators
      });
    }
  }
  static getValidOperatorsForContext(contextNodeName) {
    const config = GrammarConfig[contextNodeName];
    if (!config?.validOperators) {
      return null;
    }
    const spec = config.validOperators;
    if (Array.isArray(spec)) {
      return spec;
    }
    if (spec.groups && Array.isArray(spec.groups)) {
      const operators = spec.groups.flatMap((group) => OperatorGroups[group] || []);
      if (Array.isArray(spec.add)) {
        operators.push(...spec.add);
      }
      return [...new Set(operators)];
    }
    return null;
  }
  static _validateContext(ruleAST, storagePath, diagnostics) {
    if (!storagePath || !CONTEXT_RULES[storagePath]) {
      return;
    }
    const actualStatement = ruleAST?.items?.[0]?.choice?.nodeName;
    if (!actualStatement) {
      return;
    }
    if (CONTEXT_RULES[storagePath].has(actualStatement)) {
      return;
    }
    pushDiagnostic(diagnostics, "errors", {
      code: "CONTEXT_STATEMENT_MISMATCH",
      message: `Statement ${actualStatement} is invalid for ${storagePath} context`,
      path: "$.items[0].choice.nodeName",
      node: "STATEMENT",
      expected: [...CONTEXT_RULES[storagePath]],
      actual: actualStatement,
      alternatives: [...CONTEXT_RULES[storagePath]]
    });
  }
  _findComponent(node, id) {
    if (!node || typeof node !== "object") {
      return null;
    }
    if (node.id === id) {
      return node;
    }
    if (!Array.isArray(node.items)) {
      return null;
    }
    const candidates = node.items.map((child) => this._findComponent(child, id));
    return candidates.find(Boolean) || null;
  }
  _getAllowedMemberProperties(typeValue) {
    return this.scope.getAllowedPropertiesForType(typeValue);
  }
};
function validateRule(ruleAST, options = {}) {
  return new RuleValidator(options.scope, options.toggleProvider).validate(ruleAST, options.storagePath);
}

// src/transformers/FieldTransformer.js
var FD_KEY_TO_EVENT = {
  "fd:click": "Click",
  "fd:init": "Initialize",
  "fd:valueCommit": "Value Commit",
  "fd:enabled": "Enabled",
  "fd:validate": "Validate",
  "fd:format": "Format",
  "fd:calc": "Calculate",
  "fd:visible": "Visibility",
  "fd:options": "Options",
  "fd:submitSuccess": "Successful Submission",
  "fd:submitError": "Error in Submission"
};
var RULE_AST_KEYS = Object.keys(FD_KEY_TO_EVENT);
var EVENT_MAPPING = {
  Click: "event:click",
  Initialize: "event:initialize",
  "Value Commit": "event:change",
  Validate: "validationExpression",
  Format: "displayValueExpression",
  Visibility: "visible",
  Calculate: "value",
  Enabled: "enabled",
  "Successful Submission": "event:submitSuccess",
  "Error in Submission": "event:submitError",
  "Saved successfully": "event:custom_saveSuccess",
  "Error while saving the form": "event:custom_saveError",
  "Layout Ready": "event:layout_ready",
  "Form Ready": "event:form_ready",
  "Doc Ready": "event:doc_ready"
};
var FIELD_KEY = "__field__";
var isFdKey = (key) => key.startsWith("fd:");
var shouldSkip = (parsed) => parsed.enabled === false || parsed.isValid === false;
var transformRule = (scope, toggleProvider, fdKey, jsonString, options = {}) => {
  const parsed = JSON.parse(jsonString);
  if (shouldSkip(parsed)) {
    return null;
  }
  if (options.preflight !== false) {
    const diagnostics = validateRule(parsed, { scope, storagePath: fdKey, toggleProvider });
    if (options.throwOnValidationError !== false && diagnostics.errors.length > 0) {
      throw new Error(
        `FieldTransformer preflight validation failed for ${fdKey} with ${diagnostics.errors.length} error(s)`
      );
    }
  }
  const fdEventName = FD_KEY_TO_EVENT[fdKey] || parsed.eventName;
  if (!fdEventName) {
    return null;
  }
  const model = ModelFactory.createModel(parsed);
  const transformer = new JsonFormulaTransformer(scope, toggleProvider);
  const result = transformer.transform(model);
  const otherEvents = result.otherEvents || null;
  const field = result.field || FIELD_KEY;
  const eventName = result.event || fdEventName;
  const content = result.content || [];
  return {
    field,
    event: eventName,
    content: Array.isArray(content) ? content : [content].filter(Boolean),
    otherEvents
  };
};
var iterateAndTransform = (scope, toggleProvider, fdRulesNode, options = {}) => {
  const scriptArray = [];
  Object.entries(fdRulesNode).forEach(([key, value]) => {
    if (!isFdKey(key) || !Array.isArray(value)) {
      return;
    }
    value.forEach((jsonString) => {
      const entry = transformRule(scope, toggleProvider, key, jsonString, options);
      if (entry) {
        scriptArray.push(entry);
        if (entry.otherEvents) {
          Object.entries(entry.otherEvents).forEach(([evtName, evtContent]) => {
            const scalar = evtContent?.scalar || false;
            const preserveEmpty = evtContent?.preserveEmpty || false;
            const content = evtContent && evtContent.content !== void 0 ? evtContent.content : evtContent;
            let normalizedContent;
            if (scalar) {
              normalizedContent = content;
            } else {
              normalizedContent = Array.isArray(content) ? content : [content].filter(Boolean);
            }
            scriptArray.push({
              field: FIELD_KEY,
              event: evtName,
              content: normalizedContent,
              scalar,
              preserveEmpty,
              otherEvents: null
            });
          });
        }
      }
    });
  });
  return scriptArray;
};
var mapToJcr = (merged) => {
  if (!merged || Object.keys(merged).length === 0) {
    return {};
  }
  const eventMap = {};
  Object.values(merged).forEach((bucket) => {
    Object.entries(bucket).forEach(([eventName, value]) => {
      if (!eventMap[eventName]) {
        eventMap[eventName] = value;
      } else if (eventMap[eventName].scalar || value.scalar) {
        eventMap[eventName] = value.scalar ? value : eventMap[eventName];
      } else {
        const existingContent = eventMap[eventName].content || [];
        const newContent = value.content || [];
        const preserveEmpty = eventMap[eventName].preserveEmpty || value.preserveEmpty;
        eventMap[eventName] = { content: [...existingContent, ...newContent], preserveEmpty };
      }
    });
  });
  const fdEvents = {};
  const fdRules = {};
  const topLevel = {};
  Object.entries(eventMap).forEach(([eventName, evtData]) => {
    const { content, preserveEmpty } = evtData;
    if (content === null || content === void 0 || content === "") {
      return;
    }
    if (Array.isArray(content) && content.length === 0 && !preserveEmpty) {
      return;
    }
    const mappedName = EVENT_MAPPING[eventName];
    const scalarContent = Array.isArray(content) && content.length === 1 ? content[0] : content;
    if (mappedName && mappedName.startsWith("event:")) {
      const eventKey = mappedName.slice("event:".length);
      fdEvents[eventKey] = content;
    } else if (mappedName === "validationExpression" || mappedName === "displayValueExpression") {
      topLevel[mappedName] = scalarContent;
    } else if (mappedName === "value" || mappedName === "enabled" || mappedName === "visible") {
      fdRules[mappedName] = scalarContent;
    } else if (!mappedName && eventName.startsWith("custom:")) {
      const customKey = `custom_${eventName.slice("custom:".length)}`;
      fdEvents[customKey] = content;
    } else if (!mappedName) {
      fdEvents[`custom_${eventName}`] = content;
    }
  });
  const result = { ...topLevel };
  if (Object.keys(fdEvents).length > 0) {
    result["fd:events"] = fdEvents;
  }
  if (Object.keys(fdRules).length > 0) {
    result["fd:rules"] = fdRules;
  }
  return result;
};
var FieldTransformer = class {
  constructor({ scope, toggleProvider }) {
    this.scope = scope;
    this.toggleProvider = toggleProvider;
  }
  /**
   * @param {Object} fdRulesNode - Object with fd:* keys each holding array of rule JSON strings
   * @returns {Object} - JCR output with fd:events, fd:rules, validationExpression, etc.
   */
  transform(fdRulesNode, options = {}) {
    const preflightOptions = {
      preflight: options.preflight !== false,
      throwOnValidationError: options.throwOnValidationError !== false
    };
    const opts = preflightOptions;
    const scriptArray = iterateAndTransform(this.scope, this.toggleProvider, fdRulesNode, opts);
    if (scriptArray.length === 0) {
      return {};
    }
    const merged = JsonFormulaMerger.mergeScript(scriptArray);
    return mapToJcr(merged);
  }
};

// src/RuleTransformer.js
var RuleTransformer = class {
  /**
   * Create a RuleTransformer instance
   * @param {Object} config - Configuration
   * @param {Object} config.scope - Scope configuration
   * @param {Object} config.scope.treeJson - Tree structure from ScopeBuilder
   * @param {Array} config.scope.customFunctions - Custom functions array
   * @param {Object} [config.toggleProvider] - ToggleProvider instance with isEnabled(key) method.
   *   Defaults to StaticToggleProvider(DEFAULT_TOGGLES).
   */
  constructor(config) {
    if (!(config?.scope instanceof RBScope)) {
      throw new Error("RuleTransformer requires scope to be an instance of RBScope");
    }
    this.scope = config.scope;
    this.toggleProvider = config.toggleProvider ?? new StaticToggleProvider(DEFAULT_TOGGLES);
  }
  /**
   * Validate rule JSON in preflight mode
   * @param {Object} input - Rule AST to validate
   * @param {Object} [options]
   * @param {string} [options.storagePath] - Optional storage context (e.g. fd:click)
   * @returns {{ valid: boolean, errors: Array, warnings: Array }}
   */
  validate(input, options = {}) {
    if (!input || typeof input !== "object") {
      throw new Error("RuleTransformer.validate requires a non-null object");
    }
    return validateRule(input, {
      scope: this.scope,
      storagePath: options.storagePath,
      toggleProvider: this.toggleProvider
    });
  }
  /**
   * Transform rule JSON to JSON Formula
   * @param {Object} input - Single rule definition (has nodeName) or JCR structure (has fd:* keys)
   * @param {Object} [options]
   * @param {boolean} [options.preflight=true] -
   * Run validator before transform for AST and fd:* field input
   * @param {boolean} [options.throwOnValidationError=true] - Throw when preflight has errors
   * @param {string} [options.storagePath] - Optional storage context used by validator
   * @returns {Object} - Transformed result
   */
  transform(input, options = {}) {
    if (!input || typeof input !== "object") {
      throw new Error("RuleTransformer.transform requires a non-null object");
    }
    if (input.nodeName) {
      if (options.preflight !== false) {
        const diagnostics = this.validate(input, { storagePath: options.storagePath });
        if (options.throwOnValidationError !== false && diagnostics.errors.length > 0) {
          throw new Error(`RuleTransformer preflight validation failed with ${diagnostics.errors.length} error(s)`);
        }
      }
      const model = ModelFactory.createModel(input);
      return new JsonFormulaTransformer(this.scope, this.toggleProvider).transform(model);
    }
    return new FieldTransformer({
      scope: this.scope,
      toggleProvider: this.toggleProvider
    }).transform(input, {
      preflight: options.preflight !== false,
      throwOnValidationError: options.throwOnValidationError !== false
    });
  }
  /**
   * Validate a JSON Formula script using the @adobe/json-formula compiler.
   * @param {string} script - JSON Formula expression or AEM event script
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateFormula(script) {
    if (!script || typeof script !== "string") {
      return { valid: false, error: "script must be a non-empty string" };
    }
    try {
      new import_json_formula.default().compile(script);
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }
};

// src/index.js
var CustomFunctionParser = __toESM(require_stub_cfp(), 1);

// src/cli/validate-rule.js
(async () => {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
    process.stdout.write(`${[
      "Usage: validate-rule <rule.json> --tree <treeJson.json> [options]",
      "",
      "Options:",
      "  --tree          Path to treeJson (from transform-jcr or transform-content-model)",
      "  --functions     Path to customFunction JSON array (from parse-functions)",
      "  --storage-path  fd:* key for context validation (e.g. fd:calc, fd:click)",
      "  --toggles       Path to JSON object of feature toggle overrides",
      "",
      "Output (valid):   { valid: true, errors: [], warnings: [] }",
      "Output (invalid): { valid: false, errors: [...], warnings: [...] }",
      "Exit: 0 if valid, 1 if invalid"
    ].join("\n")}
`);
    process.exit(0);
  }
  const parsed = {
    rulePath: null,
    treePath: null,
    functionsPath: null,
    storagePath: null,
    togglesPath: null
  };
  for (let i = 0; i < rawArgs.length; i += 1) {
    if (rawArgs[i] === "--tree") {
      i += 1;
      parsed.treePath = rawArgs[i];
    } else if (rawArgs[i] === "--functions") {
      i += 1;
      parsed.functionsPath = rawArgs[i];
    } else if (rawArgs[i] === "--storage-path") {
      i += 1;
      parsed.storagePath = rawArgs[i];
    } else if (rawArgs[i] === "--toggles") {
      i += 1;
      parsed.togglesPath = rawArgs[i];
    } else if (!rawArgs[i].startsWith("--")) {
      parsed.rulePath = rawArgs[i];
    }
  }
  const {
    rulePath,
    treePath,
    functionsPath,
    storagePath,
    togglesPath
  } = parsed;
  if (!rulePath || !treePath) {
    throw new Error("Usage: validate-rule <rule.json> --tree <treeJson.json> [--functions <cf.json>] [--storage-path <fd:key>] [--toggles <t.json>]");
  }
  const ruleJson = JSON.parse(await readFile(rulePath));
  const treeJson = JSON.parse(await readFile(treePath));
  const customFunctions = functionsPath ? JSON.parse(await readFile(functionsPath)) : [];
  const toggleOverrides = togglesPath ? JSON.parse(await readFile(togglesPath)) : {};
  const toggleProvider = new StaticToggleProvider({ ...DEFAULT_TOGGLES, ...toggleOverrides });
  const scope = new RBScope(treeJson, customFunctions, toggleProvider);
  const transformer = new RuleTransformer({ scope, toggleProvider });
  const result = transformer.validate(ruleJson, { storagePath });
  process.stdout.write(`${JSON.stringify(result)}
`);
  process.exit(result.valid ? 0 : 1);
})().catch((e) => {
  process.stdout.write(`${JSON.stringify({ valid: false, errors: [{ code: "CLI_ERROR", message: e.message }], warnings: [] })}
`);
  process.exit(1);
});
