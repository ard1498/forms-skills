#!/usr/bin/env node
/**
 * Transform form definition JSON to treeJson
 *
 * Usage:
 *   node transform-form.js <form-definition.json>
 *   node transform-form.js --stdin (read from stdin)
 *
 * Output:
 *   JSON object with the transformed treeJson structure to stdout
 *
 * The treeJson structure is used for component lookup when generating rules.
 * Each component has: id, name, displayName, type, fieldType, path, etc.
 *
 * Supports both JCR format (from AEM) and CRISPR/CoreComponent format.
 * JCR format is automatically detected and converted to CRISPR before transformation.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load globals first
require("../setup/globals");

// Load the ExpressionEditorTree
require("../setup/loader").loadExpressionEditorTree();

/**
 * Check if the form JSON is in JCR format (has JCR/Sling properties)
 * @param {object} formJson - The form JSON to check
 * @returns {boolean} True if JCR format
 */
function isJcrFormat(formJson) {
  return (
    formJson["jcr:primaryType"] !== undefined ||
    formJson["sling:resourceType"] !== undefined
  );
}

/**
 * Get the Python executable path
 * Checks multiple locations to find Python with formsgenailib installed
 * @returns {string} Python executable path
 */
function getPythonPath() {
  const candidates = [];

  // Check for plugin's own scripts/python3 (handles venv bootstrap)
  const pluginRoot = path.resolve(__dirname, "../../../../");
  const pluginPython = path.join(pluginRoot, "scripts", "python3");
  if (fs.existsSync(pluginPython)) {
    candidates.push(pluginPython);
  }

  // Check for .venv at project root (one level above plugin root)
  const projectRoot = path.resolve(pluginRoot, "..");
  candidates.push(path.join(projectRoot, ".venv", "bin", "python"));

  // Check for active virtualenv
  if (process.env.VIRTUAL_ENV) {
    candidates.push(path.join(process.env.VIRTUAL_ENV, "bin", "python"));
  }

  // Try each candidate — just check it exists and runs
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to system python3
  return "python3";
}

/**
 * Find the workspace root by walking up from a directory until we find either:
 * 1. A directory containing "repo/"
 * 2. A directory named "repo" (then return its parent)
 * @param {string} startDir - Directory to start walking from
 * @returns {string|null} Workspace root path or null if not found
 */
function findWorkspaceRoot(startDir) {
  let current = startDir;
  for (let i = 0; i < 16; i += 1) {
    if (fs.existsSync(path.join(current, "repo"))) {
      return current;
    }
    if (path.basename(current) === "repo") {
      return path.dirname(current);
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

/**
 * Convert JCR form JSON to CRISPR format using Python script
 * @param {object} jcrJson - The JCR form JSON
 * @param {string|null} workspaceRoot - Workspace root for fragment resolution
 * @returns {object} The CRISPR form JSON
 */
function convertJcrToCrispr(jcrJson, workspaceRoot) {
  const scriptPath = path.join(__dirname, "jcr-to-crispr.py");
  const pythonPath = getPythonPath();
  const baseDirArg = workspaceRoot
    ? ` --base-dir "${workspaceRoot.replace(/"/g, '\\"')}"`
    : "";

  try {
    // Run Python script with JSON input via stdin
    const result = execSync(
      `"${pythonPath}" "${scriptPath}" --stdin${baseDirArg}`,
      {
      input: JSON.stringify(jcrJson),
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large forms
      },
    );

    const parsed = JSON.parse(result);

    if (!parsed.success) {
      throw new Error(parsed.error || "Unknown conversion error");
    }

    return parsed.crispr;
  } catch (e) {
    if (e.stdout) {
      try {
        const parsed = JSON.parse(e.stdout);
        if (parsed.success) {
          return parsed.crispr;
        }
      } catch (parseErr) {
        // Ignore parse error, use original error
      }
    }
    throw new Error(`JCR to CRISPR conversion failed: ${e.message}`);
  }
}

/**
 * Transform form JSON to treeJson
 * @param {object} formJson - The form definition JSON (JCR or CRISPR format)
 * @param {string|null} workspaceRoot - Workspace root for fragment resolution
 * @returns {{treeJson: object, converted: boolean}} The transformed treeJson and conversion flag
 */
function transformFormJson(formJson, workspaceRoot) {
  if (!af.expeditor.author.ExpressionEditorTree) {
    throw new Error(
      "ExpressionEditorTree not loaded. Check that the JS file exists.",
    );
  }

  let inputJson = formJson;
  let converted = false;

  // Detect fragment from original JCR before conversion (fd:type is lost during conversion)
  const isFragment = formJson["fd:type"] === "fragment";

  // Auto-detect and convert JCR format to CRISPR
  if (isJcrFormat(formJson)) {
    inputJson = convertJcrToCrispr(formJson, workspaceRoot || null);
    converted = true;
  }

  const treeJson =
    af.expeditor.author.ExpressionEditorTree.transformJson(inputJson);

  // Set isFragment flag on treeJson if detected from original JCR
  // This is needed because fd:type is lost during JCR->CRISPR conversion
  // SimpleContext.js uses this to set $form name/displayName to 'FRAGMENT'
  if (isFragment) {
    treeJson.isFragment = true;
  }

  return { treeJson, converted };
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node transform-form.js <form-definition.json>");
    console.error("       node transform-form.js --stdin");
    process.exit(1);
  }

  let formJson;
  let workspaceRoot = process.env.FORMS_WORKSPACE || null;

  if (args[0] === "--stdin") {
    // Read from stdin
    let input = "";
    const stdin = fs.readFileSync(0, "utf-8");
    try {
      formJson = JSON.parse(stdin);
    } catch (e) {
      console.error(
        JSON.stringify({
          success: false,
          error: "Invalid JSON input: " + e.message,
        }),
      );
      process.exit(1);
    }
    workspaceRoot = workspaceRoot || findWorkspaceRoot(process.cwd());
  } else {
    // Read from file
    const filePath = path.resolve(args[0]);
    if (!fs.existsSync(filePath)) {
      console.error(
        JSON.stringify({
          success: false,
          error: "File not found: " + filePath,
        }),
      );
      process.exit(1);
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      formJson = JSON.parse(content);
    } catch (e) {
      console.error(
        JSON.stringify({
          success: false,
          error: "Error reading/parsing file: " + e.message,
        }),
      );
      process.exit(1);
    }
    workspaceRoot = workspaceRoot || findWorkspaceRoot(path.dirname(filePath));
  }

  // Transform the form JSON
  try {
    const { treeJson, converted } = transformFormJson(formJson, workspaceRoot);

    console.log(
      JSON.stringify(
        {
          success: true,
          treeJson: treeJson,
          jcrConverted: converted,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error(
      JSON.stringify({
        success: false,
        error: "Transform error: " + e.message,
        stack: e.stack,
      }),
    );
    process.exit(1);
  }
}

main();
