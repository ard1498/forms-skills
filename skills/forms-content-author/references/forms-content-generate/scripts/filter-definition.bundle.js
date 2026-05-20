#!/usr/bin/env node
"use strict";

// filter-definition.js
// Slims the AEM page content definition down to only the component types needed.
// Accepts the raw MCP tool-result file (too large to inline) or an inline JSON string.
// Keeps ALL placementRules (only ~4 entries, not the size bottleneck).
// componentDefinitions can have 50+ entries with large field arrays — only requested types are kept.

var fs = require("fs");

function parseArgs(argv) {
  var args = argv.slice(2);
  var get = function(flag) {
    var i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  return {
    definitionFile: get("--definition-file"),
    definitionJson: get("--definition"),
    componentTypes: get("--component-types"),
  };
}

function parseDefinitionFromFile(filePath) {
  var raw = fs.readFileSync(filePath, "utf8").trim();
  var data = JSON.parse(raw);
  if (Array.isArray(data)) {
    // MCP tool-result wrapper: [{type: "text", text: "...JSON:\n{...}"}]
    var text = data[0].text;
    var marker = "JSON:\n";
    var jsonStart = text.indexOf(marker);
    if (jsonStart === -1) {
      throw new Error("Could not find 'JSON:\\n' marker in definition file — unexpected file format");
    }
    return JSON.parse(text.slice(jsonStart + marker.length));
  } else {
    // Raw definition JSON object — pass through directly
    return data;
  }
}

function filterDefinition(definition, componentTypesStr) {
  var types = componentTypesStr.split(",").map(function(t) { return t.trim(); });

  // Match componentType by exact match or by stripping the /apps/ prefix
  var filtered = (definition.componentDefinitions || []).filter(function(cd) {
    var ct = cd.componentType || "";
    return types.some(function(t) {
      // Exact match
      if (ct === t) return true;
      // /apps/<t>
      if (ct === "/apps/" + t) return true;
      // suffix match — catches both /apps/foo/bar and foo/bar
      if (ct.endsWith("/" + t) || ct.endsWith(t)) return true;
      return false;
    });
  });

  return {
    componentDefinitions: filtered,
    placementRules: definition.placementRules || [],
  };
}

var parsed = parseArgs(process.argv);
var definitionFile = parsed.definitionFile;
var definitionJson = parsed.definitionJson;
var componentTypes = parsed.componentTypes;

if ((!definitionFile && !definitionJson) || !componentTypes) {
  console.error(
    "Usage: node filter-definition.bundle.js (--definition-file <path> | --definition '<json>') --component-types '<ct1,ct2,...>'"
  );
  console.error("");
  console.error("  --definition-file   Path to MCP tool-result file saved when definition exceeds token limit");
  console.error("  --definition        Inline definition JSON (use when definition fit in context)");
  console.error("  --component-types   Comma-separated list of componentType suffixes to keep");
  console.error("");
  console.error("Example:");
  console.error("  node filter-definition.bundle.js \\");
  console.error("    --definition-file /path/to/tool-results/mcp-...-definition.txt \\");
  console.error("    --component-types 'forms-components-examples/components/form/textinput,forms-components-examples/components/form/actions/submit'");
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

var result = filterDefinition(definition, componentTypes);

if (result.componentDefinitions.length === 0) {
  console.error(
    "Warning: no componentDefinitions matched the requested types. Check the --component-types values."
  );
  console.error("Requested: " + componentTypes);
  // Still output the result (empty defs + placement rules) — caller can decide what to do
}

console.log(JSON.stringify(result, null, 2));
process.exitCode = 0;
