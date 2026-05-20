#!/usr/bin/env node
"use strict";

// resolve-component-type.js
// Resolves the exact AEM componentType from a fieldType value by scanning componentDefinitions.
//
// Why this exists:
//   Hard-coding componentType suffixes in field-types.md is fragile — the definition is the
//   authoritative source. Each componentDefinition has a "./fieldType" field whose options list
//   the fieldType value it supports. Multiple componentTypes can share the same fieldType
//   (e.g. "button" → submit/reset/generic; "checkbox" → checkbox/switch).
//
// Selection rules (applied in order):
//   1. Exact hint match  — if --hint is given, pick the componentType whose path contains the hint
//   2. Prefix preference — prefer "forms-components-examples/components/" over other prefixes
//   3. First match       — if still ambiguous, pick the first alphabetically sorted match
//
// Output: { componentType, normalized } where normalized has the /apps/ prefix stripped.
// Exit 0 = resolved, Exit 1 = not found / ambiguous after rules, Exit 2 = bad args.

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
    fieldType: get("--field-type"),
    hint: get("--hint"),
  };
}

function parseDefinition(definitionFile, definitionJson) {
  if (definitionFile) {
    var raw = fs.readFileSync(definitionFile, "utf8").trim();
    var data = JSON.parse(raw);
    if (Array.isArray(data)) {
      // MCP tool-result wrapper: [{type: "text", text: "...JSON:\n{...}"}]
      var text = data[0].text;
      var marker = "JSON:\n";
      var jsonStart = text.indexOf(marker);
      if (jsonStart === -1) throw new Error("Could not find 'JSON:\\n' marker in definition file");
      return JSON.parse(text.slice(jsonStart + marker.length));
    } else {
      // Raw definition JSON object — pass through directly
      return data;
    }
  }
  return JSON.parse(definitionJson);
}

function normalize(ct) {
  return ct.replace(/^\/apps\//, "");
}

// Preferred prefix — project-level canonical component group.
// All components in this group are consistently versioned and tested together.
var PREFERRED_PREFIX = "forms-components-examples/components/";

function resolveComponentType(definition, fieldType, hint) {
  var defs = definition.componentDefinitions || [];

  // Find all componentDefs whose ./fieldType options includes the requested fieldType value
  var candidates = defs.filter(function(cd) {
    var fields = cd.fields || [];
    var ftField = fields.find(function(f) { return f.name === "./fieldType"; });
    if (!ftField) return false;
    var options = ftField.options || [];
    return options.some(function(o) { return o.value === fieldType; });
  });

  if (candidates.length === 0) {
    return { resolved: false, error: "No componentDefinition found with fieldType: " + fieldType };
  }

  var selected;

  if (candidates.length === 1) {
    selected = candidates[0];
  } else {
    // Rule 1: hint match — pick componentType whose normalized path contains the hint substring
    if (hint) {
      var hintLower = hint.toLowerCase();
      var hintMatch = candidates.find(function(cd) {
        return normalize(cd.componentType || "").toLowerCase().indexOf(hintLower) !== -1;
      });
      if (hintMatch) {
        selected = hintMatch;
      }
    }

    // Rule 2: prefix preference
    if (!selected) {
      var preferred = candidates.filter(function(cd) {
        return normalize(cd.componentType || "").startsWith(PREFERRED_PREFIX);
      });
      if (preferred.length === 1) {
        selected = preferred[0];
      } else if (preferred.length > 1) {
        // Still ambiguous within preferred prefix — apply hint again if provided
        if (hint) {
          var hintLower2 = hint.toLowerCase();
          var hintInPreferred = preferred.find(function(cd) {
            return normalize(cd.componentType || "").toLowerCase().indexOf(hintLower2) !== -1;
          });
          if (hintInPreferred) selected = hintInPreferred;
        }
        // Rule 3: first alphabetically within preferred
        if (!selected) {
          preferred.sort(function(a, b) {
            return (a.componentType || "").localeCompare(b.componentType || "");
          });
          selected = preferred[0];
        }
      }
    }

    // Rule 3: fallback — first alphabetically across all candidates
    if (!selected) {
      candidates.sort(function(a, b) {
        return (a.componentType || "").localeCompare(b.componentType || "");
      });
      selected = candidates[0];
    }
  }

  var raw = selected.componentType;
  return {
    resolved: true,
    componentType: raw,
    normalized: normalize(raw),
    allCandidates: candidates.map(function(cd) { return normalize(cd.componentType || ""); }),
    selectionRule: candidates.length === 1
      ? "single-match"
      : hint && normalize(raw).toLowerCase().indexOf(hint.toLowerCase()) !== -1
        ? "hint-match"
        : normalize(raw).startsWith(PREFERRED_PREFIX)
          ? "prefix-preference"
          : "first-alphabetical",
  };
}

var parsed = parseArgs(process.argv);

if ((!parsed.definitionFile && !parsed.definitionJson) || !parsed.fieldType) {
  console.error(
    "Usage: node resolve-component-type.bundle.js (--definition-file <path> | --definition '<json>') --field-type <value> [--hint <substring>]"
  );
  console.error("");
  console.error("  --definition-file  Path to MCP tool-result file (raw or filtered)");
  console.error("  --definition       Inline definition JSON");
  console.error("  --field-type       The AEM fieldType value (e.g. text-input, button, tel)");
  console.error("  --hint             Disambiguation substring for ambiguous fieldTypes");
  console.error("                     button fieldType:    submit | reset | button");
  console.error("                     checkbox fieldType:  switch | checkbox");
  console.error("                     plain-text fieldType: title | text");
  console.error("                     file-input fieldType: (no hint needed — prefix rule applies)");
  console.error("");
  console.error("Example:");
  console.error("  node resolve-component-type.bundle.js \\");
  console.error("    --definition-file /path/to/definition.txt \\");
  console.error("    --field-type button --hint submit");
  process.exit(2);
}

var definition;
try {
  definition = parseDefinition(parsed.definitionFile, parsed.definitionJson);
} catch (e) {
  console.error("Failed to parse definition: " + e.message);
  process.exit(2);
}

var result = resolveComponentType(definition, parsed.fieldType, parsed.hint);

if (!result.resolved) {
  console.error(result.error);
  console.error("Available fieldTypes in definition:");
  var allFt = {};
  (definition.componentDefinitions || []).forEach(function(cd) {
    var ftField = (cd.fields || []).find(function(f) { return f.name === "./fieldType"; });
    if (ftField) {
      (ftField.options || []).forEach(function(o) { allFt[o.value] = true; });
    }
  });
  Object.keys(allFt).sort().forEach(function(ft) { console.error("  " + ft); });
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
process.exitCode = 0;
