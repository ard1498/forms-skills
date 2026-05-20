var __import_meta_url__ = require('url').pathToFileURL(__filename).href;

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

// src/cli/find-field.js
(async () => {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${[
      "Usage: find-field --tree <treeJson.json> --name <value>",
      "       find-field --tree <treeJson.json> --names <v1,v2,...>",
      "",
      "Options:",
      "  --tree    Path to treeJson produced by transform-jcr or transform-content-model",
      "  --name    Single field to look up (name, displayName, path, or qualified id)",
      "  --names   Comma-separated list of fields to look up",
      "",
      "Output (single): { found, qualifiedId, name, displayName, type, fieldType, isPanel }",
      "Output (multi):  [{ name, found, ... }, ...]",
      "Exit: 0 = found (all found for multi), 1 = not found, 2 = bad args"
    ].join("\n")}
`);
    process.exit(0);
  }
  const idx = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const treePath = idx("--tree");
  const name = idx("--name");
  const names = idx("--names");
  if (!treePath || !name && !names) {
    throw new Error("Usage: find-field --tree <treeJson.json> --name <field> | --names <f1,f2,...>");
  }
  const treeJson = JSON.parse(await readFile(treePath));
  const scope = new RBScope(treeJson);
  if (name) {
    const result = scope.findByNames([name])[0];
    process.stdout.write(`${JSON.stringify(result)}
`);
    process.exit(result.found ? 0 : 1);
  } else {
    const nameList = names.split(",").map((n) => n.trim()).filter(Boolean);
    const results = scope.findByNames(nameList);
    process.stdout.write(`${JSON.stringify(results)}
`);
    process.exit(results.every((r) => r.found) ? 0 : 1);
  }
})().catch((e) => {
  process.stdout.write(`${JSON.stringify({ found: false, error: e.message })}
`);
  process.exit(2);
});
