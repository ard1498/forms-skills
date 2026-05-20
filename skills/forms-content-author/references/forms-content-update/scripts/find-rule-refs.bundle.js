#!/usr/bin/env node
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

// stub:stub:CustomFunctionParser
var require_stub_CustomFunctionParser = __commonJS({
  "stub:stub:CustomFunctionParser"(exports2, module2) {
    module2.exports = {};
  }
});

// ../forms-content-author/forms-content-update/scripts/src/find-rule-refs.js
var import_fs = require("fs");

// node_modules/@aemforms/rule-editor-transformer/src/scope/TypesRegistry.js
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
      maximum: { name: "maximum", type: "NUMBER", readOnly: "false" },
      minimumMessage: { name: "minimumMessage", type: "STRING", readOnly: "false" },
      maximumMessage: { name: "maximumMessage", type: "STRING", readOnly: "false" }
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
      maximum: { name: "maximum", type: "DATE", readOnly: "false" },
      minimumMessage: { name: "minimumMessage", type: "STRING", readOnly: "false" },
      maximumMessage: { name: "maximumMessage", type: "STRING", readOnly: "false" }
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
  constructor(typesConfig = DEFAULT_TYPES_CONFIG) {
    this.types = typesConfig;
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

// node_modules/@adobe/json-formula/src/jmespath/dataTypes.js
var dataTypes_default = {
  TYPE_NUMBER: 0,
  TYPE_ANY: 1,
  TYPE_STRING: 2,
  TYPE_ARRAY: 3,
  TYPE_OBJECT: 4,
  TYPE_BOOLEAN: 5,
  TYPE_EXPREF: 6,
  TYPE_NULL: 7,
  TYPE_ARRAY_NUMBER: 8,
  TYPE_ARRAY_STRING: 9,
  TYPE_CLASS: 10,
  TYPE_ARRAY_ARRAY: 11
};

// node_modules/@adobe/json-formula/src/jmespath/tokenDefinitions.js
var tokenDefinitions_default = {
  TOK_EOF: "EOF",
  TOK_UNQUOTEDIDENTIFIER: "UnquotedIdentifier",
  TOK_QUOTEDIDENTIFIER: "QuotedIdentifier",
  TOK_RBRACKET: "Rbracket",
  TOK_RPAREN: "Rparen",
  TOK_COMMA: "Comma",
  TOK_COLON: "Colon",
  TOK_CONCATENATE: "Concatenate",
  TOK_RBRACE: "Rbrace",
  TOK_NUMBER: "Number",
  TOK_CURRENT: "Current",
  TOK_GLOBAL: "Global",
  TOK_FIELD: "Field",
  TOK_EXPREF: "Expref",
  TOK_PIPE: "Pipe",
  TOK_OR: "Or",
  TOK_AND: "And",
  TOK_ADD: "Add",
  TOK_SUBTRACT: "Subtract",
  TOK_UNARY_MINUS: "UnaryMinus",
  TOK_MULTIPLY: "Multiply",
  TOK_POWER: "Power",
  TOK_UNION: "Union",
  TOK_DIVIDE: "Divide",
  TOK_EQ: "EQ",
  TOK_GT: "GT",
  TOK_LT: "LT",
  TOK_GTE: "GTE",
  TOK_LTE: "LTE",
  TOK_NE: "NE",
  TOK_FLATTEN: "Flatten",
  TOK_STAR: "Star",
  TOK_FILTER: "Filter",
  TOK_DOT: "Dot",
  TOK_NOT: "Not",
  TOK_LBRACE: "Lbrace",
  TOK_LBRACKET: "Lbracket",
  TOK_LPAREN: "Lparen",
  TOK_LITERAL: "Literal"
};

// node_modules/@adobe/json-formula/src/jmespath/matchType.js
var {
  TYPE_NUMBER,
  TYPE_ANY,
  TYPE_STRING,
  TYPE_ARRAY,
  TYPE_OBJECT,
  TYPE_BOOLEAN,
  TYPE_EXPREF,
  TYPE_NULL,
  TYPE_ARRAY_NUMBER,
  TYPE_ARRAY_STRING,
  TYPE_CLASS,
  TYPE_ARRAY_ARRAY
} = dataTypes_default;
var {
  TOK_EXPREF
} = tokenDefinitions_default;
var TYPE_NAME_TABLE = {
  [TYPE_NUMBER]: "number",
  [TYPE_ANY]: "any",
  [TYPE_STRING]: "string",
  [TYPE_ARRAY]: "array",
  [TYPE_OBJECT]: "object",
  [TYPE_BOOLEAN]: "boolean",
  [TYPE_EXPREF]: "expression",
  [TYPE_NULL]: "null",
  [TYPE_ARRAY_NUMBER]: "Array<number>",
  [TYPE_ARRAY_STRING]: "Array<string>",
  [TYPE_CLASS]: "class",
  [TYPE_ARRAY_ARRAY]: "Array<array>"
};

// node_modules/@adobe/json-formula/src/jmespath/TreeInterpreter.js
var {
  TOK_CURRENT,
  TOK_GLOBAL,
  TOK_EXPREF: TOK_EXPREF2,
  TOK_PIPE,
  TOK_EQ,
  TOK_GT,
  TOK_LT,
  TOK_GTE,
  TOK_LTE,
  TOK_NE,
  TOK_FLATTEN
} = tokenDefinitions_default;
var {
  TYPE_STRING: TYPE_STRING2,
  TYPE_ARRAY_STRING: TYPE_ARRAY_STRING2,
  TYPE_ARRAY: TYPE_ARRAY2
} = dataTypes_default;

// node_modules/@adobe/json-formula/src/jmespath/Lexer.js
var {
  TOK_UNQUOTEDIDENTIFIER,
  TOK_QUOTEDIDENTIFIER,
  TOK_RBRACKET,
  TOK_RPAREN,
  TOK_COMMA,
  TOK_COLON,
  TOK_CONCATENATE,
  TOK_RBRACE,
  TOK_NUMBER,
  TOK_CURRENT: TOK_CURRENT2,
  TOK_GLOBAL: TOK_GLOBAL2,
  TOK_EXPREF: TOK_EXPREF3,
  TOK_PIPE: TOK_PIPE2,
  TOK_OR,
  TOK_AND,
  TOK_ADD,
  TOK_SUBTRACT,
  TOK_UNARY_MINUS,
  TOK_MULTIPLY,
  TOK_POWER,
  TOK_DIVIDE,
  TOK_UNION,
  TOK_EQ: TOK_EQ2,
  TOK_GT: TOK_GT2,
  TOK_LT: TOK_LT2,
  TOK_GTE: TOK_GTE2,
  TOK_LTE: TOK_LTE2,
  TOK_NE: TOK_NE2,
  TOK_FLATTEN: TOK_FLATTEN2,
  TOK_STAR,
  TOK_FILTER,
  TOK_DOT,
  TOK_NOT,
  TOK_LBRACE,
  TOK_LBRACKET,
  TOK_LPAREN,
  TOK_LITERAL
} = tokenDefinitions_default;

// node_modules/@adobe/json-formula/src/jmespath/Parser.js
var {
  TOK_LITERAL: TOK_LITERAL2,
  TOK_COLON: TOK_COLON2,
  TOK_EOF,
  TOK_UNQUOTEDIDENTIFIER: TOK_UNQUOTEDIDENTIFIER2,
  TOK_QUOTEDIDENTIFIER: TOK_QUOTEDIDENTIFIER2,
  TOK_RBRACKET: TOK_RBRACKET2,
  TOK_RPAREN: TOK_RPAREN2,
  TOK_COMMA: TOK_COMMA2,
  TOK_CONCATENATE: TOK_CONCATENATE2,
  TOK_RBRACE: TOK_RBRACE2,
  TOK_NUMBER: TOK_NUMBER2,
  TOK_CURRENT: TOK_CURRENT3,
  TOK_GLOBAL: TOK_GLOBAL3,
  TOK_FIELD,
  TOK_EXPREF: TOK_EXPREF4,
  TOK_PIPE: TOK_PIPE3,
  TOK_OR: TOK_OR2,
  TOK_AND: TOK_AND2,
  TOK_ADD: TOK_ADD2,
  TOK_SUBTRACT: TOK_SUBTRACT2,
  TOK_UNARY_MINUS: TOK_UNARY_MINUS2,
  TOK_MULTIPLY: TOK_MULTIPLY2,
  TOK_POWER: TOK_POWER2,
  TOK_DIVIDE: TOK_DIVIDE2,
  TOK_UNION: TOK_UNION2,
  TOK_EQ: TOK_EQ3,
  TOK_GT: TOK_GT3,
  TOK_LT: TOK_LT3,
  TOK_GTE: TOK_GTE3,
  TOK_LTE: TOK_LTE3,
  TOK_NE: TOK_NE3,
  TOK_FLATTEN: TOK_FLATTEN3,
  TOK_STAR: TOK_STAR2,
  TOK_FILTER: TOK_FILTER2,
  TOK_DOT: TOK_DOT2,
  TOK_NOT: TOK_NOT2,
  TOK_LBRACE: TOK_LBRACE2,
  TOK_LBRACKET: TOK_LBRACKET2,
  TOK_LPAREN: TOK_LPAREN2
} = tokenDefinitions_default;
var bindingPower = {
  [TOK_EOF]: 0,
  [TOK_UNQUOTEDIDENTIFIER2]: 0,
  [TOK_QUOTEDIDENTIFIER2]: 0,
  [TOK_RBRACKET2]: 0,
  [TOK_RPAREN2]: 0,
  [TOK_COMMA2]: 0,
  [TOK_RBRACE2]: 0,
  [TOK_NUMBER2]: 0,
  [TOK_CURRENT3]: 0,
  [TOK_GLOBAL3]: 0,
  [TOK_FIELD]: 0,
  [TOK_EXPREF4]: 0,
  [TOK_PIPE3]: 1,
  [TOK_OR2]: 2,
  [TOK_AND2]: 3,
  [TOK_CONCATENATE2]: 5,
  [TOK_ADD2]: 6,
  [TOK_SUBTRACT2]: 6,
  [TOK_MULTIPLY2]: 7,
  [TOK_DIVIDE2]: 7,
  [TOK_POWER2]: 7,
  [TOK_UNION2]: 7,
  [TOK_EQ3]: 5,
  [TOK_GT3]: 5,
  [TOK_LT3]: 5,
  [TOK_GTE3]: 5,
  [TOK_LTE3]: 5,
  [TOK_NE3]: 5,
  [TOK_FLATTEN3]: 9,
  [TOK_STAR2]: 20,
  [TOK_FILTER2]: 21,
  [TOK_DOT2]: 40,
  [TOK_NOT2]: 30,
  [TOK_UNARY_MINUS2]: 30,
  [TOK_LBRACE2]: 50,
  [TOK_LBRACKET2]: 55,
  [TOK_LPAREN2]: 60
};

// node_modules/@adobe/json-formula/src/jmespath/openFormulaFunctions.js
var MS_IN_DAY = 24 * 60 * 60 * 1e3;

// node_modules/@adobe/json-formula/src/jmespath/jmespath.js
var {
  TYPE_CLASS: TYPE_CLASS2,
  TYPE_ANY: TYPE_ANY2
} = dataTypes_default;

// node_modules/@aemforms/rule-editor-transformer/src/validators/RuleValidator.js
var DEFAULT_TYPES_REGISTRY = new TypesRegistry();

// node_modules/@aemforms/rule-editor-transformer/src/transformers/FieldTransformer.js
var FD_KEY_TO_EVENT = {
  "fd:click": "Click",
  "fd:init": "Initialize",
  "fd:valueCommit": "Value Commit",
  "fd:enabled": "Enabled",
  "fd:validate": "Validate",
  "fd:format": "Format",
  "fd:calc": "Calculate",
  "fd:visible": "Visibility",
  "fd:completion": "Completion",
  "fd:summary": "Summary",
  "fd:options": "Options",
  "fd:navigationChange": "Navigation",
  "fd:submitSuccess": "Successful Submission",
  "fd:submitError": "Error in Submission"
};
var RULE_AST_KEYS = Object.keys(FD_KEY_TO_EVENT);

// node_modules/@aemforms/rule-editor-transformer/src/index.js
var CustomFunctionParser = __toESM(require_stub_CustomFunctionParser(), 1);

// ../forms-shared/scripts/content-model-walk.js
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
    const name = entry.properties?.name || entry.id || "";
    const qualifiedId2 = parentQualifiedId ? `${parentQualifiedId}.${name}` : name;
    const capiKey = parentCapiKey ? `${parentCapiKey}:${idx}` : idx;
    const pointer = `${parentPointer}/items/${idx}`;
    visitor(entry, { name, qualifiedId: qualifiedId2, capiKey, pointer, depth });
    walkItems(
      entry.items || {},
      qualifiedId2,
      capiKey,
      pointer,
      depth + 1,
      visitor
    );
  }
}

// ../forms-content-author/forms-content-update/scripts/src/find-rule-refs.js
function findFdRulesChild(itemsObj) {
  if (!itemsObj || typeof itemsObj !== "object") return null;
  for (const val of Object.values(itemsObj)) {
    if (val.id === "fd:rules" || val.componentType === "fd:rules") return val;
  }
  return null;
}
function hasComponentRef(node, targetId) {
  if (!node || typeof node !== "object") return false;
  if (["COMPONENT", "AFCOMPONENT", "VALUE_FIELD"].includes(node.nodeName) && node.id === targetId) return true;
  for (const val of Object.values(node)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (hasComponentRef(item, targetId)) return true;
      }
    } else if (typeof val === "object" && val !== null) {
      if (hasComponentRef(val, targetId)) return true;
    }
  }
  return false;
}
function findRuleRefs(contentModel2, targetQualifiedId) {
  const formRoot = findFormRoot(contentModel2);
  if (!formRoot) return { refs: [], total: 0 };
  const formRootCapiKey = formRoot["capi-key"] || "0";
  const formRootPointer = formRootCapiKey.split(":").map((s) => `/items/${s}`).join("");
  const refs = [];
  walkItems(formRoot.items || {}, "$form", formRootCapiKey, formRootPointer, 1, (entry, ctx) => {
    const rulesNode = findFdRulesChild(entry.items);
    if (!rulesNode) return;
    const ruleSource = rulesNode.properties || rulesNode;
    for (const fdKey of RULE_AST_KEYS) {
      const astArray = ruleSource[fdKey];
      if (!Array.isArray(astArray) || astArray.length === 0) continue;
      let ast;
      try {
        ast = JSON.parse(astArray[0]);
      } catch {
        continue;
      }
      if (hasComponentRef(ast, targetQualifiedId)) {
        const capiKey = entry["capi-key"] || ctx.capiKey;
        refs.push({
          fieldName: ctx.name,
          capiKey,
          pointer: capiKey.split(":").map((s) => `/items/${s}`).join(""),
          fdKey
        });
      }
    }
  });
  return { refs, total: refs.length };
}
var args = process.argv.slice(2);
var get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : void 0;
};
var contentModelJson = get("--content-model");
var contentModelFile = get("--content-model-file");
var qualifiedId = get("--qualified-id");
if (!contentModelJson && !contentModelFile || !qualifiedId) {
  process.stderr.write(
    "Usage: node find-rule-refs.bundle.js --content-model <json> --qualified-id <id>\n       node find-rule-refs.bundle.js --content-model-file <path> --qualified-id <id>\n"
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
  process.exit(1);
}
var result = findRuleRefs(contentModel, qualifiedId);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(0);
