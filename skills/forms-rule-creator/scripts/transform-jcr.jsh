var __import_meta_url__ = require('url').pathToFileURL(__filename).href;

// src/cli/transform-jcr.js
var import_os = require("os");
var import_path = require("path");

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
function writeFile(p, c) {
  return import_fs.promises ? import_fs.promises.writeFile(p, c, "utf8") : (0, import_fs.writeFile)(p, c);
}

// src/scope/jcrToScopeTree.js
var DEFAULT_INPUT_PATH = "jcr:content/guideContainer";
function isFieldNode(key, value) {
  return typeof value === "object" && value !== null && "fieldType" in value && !key.startsWith("jcr:") && !key.startsWith("sling:");
}
function jcrNodeToFormJson(jcrNode, keyName) {
  const childItems = Object.entries(jcrNode).filter(([k, v]) => isFieldNode(k, v)).map(([k, v]) => jcrNodeToFormJson(v, k));
  const node = {
    fieldType: jcrNode.fieldType,
    name: (typeof jcrNode.name === "string" ? jcrNode.name : null) || keyName,
    jcrKey: keyName,
    type: jcrNode.type,
    repeatable: jcrNode.repeatable,
    properties: {
      "fd:path": jcrNode["fd:path"],
      "fd:rules": { validationStatus: "none" }
    }
  };
  if (jcrNode["jcr:title"]) {
    node.label = { value: jcrNode["jcr:title"] };
  }
  if (jcrNode.enum) {
    node.enum = jcrNode.enum;
  }
  if (jcrNode.enumNames) {
    node.enumNames = jcrNode.enumNames;
  }
  if (childItems.length > 0) {
    node.items = childItems;
  }
  return node;
}
function buildFormJson(formData) {
  const formName = formData.formPath?.split("/").pop() || "FORM";
  const items = Object.entries(formData).filter(([k, v]) => isFieldNode(k, v)).map(([k, v]) => jcrNodeToFormJson(v, k));
  return {
    fieldType: "form",
    name: formName,
    title: formData.title,
    adaptiveform: formData["fd:version"],
    id: formData.formPath || "",
    properties: {
      "fd:path": formData.formPath || "",
      "fd:rules": { validationStatus: "none" }
    },
    items
  };
}
function addPathsToFormJson(node, formPath, inputPath = DEFAULT_INPUT_PATH, jsonPath = "", isRoot = false) {
  if (!node || typeof node !== "object") {
    return node;
  }
  if (formPath && node.properties) {
    let fullPath;
    if (isRoot) {
      fullPath = formPath;
    } else if (jsonPath) {
      fullPath = `${formPath}/${inputPath}/${jsonPath}`;
    } else {
      fullPath = `${formPath}/${inputPath}`;
    }
    node.properties["fd:path"] = fullPath;
  }
  if (node.items && Array.isArray(node.items)) {
    node.items.forEach((childNode) => {
      const childKey = childNode.jcrKey || childNode.name || "";
      const childJsonPath = jsonPath ? `${jsonPath}/${childKey}` : childKey;
      addPathsToFormJson(childNode, formPath, inputPath, childJsonPath, false);
    });
  }
  return node;
}

// src/scope/fieldTypeUtils.js
var SITES_PANEL_TYPES = /* @__PURE__ */ new Set([
  "panelcontainer",
  "accordion",
  "wizard",
  "tabsontop",
  "verticaltabs",
  "fragment",
  "review"
]);
function isFieldNode2(node) {
  const panelTypes = /* @__PURE__ */ new Set(["panel", "form", "pageset", "pagearea", ...SITES_PANEL_TYPES]);
  return node.fieldType && !panelTypes.has(node.fieldType);
}
function mapFieldType(node, isAncestorRepeatable) {
  const { fieldType } = node;
  if (fieldType === "form") {
    return "FORM";
  }
  if (fieldType === "panel" || SITES_PANEL_TYPES.has(fieldType)) {
    return node.type === "object" ? "AFCOMPONENT|PANEL|OBJECT" : "AFCOMPONENT|PANEL";
  }
  if (fieldType === "plain-text") {
    return "AFCOMPONENT|STATIC TEXT|STRING";
  }
  if (fieldType === "image") {
    return "AFCOMPONENT|IMAGE|STRING";
  }
  if (fieldType === "button") {
    return "AFCOMPONENT|FIELD|BUTTON";
  }
  const dataTypeMap = {
    string: "STRING",
    number: "NUMBER",
    boolean: "BOOLEAN",
    date: "DATE",
    object: "OBJECT",
    file: "BINARY|FILE",
    "string[]": "STRING[]",
    "number[]": "NUMBER[]",
    "date[]": "DATE[]"
  };
  const categoryMap = {
    "text-input": "FIELD|TEXT FIELD",
    "multiline-input": "FIELD|TEXT FIELD",
    email: "FIELD|TEXT FIELD",
    "telephone-input": "FIELD|TEXT FIELD",
    "number-input": "FIELD|NUMBER FIELD",
    "date-input": "FIELD|DATE FIELD",
    "file-input": "FIELD|FILE ATTACHMENT",
    "drop-down": "FIELD|DROPDOWN",
    "radio-group": "FIELD|RADIO BUTTON",
    checkbox: "FIELD",
    "checkbox-group": "FIELD|CHECK BOX"
  };
  const fieldTypeDefaultDataType = {
    "text-input": "string",
    "multiline-input": "string",
    email: "string",
    "telephone-input": "string",
    "drop-down": "string",
    "radio-group": "string",
    checkbox: "string",
    "checkbox-group": "string[]",
    "file-input": "file"
  };
  const category = categoryMap[fieldType] || "FIELD";
  let effectiveNodeType;
  if (fieldType === "date-input") {
    effectiveNodeType = "date";
  } else if (fieldType === "number-input") {
    effectiveNodeType = node.type === "integer" ? "number" : node.type || "number";
  } else {
    effectiveNodeType = node.type || fieldTypeDefaultDataType[fieldType];
  }
  const dataType = dataTypeMap[effectiveNodeType] || "";
  const typeStr = dataType ? `AFCOMPONENT|${category}|${dataType}` : `AFCOMPONENT|${category}`;
  if (isAncestorRepeatable && isFieldNode2(node) && dataType && !dataType.endsWith("[]")) {
    return `${typeStr}|${dataType}[]`;
  }
  return typeStr;
}

// src/scope/contentModelToScopeTree.js
function sortedContentModelValues(itemsObj) {
  if (!itemsObj || typeof itemsObj !== "object") {
    return [];
  }
  return Object.entries(itemsObj).sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10)).map(([idx, entry]) => ({ idx, entry }));
}
function buildContentModelItems(itemsObj, parentQualifiedId, isAncestorRepeatable = false) {
  return sortedContentModelValues(itemsObj).map(({ entry }) => {
    const props = entry.properties || {};
    const name = props.name || entry.id || "";
    const displayName = props["jcr:title"] || name;
    const fieldType = props.fieldType || "";
    const type = mapFieldType({ fieldType, type: props.type }, isAncestorRepeatable);
    const qualifiedId = `${parentQualifiedId}.${name}`;
    const isPanel = !isFieldNode2({ fieldType });
    return {
      id: qualifiedId,
      name,
      displayName,
      type,
      fieldType,
      path: "",
      // content model carries no fd:path; consumers must resolve via JCR if needed
      items: buildContentModelItems(
        entry.items || {},
        qualifiedId,
        isAncestorRepeatable || isPanel && props.repeatable === true
      )
    };
  });
}
function contentModelToScopeTree(contentModel) {
  const sorted = sortedContentModelValues(contentModel?.items);
  if (sorted.length === 0) {
    throw new Error("Content model has no items \u2014 cannot build treeJson.");
  }
  const formEntry = sorted.find(({ entry }) => entry?.properties?.fieldType === "form") || sorted[0];
  const formRoot = formEntry.entry;
  const props = formRoot.properties || {};
  const rootName = props.name || "guideContainer";
  const rootTitle = props["jcr:title"] || "";
  return {
    id: "$form",
    name: rootName,
    displayName: rootTitle,
    type: "FORM",
    fieldType: "form",
    path: "",
    items: buildContentModelItems(formRoot.items || {}, "$form")
  };
}

// src/scope/ScopeBuilder.js
var ScopeBuilder = class _ScopeBuilder {
  /**
   * Main entry point - transforms form JSON to tree JSON
   * @param {Object} formJson - AEM Forms definition
   * @returns {Object} treeJson structure
   */
  buildTreeFromForm(formJson) {
    const tree = this.transformNode(formJson, {
      parentPath: "",
      parentType: "object",
      isParentRepeatable: false,
      isAncestorRepeatable: false
    }, 0);
    if (formJson.adaptiveform) {
      tree.adaptiveFormVersion = formJson.adaptiveform;
    }
    tree.options = {
      originalId: formJson.id || "",
      schemaRef: formJson.properties?.["fd:schemaRef"] || "",
      schemaType: ""
    };
    return tree;
  }
  /**
   * Transform individual node
   * @param {Object} node - Node to transform
   * @param {Object} context - Transformation context
   * @param {number} index - Index for array items
   * @returns {Object|null} Tree node or null for unnamed leaf nodes
   */
  transformNode(node, context, index = 0) {
    if (!node.fieldType && !_ScopeBuilder.isSiteContainer(node)) {
      return null;
    }
    if (_ScopeBuilder.isSiteContainer(node)) {
      return this.processContainer(context.parentPath, node, context.isAncestorRepeatable);
    }
    const treeNode = _ScopeBuilder.buildTreeNode(node, context.isAncestorRepeatable);
    const isUnnamed = node.name == null || node.name === "";
    treeNode.id = _ScopeBuilder.calculateNodeId(treeNode, context, isUnnamed, index);
    if (_ScopeBuilder.isLeafNode(node)) {
      if (isUnnamed) {
        return null;
      }
      return treeNode;
    }
    const isRepeatable = _ScopeBuilder.isRepeatable(node);
    const newAncestorRepeatable = context.isAncestorRepeatable || isRepeatable;
    treeNode.items = this.processContainer(treeNode.id, node, newAncestorRepeatable);
    treeNode.isFragment = node.properties?.["fd:fragment"] || false;
    return treeNode;
  }
  /**
   * Build tree node structure
   * @param {Object} node - Node to build from
   * @param {boolean} isAncestorRepeatable - Whether ancestor is repeatable
   * @returns {Object} Tree node with metadata
   */
  static buildTreeNode(node, isAncestorRepeatable) {
    const treeNode = {
      id: node.id || node.name || "$form",
      name: node.name || "FORM",
      displayName: node.label?.value || node.name || "FORM",
      type: _ScopeBuilder.mapFieldType(node, isAncestorRepeatable),
      fieldType: node.fieldType,
      path: node.properties?.["fd:path"],
      status: node.properties?.["fd:rules"]?.validationStatus || "none",
      isAncestorRepeatable
    };
    if (Array.isArray(node.enum) && node.enum.length > 0) {
      const names = node.enumNames || node.enum;
      treeNode.options = Object.fromEntries(node.enum.map((k, i) => [k, names[i]]));
    }
    return treeNode;
  }
  /**
   * Calculate node ID based on context
   * @param {Object} treeNode - Tree node being built
   * @param {Object} context - Transformation context
   * @param {boolean} isUnnamed - Whether node is unnamed
   * @param {number} index - Index for array items
   * @returns {string} Calculated node ID
   */
  static calculateNodeId(treeNode, context, isUnnamed, index) {
    const { parentPath, parentType, isParentRepeatable } = context;
    if (parentPath === "") {
      return "$form";
    }
    if (isParentRepeatable && !isUnnamed) {
      return `${parentPath}[getRelativeInstanceIndex(${parentPath})].${_ScopeBuilder.sanitizeFieldName(treeNode.name)}`;
    }
    if (parentType !== "array" && !isUnnamed) {
      return `${parentPath}.${_ScopeBuilder.sanitizeFieldName(treeNode.name)}`;
    }
    if (parentType === "array") {
      return `${parentPath}[${index}]`;
    }
    if (isUnnamed) {
      return parentPath;
    }
    return treeNode.id;
  }
  /**
   * Map fieldType to the legacy pipe-separated type string.
   * Delegates to the standalone mapFieldType utility in fieldTypeUtils.js.
   *
   * @param {Object} node - Form.json node (fieldType + type properties)
   * @param {boolean} isAncestorRepeatable - Whether an ancestor panel is repeatable
   * @returns {string} Legacy type string e.g. "AFCOMPONENT|FIELD|TEXT FIELD|STRING"
   */
  static mapFieldType(node, isAncestorRepeatable) {
    return mapFieldType(node, isAncestorRepeatable);
  }
  /**
   * Check if node is a field (not container)
   * @param {Object} node - Node to check
   * @returns {boolean} True if field node
   */
  static isFieldNode(node) {
    return isFieldNode2(node);
  }
  /**
   * Process container and transform children
   * @param {string} parentPath - Parent node path
   * @param {Object} container - Container node
   * @param {boolean} isAncestorRepeatable - Whether ancestor is repeatable
   * @returns {Array} Array of transformed child nodes
   */
  processContainer(parentPath, container, isAncestorRepeatable) {
    const oldItems = container.items instanceof Array ? container.items : [];
    const cqItems = container[":items"] ? container[":items"] : {};
    const cqItemsOrder = container[":itemsOrder"] ? container[":itemsOrder"] : [];
    const items = oldItems.length > 0 ? oldItems : cqItemsOrder.map((key) => cqItems[key]);
    const isRepeatable = _ScopeBuilder.isRepeatable(container);
    return items.map((item, index) => {
      const context = {
        parentPath,
        parentType: container.type,
        isParentRepeatable: isRepeatable,
        isAncestorRepeatable
      };
      return this.transformNode(item, context, index);
    }).flat().filter((item) => item != null);
  }
  /**
   * Check if node is a site container
   * @param {Object} node - Node to check
   * @returns {boolean} True if site container
   */
  static isSiteContainer(node) {
    return (":items" in node || "items" in node) && !("fieldType" in node);
  }
  /**
   * Check if node is a leaf node
   * @param {Object} node - Node to check
   * @returns {boolean} True if leaf node
   */
  static isLeafNode(node) {
    return node.fieldType && ["panel", "form", "pageset", "pagearea"].indexOf(node.fieldType) === -1;
  }
  /**
   * Check if node is repeatable
   * @param {Object} node - Node to check
   * @returns {boolean} True if repeatable
   */
  static isRepeatable(node) {
    return node.repeatable === true;
  }
  /**
   * Sanitize field name for safe use in expressions
   * @param {string} name - Field name to sanitize
   * @returns {string} Sanitized name
   */
  static sanitizeFieldName(name) {
    const nameRegex = /^[A-Za-z][A-Za-z0-9_]*$/;
    if (!nameRegex.test(name)) {
      return `"${name}"`;
    }
    return name;
  }
  /**
   * Get repeatable index expression
   * @param {string} parentPath - Parent path
   * @returns {string} Index expression
   */
  static getRepeatableIndexExpression(parentPath) {
    return `getRelativeInstanceIndex(${parentPath})`;
  }
  /**
   * Build treeJson directly from a raw JCR JSON export.
   * @param {Object} jcrJson - Raw JCR JSON with formPath and field nodes
   * @returns {Object} treeJson structure
   */
  static fromJCR(jcrJson) {
    const guideContainer = jcrJson?.["jcr:content"]?.guideContainer;
    const formData = guideContainer ? { ...guideContainer, formPath: jcrJson.formPath } : jcrJson;
    const formJson = buildFormJson(formData);
    addPathsToFormJson(formJson, formData.formPath, DEFAULT_INPUT_PATH, "", true);
    return new _ScopeBuilder().buildTreeFromForm(formJson);
  }
  /**
   * Build treeJson from an AEM Sites Content API content model.
   * Use this instead of fromJCR when you have a content model from
   * get-aem-page-content rather than a raw JCR infinity.json export.
   *
   * @param {Object} contentModel - Content model from get-aem-page-content
   * @returns {Object} treeJson compatible with RBScope
   */
  static fromContentModel(contentModel) {
    return contentModelToScopeTree(contentModel);
  }
};

// src/cli/transform-jcr.js
(async () => {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
    process.stdout.write(`${[
      "Usage: transform-jcr <jcr.json> [options]",
      "       transform-jcr --stdin [options]",
      "",
      "Options:",
      "  --stdin   Read JCR JSON from stdin",
      "  --output  Output path for treeJson (default: os.tmpdir()/treeJson.json)",
      "",
      'Output (success): { success: true, treeJson: {...}, outputPath: "..." }',
      'Output (failure): { success: false, error: "..." }',
      "Exit: 0 on success, 1 on failure"
    ].join("\n")}
`);
    process.exit(0);
  }
  let filePath = null;
  let outputPath = (0, import_path.join)((0, import_os.tmpdir)(), "treeJson.json");
  let useStdin = false;
  for (let i = 0; i < rawArgs.length; i += 1) {
    if (rawArgs[i] === "--output") {
      i += 1;
      outputPath = rawArgs[i];
    } else if (rawArgs[i] === "--stdin") {
      useStdin = true;
    } else if (!rawArgs[i].startsWith("--")) {
      filePath = rawArgs[i];
    }
  }
  let raw;
  if (useStdin) {
    raw = await readFile(0);
  } else if (filePath) {
    raw = await readFile(filePath);
  } else {
    throw new Error("Usage: transform-jcr <jcr.json> | --stdin [--output <path>]");
  }
  const treeJson = ScopeBuilder.fromJCR(JSON.parse(raw));
  await writeFile(outputPath, JSON.stringify(treeJson));
  process.stdout.write(`${JSON.stringify({ success: true, treeJson, outputPath })}
`);
  process.exit(0);
})().catch((e) => {
  process.stdout.write(`${JSON.stringify({ success: false, error: e.message })}
`);
  process.exit(1);
});
