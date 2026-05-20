#!/usr/bin/env node
"use strict";

// get-component-def.js
// Extracts a single component's definition entry from the (already filtered) definition.
// Also pulls the requiredKeys from the matching placementRule allowedInsertion entry.
// Outputs a merged "component profile" that Claude reads to build component properties.
//
// The fields array tells Claude:
//   - name (strip "./" to get property key)
//   - valueType  → string | boolean | number
//   - options    → valid enum values for select fields
//   - required   → whether the field is mandatory
//   - label      → human-readable name for mapping user intent
//   - description → extra context (e.g. "Error message shown when required field is left empty")
//
// requiredKeys (from placementRules) tells Claude which properties MUST be present.

var fs = require("fs");

function parseArgs(argv) {
  var args = argv.slice(2);
  var get = function(flag) {
    var i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  return {
    definitionJson: get("--definition"),
    definitionFile: get("--definition-file"),
    componentType: get("--component-type"),
  };
}

function parseDefinitionFromFile(filePath) {
  var raw = fs.readFileSync(filePath, "utf8");
  var data = JSON.parse(raw);
  var text = data[0].text;
  var marker = "JSON:\n";
  var jsonStart = text.indexOf(marker);
  if (jsonStart === -1) {
    throw new Error("Could not find 'JSON:\\n' marker in definition file");
  }
  return JSON.parse(text.slice(jsonStart + marker.length));
}

function normalize(ct) {
  // Strip /apps/ prefix for comparison
  return ct.replace(/^\/apps\//, "");
}

function findComponentDef(definition, componentType) {
  var target = normalize(componentType);
  var defs = definition.componentDefinitions || [];

  // 1. Exact match (after normalizing /apps/ prefix)
  var match = defs.find(function(d) {
    return normalize(d.componentType || "") === target;
  });

  // 2. Suffix match — handles cases where caller passes a short suffix
  if (!match) {
    match = defs.find(function(d) {
      var ct = normalize(d.componentType || "");
      return ct.endsWith("/" + target) || ct === target;
    });
  }

  return match || null;
}

function findRequiredKeys(definition, componentType) {
  var target = normalize(componentType);
  var rules = definition.placementRules || [];

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    var insertions = (rule.action && rule.action.allowedInsertions) || [];
    for (var j = 0; j < insertions.length; j++) {
      var ins = insertions[j];
      var ref = normalize(ins.componentDefinitionRef || "");
      if (ref === target || ref.endsWith("/" + target)) {
        return {
          requiredKeys: ins.requiredKeys || [],
          mandatoryProperties: ins.mandatoryProperties || {},
          suggestedProperties: ins.suggestedProperties || {},
        };
      }
    }
  }
  return { requiredKeys: [], mandatoryProperties: {}, suggestedProperties: {} };
}

// Strip internal-only fields that aren't real component properties.
// Fields with @TypeHint suffix are JCR type coercion hints — not properties Claude should set.
// Fields with "dorExclusion", "isTitleRichText", "unboundFormElement", "tooltipVisible",
// "hideTitle", "displayValueExpression" are editor-only internal flags.
var INTERNAL_FIELDS = [
  "@TypeHint", "dorExclusion", "isTitleRichText", "unboundFormElement",
  "tooltipVisible", "hideTitle", "displayValueExpression", "fd:viewType",
  "displayPatternType", "validationPatternType", "validatePictureClauseMessage",
  "validateExpMessage", "dorBindRef",
];

function isInternalField(fieldName) {
  return INTERNAL_FIELDS.some(function(pattern) {
    return fieldName.indexOf(pattern) !== -1;
  });
}

function buildProfile(componentDef, placementInfo) {
  // Keep fields that are useful for Claude to read when building properties.
  // Filter out internal/editor-only fields to keep the profile small and clear.
  var usefulFields = (componentDef.fields || []).filter(function(f) {
    return !isInternalField(f.name || "");
  });

  return {
    componentType: componentDef.componentType,
    title: componentDef.title,
    // Fields Claude should use to build properties:
    //   - name (strip "./" to get property key, e.g. "./placeholder" → "placeholder")
    //   - valueType: "string" | "boolean" | "number"
    //   - required: true means MUST be set
    //   - options: valid values for select fields (use options[n].value when setting)
    //   - label: human-readable label for mapping user intent to property
    //   - description: additional context
    //   - default: the default value (set only when user intent implies it)
    fields: usefulFields,
    // requiredKeys from placementRules — these MUST be present in the component object
    requiredKeys: placementInfo.requiredKeys,
    mandatoryProperties: placementInfo.mandatoryProperties,
    suggestedProperties: placementInfo.suggestedProperties,
  };
}

var parsed = parseArgs(process.argv);
var definitionJson = parsed.definitionJson;
var definitionFile = parsed.definitionFile;
var componentType = parsed.componentType;

if ((!definitionJson && !definitionFile) || !componentType) {
  console.error(
    "Usage: node get-component-def.bundle.js (--definition '<json>' | --definition-file <path>) --component-type '<type>'"
  );
  console.error("");
  console.error("  --definition       Slim definition JSON (output of filter-definition)");
  console.error("  --definition-file  Path to MCP tool-result file (raw or filtered)");
  console.error("  --component-type   The componentType to look up");
  console.error("");
  console.error("Example:");
  console.error("  node get-component-def.bundle.js \\");
  console.error("    --definition '$SLIM_DEFINITION' \\");
  console.error("    --component-type 'forms-components-examples/components/form/textinput'");
  process.exit(2);
}

var definition;
try {
  if (definitionFile) {
    definition = parseDefinitionFromFile(definitionFile);
  } else {
    definition = JSON.parse(definitionJson);
  }
} catch (e) {
  console.error("Failed to parse definition: " + e.message);
  process.exit(2);
}

var componentDef = findComponentDef(definition, componentType);
if (!componentDef) {
  console.error("Component definition not found for: " + componentType);
  console.error("Available types:");
  (definition.componentDefinitions || []).forEach(function(d) {
    console.error("  " + d.componentType);
  });
  process.exit(1);
}

var placementInfo = findRequiredKeys(definition, componentType);
var profile = buildProfile(componentDef, placementInfo);

console.log(JSON.stringify(profile, null, 2));
process.exitCode = 0;
