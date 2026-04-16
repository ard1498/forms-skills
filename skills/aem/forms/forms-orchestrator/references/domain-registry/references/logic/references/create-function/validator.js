import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";
import * as walk from "acorn-walk";
import { parse as parseComments } from "comment-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadJson(relPath) {
  const fullPath = path.join(__dirname, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

const SCOPE_FUNCTIONS = loadJson("./definitions/scope-functions.json");
const TYPES = loadJson("./definitions/types.json");

/**
 * Diagnostic codes emitted by the validator.
 *
 * Syntax / parse
 *   SYNTAX_ERROR               — The source is not valid JavaScript.
 *
 * Export / function structure
 *   EXPORT_NO_FUNCTION         — A name in `export { name }` has no matching
 *                                function declaration in the same file.
 *                                Re-exported imports are not supported as
 *                                declared functions (by design — the AEM parser
 *                                only supports `function f(){}; export { f }`).
 *
 * JSDoc / scope parameter
 *   SCOPE_PARAM_MISSING        — The exported function has no JSDoc, or the
 *                                JSDoc has no `@param {scope}` tag.
 *   SCOPE_PARAM_LAST           — The `@param {scope}` parameter is not the
 *                                last argument in the function signature.
 *
 * Qualified name resolution
 *   QUALIFIED_NAME_INVALID_ROOT — The path root after the scope identifier is
 *                                 not `form` or `fragment`
 *                                 (e.g. `globals.other.field` is invalid).
 *   QUALIFIED_NAME_UNKNOWN      — The path does not match any key in the
 *                                 caller-provided `qualifiedNames` map.
 *   QUALIFIED_NAME_MISSING_TYPE — A matching key exists in `qualifiedNames`
 *                                 but has no `type` field.
 *
 * Property access
 *   TYPE_UNKNOWN               — The resolved field's `type` is not in
 *                                `definitions/types.json#supportedFieldTypes`.
 *   PROPERTY_INVALID           — The accessed property (e.g. `.$fooBar`) is
 *                                not in the allowed set for the resolved type.
 *   CUSTOM_PROPERTY_INVALID    — A `.$properties.*` access path is deeper than
 *                                any path declared in `customProperties` for
 *                                that qualified name.
 *
 * Scope function calls (`globals.functions.*`)
 *   FUNCTION_UNKNOWN           — The called function name is not in
 *                                `definitions/scope-functions.json`.
 *   ARG_COUNT_INVALID          — Wrong number of arguments for the function.
 *   ARG_MISSING                — A required argument is absent.
 *   ARG_TYPE_INVALID           — An argument has the wrong kind
 *                                (e.g. a string where a qualifiedName is expected).
 *   ARG_ORDER_INVALID          — A qualifiedName and object argument are swapped
 *                                (specific variant of ARG_TYPE_INVALID for setProperty-style calls).
 */

/**
 * Create a diagnostic object.
 *
 * @param {string} code     - One of the DIAGNOSTIC CODES listed above.
 * @param {string} message  - Human-readable description of the problem.
 * @param {object|null} node - Acorn AST node used to extract source location.
 *                             Pass `null` or omit to default to line 1, column 1.
 * @param {"error"|"warning"} [severity="error"] - Severity level.
 * @returns {{ code: string, message: string, severity: string, file: string|null,
 *             line: number, column: number, suggestion: string|null }}
 */
function diag(code, message, node, severity = "error") {
  const loc = node?.loc?.start || { line: 1, column: 0 };
  return { code, message, severity, file: null, line: loc.line, column: loc.column + 1, suggestion: null };
}

function parseJs(source) {
  return parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true, onComment: [] });
}

function findExports(ast) {
  const exported = new Set();
  walk.simple(ast, {
    ExportNamedDeclaration(node) {
      if (node.declaration == null && node.specifiers) {
        for (const s of node.specifiers) {
          if (s.exported?.name) exported.add(s.exported.name);
        }
      }
    }
  });
  return exported;
}

function findFunctionDecl(ast, name) {
  let found = null;
  walk.simple(ast, {
    FunctionDeclaration(node) {
      if (node.id?.name === name) found = node;
    }
  });
  return found;
}

function findLeadingJSDoc(source, node) {
  const before = source.slice(0, node.start);
  const match = before.match(/\/\*\*[\s\S]*?\*\/\s*$/);
  if (!match) return null;
  return match[0];
}

function getScopeParamFromJSDoc(jsdoc) {
  if (!jsdoc) return { name: null, error: "Missing JSDoc" };
  const parsed = parseComments(jsdoc)[0];
  const scopeTag = parsed?.tags?.find(t => t.tag === "param" && t.type === "scope");
  if (!scopeTag) return { name: null, error: "Missing @param {scope}" };
  return { name: scopeTag.name };
}

function validateScopeParam(fnNode, scopeName, errors) {
  if (!scopeName) return;
  const params = fnNode.params;
  const last = params[params.length - 1];
  if (!last || last.type !== "Identifier" || last.name !== scopeName) {
    errors.push(diag("SCOPE_PARAM_LAST", "scope parameter must be last", fnNode));
  }
}

function memberExprToPath(node) {
  if (node.type === "ChainExpression") node = node.expression;
  const parts = [];
  let curr = node;
  while (curr) {
    if (curr.type === "ChainExpression") { curr = curr.expression; continue; }
    if (curr.type !== "MemberExpression") break;
    if (curr.computed) return null;
    if (curr.property.type !== "Identifier") return null;
    parts.unshift(curr.property.name);
    curr = curr.object;
  }
  if (curr && curr.type === "Identifier") {
    parts.unshift(curr.name);
    return parts;
  }
  return null;
}

const VALID_ROOTS = new Set(["form", "fragment"]);
const SKIP_ROOTS = new Set(["functions", "field"]);

function resolveQualifiedName(parts, qualifiedNames) {
  const pathParts = parts.slice(1);
  const root = pathParts[0];
  if (!root) return { invalidRoot: root };
  // Skip scope function paths — these are not qualified name accesses
  if (SKIP_ROOTS.has(root)) return { skip: true };
  if (!VALID_ROOTS.has(root)) return { invalidRoot: root };
  // prepend $ to map globals.form.x → $form.x key
  const normalizedParts = [`$${root}`, ...pathParts.slice(1)];
  for (let i = normalizedParts.length; i >= 1; i--) {
    const candidate = normalizedParts.slice(0, i).join(".");
    if (qualifiedNames[candidate]) {
      return { key: candidate, rest: normalizedParts.slice(i) };
    }
  }
  return null;
}

function isCustomPropertyPath(restSegments, customProperties) {
  if (restSegments.length === 0) return false;
  if (restSegments[0] !== "$properties") return false;
  // Accessing just $properties (the bag itself) is valid
  if (restSegments.length === 1) return true;
  // If no customProperties declared, treat $properties as an open bag — any key is valid
  if (customProperties.length === 0) return true;
  const subPath = restSegments.slice(1).join(".");
  for (const cp of customProperties) {
    // Exact match: $properties.a.b when "a.b" is declared
    if (cp === subPath) return true;
    // Ancestor access: $properties.a when "a.b" is declared (intermediate object)
    if (cp.startsWith(subPath + ".")) return true;
    // Deeper-than-declared paths (e.g. $properties.a.b.c when only "a.b" declared) are NOT valid
  }
  return false;
}

function buildAliasMap(fnNode, scopeParamName) {
  const aliasMap = new Map();
  walk.simple(fnNode, {
    VariableDeclaration(node) {
      // Only track const — let/var can be reassigned, making alias resolution unreliable
      if (node.kind !== "const") return;
      for (const decl of node.declarations) {
        if (decl.id?.type !== "Identifier") continue;
        if (!decl.init) continue;
        const p = memberExprToPath(decl.init);
        if (!p || p[0] !== scopeParamName) continue;
        aliasMap.set(decl.id.name, p);
      }
    }
  });
  return aliasMap;
}

function resolvePathWithAliases(parts, aliasMap) {
  const rootAlias = aliasMap.get(parts[0]);
  if (rootAlias) return [...rootAlias, ...parts.slice(1)];
  return parts;
}

function classifyArg(node, aliasMap) {
  if (!node) return "unknown";
  if (node.type === "Literal") return typeof node.value;
  if (node.type === "ObjectExpression") return "object";
  if (node.type === "Identifier") {
    // Resolve alias: `const field = globals.form.x; setProperty(field, ...)` → qualifiedName
    if (aliasMap?.has(node.name)) return "qualifiedName";
    return "identifier";
  }
  if (node.type === "MemberExpression" || node.type === "ChainExpression") return "qualifiedName";
  return "unknown";
}

function validateCall(node, scopeFunctions, qualifiedNames, customValidators, errors, aliasMap) {
  if (node.callee.type !== "MemberExpression") return;
  const parts = memberExprToPath(node.callee);
  if (!parts) return;
  if (parts.length !== 3 || parts[1] !== "functions") return;
  const fnName = parts[2];

  const def = scopeFunctions[fnName];
  if (!def || typeof def !== "object" || !def.args) {
    errors.push(diag("FUNCTION_UNKNOWN", `unknown function ${fnName}`, node));
    return;
  }

  const args = node.arguments || [];
  const minArgs = def.args.filter(a => a.required).length;
  const maxArgs = def.args.length;
  if (args.length < minArgs || args.length > maxArgs) {
    errors.push(diag("ARG_COUNT_INVALID", `invalid arg count for ${fnName}: expected ${minArgs}-${maxArgs}, got ${args.length}`, node));
    return;
  }

  def.args.forEach((spec, i) => {
    const arg = args[i];
    if (!arg && spec.required) {
      errors.push(diag("ARG_MISSING", `missing required arg '${spec.name}' for ${fnName}`, node));
      return;
    }
    if (!arg) return;
    const kind = classifyArg(arg, aliasMap);
    if (!spec.kind.includes(kind) && !spec.kind.includes("any")) {
      // Identifiers that remain unresolved after alias lookup cannot be statically classified —
      // they may be function parameters or aliases from computed access (e.g. arr[i].field).
      // Skip rather than emit false positives for qualifiedName or object args.
      if (kind === "identifier") return;
      // Use ARG_ORDER_INVALID when a qualifiedName arg is in an object position or vice versa
      const code = (spec.kind.includes("qualifiedName") && kind === "object") ||
                   (spec.kind.includes("object") && kind === "qualifiedName")
                   ? "ARG_ORDER_INVALID" : "ARG_TYPE_INVALID";
      errors.push(diag(code, `arg '${spec.name}' must be ${spec.kind.join("|")}, got ${kind}`, arg));
    }
  });

  // Run custom validators
  if (customValidators?.[fnName]) {
    const mappedArgs = args.map((arg, i) => ({
      index: i,
      node: arg,
      kind: classifyArg(arg),
      value: arg.type === "ObjectExpression"
        ? Object.fromEntries(arg.properties.filter(p => p.key && p.value).map(p => [p.key.name, p.value.value]))
        : undefined
    }));
    const customErrors = customValidators[fnName](mappedArgs, { qualifiedNames, types: TYPES });
    errors.push(...(customErrors || []));
  }
}

/**
 * Validate a custom function JavaScript source string.
 *
 * @param {string} source - The full source text of the custom function JS file.
 * @param {object} options
 * @param {object} options.qualifiedNames
 *   **Required.** Map of qualified name keys to their metadata. Keys use the
 *   `$`-prefixed format (`"$form"`, `"$form.panel1.field1"`, `"$fragment.field1"`).
 *   Each value has the shape `{ type: string, customProperties: string[] }`.
 *   Throws if not provided.
 * @param {boolean} [options.requireScopeParam=false]
 *   When `false` (default), functions without a `@param {scope}` JSDoc tag are
 *   valid. Set to `true` to enforce that every exported function must declare a
 *   scope param — useful for projects that require all functions to interact
 *   with the form model.
 * @param {object} [options.customValidators]
 *   Optional map of per-function custom validators keyed by OOTB function name
 *   (e.g. `"setProperty"`). Each validator receives `(args, ctx)` where `args`
 *   is the analyzed argument list and `ctx` contains `{ qualifiedNames, types }`.
 *   Must return an array of diagnostic objects (or `[]`).
 *
 * @returns {{ valid: boolean, errors: object[], warnings: object[], metadata: object }}
 *   - `valid`    — `true` when `errors` is empty.
 *   - `errors`   — Array of diagnostic objects (see `diag()` for the shape).
 *   - `warnings` — Array of diagnostic objects with `severity: "warning"`.
 *   - `metadata` — `{ scopeFunctions, types }` — the loaded definition objects,
 *                  useful for tooling that needs to inspect the bundled catalogs.
 *
 * @throws {Error} If `options.qualifiedNames` is not provided.
 */
export function validateCustomFunctionSource(source, options = {}) {
  if (!options.qualifiedNames) throw new Error("qualifiedNames is required");
  const errors = [];
  const warnings = [];
  let ast;
  try {
    ast = parseJs(source);
  } catch (e) {
    return { valid: false, errors: [diag("SYNTAX_ERROR", e.message, e.loc ? { loc: e.loc } : null)], warnings, metadata: {} };
  }

  const commonProps = new Set(TYPES.runtime.commonExposedProperties || []);
  const modifiableCommon = new Set(TYPES.runtime.ruleModifiableCommon || []);

  function validateMemberExpr(node, scopeName, aliasMap) {
    if (node.computed) return;
    const rawParts = memberExprToPath(node);
    if (!rawParts) return;
    if (rawParts[0] !== scopeName && !aliasMap.has(rawParts[0])) return;

    const parts = resolvePathWithAliases(rawParts, aliasMap);
    if (parts[0] !== scopeName) return;

    const resolved = resolveQualifiedName(parts, options.qualifiedNames);
    if (!resolved) {
      errors.push(diag("QUALIFIED_NAME_UNKNOWN", `unknown qualified name: ${parts.slice(1).join(".")}`, node));
      return;
    }
    if (resolved.skip) return;
    if (resolved.invalidRoot) {
      errors.push(diag("QUALIFIED_NAME_INVALID_ROOT", `invalid root '${resolved.invalidRoot}': must be 'form' or 'fragment'`, node));
      return;
    }
    const meta = options.qualifiedNames[resolved.key];
    if (!meta?.type) {
      errors.push(diag("QUALIFIED_NAME_MISSING_TYPE", `qualified name missing type: ${resolved.key}`, node));
      return;
    }
    if (resolved.rest.length === 0) return;
    const prop = resolved.rest[0];
    if (prop === "$properties") {
      if (!isCustomPropertyPath(resolved.rest, meta.customProperties || [])) {
        errors.push(diag("CUSTOM_PROPERTY_INVALID", `invalid custom property path: ${resolved.rest.join(".")}`, node));
      }
      return;
    }
    const typeKey = TYPES.runtime.typeAliases?.[meta.type] || meta.type;
    if (!TYPES.supportedFieldTypes.includes(meta.type) && meta.type !== "form" && meta.type !== "panel") {
      errors.push(diag("TYPE_UNKNOWN", `unknown type: ${meta.type}`, node));
      return;
    }
    const typeSpecificExposed = new Set(TYPES.runtime.typeSpecificExposedProperties?.[typeKey] || []);
    const typeSpecificModifiable = new Set(TYPES.runtime.ruleModifiableByType?.[typeKey] || []);
    const allowed = new Set([...commonProps, ...modifiableCommon, ...typeSpecificExposed, ...typeSpecificModifiable]);
    if (!allowed.has(prop)) {
      // For container types, a non-property segment might be a child QN reference — report as unknown QN
      const isContainer = meta.type === "form" || meta.type === "panel";
      if (isContainer && !prop.startsWith("$")) {
        const childKey = `${resolved.key}.${prop}`;
        if (!options.qualifiedNames[childKey]) {
          errors.push(diag("QUALIFIED_NAME_UNKNOWN", `unknown qualified name: ${resolved.key.replace(/^\$/, "")}.${prop}`, node));
          return;
        }
      } else {
        errors.push(diag("PROPERTY_INVALID", `property '${prop}' not valid for type '${meta.type}'`, node));
      }
    }
  }

  const exported = findExports(ast);
  for (const name of exported) {
    const fn = findFunctionDecl(ast, name);
    if (!fn) {
      errors.push(diag("EXPORT_NO_FUNCTION", `exported function ${name} not found`, ast));
      continue;
    }
    const jsdoc = findLeadingJSDoc(source, fn);
    const { name: scopeName, error } = getScopeParamFromJSDoc(jsdoc);
    if (error) {
      // requireScopeParam defaults to false — functions without @param {scope} are valid.
      // Set to true to enforce that every exported function must declare a scope param.
      if (options.requireScopeParam === true) {
        errors.push(diag("SCOPE_PARAM_MISSING", error, fn));
      }
    } else {
      validateScopeParam(fn, scopeName, errors);
    }
  }

  // Second pass: validate member expressions and function calls per exported function
  for (const name of exported) {
    const fn = findFunctionDecl(ast, name);
    if (!fn) continue;
    const jsdoc = findLeadingJSDoc(source, fn);
    const { name: scopeName } = getScopeParamFromJSDoc(jsdoc);

    // If no @param {scope} declared, infer scope identifier from the last function parameter.
    // This ensures globals.form.* accesses are still validated even when the developer forgot
    // to annotate the scope param — a util function with no such accesses will simply produce
    // no matches and pass through cleanly.
    const lastParam = fn.params[fn.params.length - 1];
    const effectiveScopeName = scopeName ?? (lastParam?.type === "Identifier" ? lastParam.name : null);
    if (!effectiveScopeName) continue;

    const aliasMap = buildAliasMap(fn, effectiveScopeName);
    walk.simple(fn, {
      MemberExpression(node) { validateMemberExpr(node, effectiveScopeName, aliasMap); },
      ChainExpression(node) {
        if (node.expression?.type === "MemberExpression") {
          validateMemberExpr(node.expression, effectiveScopeName, aliasMap);
        }
      },
      CallExpression(node) {
        validateCall(node, SCOPE_FUNCTIONS, options.qualifiedNames, options.customValidators, errors, aliasMap);
      }
    });
  }

  return { valid: errors.length === 0, errors, warnings, metadata: { scopeFunctions: SCOPE_FUNCTIONS, types: TYPES } };
}

/**
 * Validate a custom function JavaScript file on disk.
 *
 * Reads the file at `filePath`, delegates to `validateCustomFunctionSource`,
 * and attaches `filePath` to every diagnostic so consumers know which file
 * each error came from.
 *
 * @param {string} filePath - Absolute or relative path to the `.js` file.
 * @param {object} options  - Same options as `validateCustomFunctionSource`.
 * @returns {Promise<{ valid: boolean, errors: object[], warnings: object[], metadata: object }>}
 *   Same shape as `validateCustomFunctionSource` but with `file` populated on
 *   every diagnostic.
 */
export async function validateCustomFunctionFile(filePath, options = {}) {
  const src = fs.readFileSync(filePath, "utf8");
  const result = validateCustomFunctionSource(src, options);
  // Attach filePath to all diagnostics that have file: null
  const attachFile = d => d.file == null ? { ...d, file: filePath } : d;
  return {
    ...result,
    errors: result.errors.map(attachFile),
    warnings: result.warnings.map(attachFile),
  };
}
