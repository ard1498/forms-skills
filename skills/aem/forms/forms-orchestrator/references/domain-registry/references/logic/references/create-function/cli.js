#!/usr/bin/env node
import fs from "node:fs";
import { validateCustomFunctionFile } from "./validator.js";

function parseArgs(argv) {
  const args = { file: null, qualifiedNames: null, format: "text" };
  const list = argv.slice(2);
  args.file = list[0];
  for (let i = 1; i < list.length; i++) {
    if (list[i] === "--qualified-names") args.qualifiedNames = list[++i];
    if (list[i] === "--format") args.format = list[++i];
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.file || !args.qualifiedNames) {
  console.error("usage: node cli.js <file> --qualified-names <path> [--format text|json]");
  process.exit(2);
}
const qualifiedNames = JSON.parse(fs.readFileSync(args.qualifiedNames, "utf8"));
const result = await validateCustomFunctionFile(args.file, { qualifiedNames });
if (args.format === "json") {
  console.log(JSON.stringify(result, null, 2));
} else {
  if (result.errors.length === 0) {
    console.log("OK");
  } else {
    for (const e of result.errors) {
      console.log(`${e.code}: ${e.message} (${e.line}:${e.column})`);
    }
  }
}
process.exit(result.errors.length === 0 ? 0 : 1);
