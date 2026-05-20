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

// src/parsers/CustomFunctionParser.js
var import_fs2 = require("fs");
var import_vm = require("vm");
var import_url = require("url");
var import_path = require("path");
var __filename = (0, import_url.fileURLToPath)(__import_meta_url__);
var __dirname = (0, import_path.dirname)(__filename);
function loadParser() {
  const parserPath = (0, import_path.join)(__dirname, "vendor/custom-function-parser.js");
  const code = (0, import_fs2.readFileSync)(parserPath, "utf-8");
  const sandbox = { module: { exports: {} }, exports: {} };
  sandbox.module.exports = sandbox.exports;
  sandbox.globalThis = sandbox;
  sandbox.global = sandbox;
  sandbox.self = sandbox;
  const ctx = (0, import_vm.createContext)(sandbox);
  new import_vm.Script(code, { filename: parserPath }).runInContext(ctx);
  return sandbox.module.exports;
}
var parser = loadParser();
function parse(code) {
  return parser.parse(code);
}
function extractStaticImports(code) {
  if (typeof parser.extractStaticImports === "function") {
    return parser.extractStaticImports(code) || [];
  }
  return [];
}

// src/cli/parse-functions.js
(async () => {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${[
      "Usage: parse-functions <functions.js>",
      "       parse-functions --stdin",
      "",
      "Output (success): { success: true, customFunction: [...], imports: [...] }",
      'Output (failure): { success: false, error: "..." }',
      "Exit: 0 on success, 1 on failure"
    ].join("\n")}
`);
    process.exit(0);
  }
  let code;
  if (args.includes("--stdin")) {
    code = await readFile(0);
  } else {
    const filePath = args.find((a) => !a.startsWith("--"));
    if (!filePath) {
      throw new Error("Usage: parse-functions <functions.js> | --stdin");
    }
    code = await readFile(filePath);
  }
  const parsed = parse(code);
  const imports = extractStaticImports(code);
  process.stdout.write(`${JSON.stringify({
    success: true,
    customFunction: parsed.customFunction || [],
    imports: imports || []
  })}
`);
  process.exit(0);
})().catch((e) => {
  process.stdout.write(`${JSON.stringify({ success: false, error: e.message })}
`);
  process.exit(1);
});
