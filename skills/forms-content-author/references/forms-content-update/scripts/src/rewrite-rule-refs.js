#!/usr/bin/env node
// Rewrites rule ASTs in an AEM content model, replacing all COMPONENT references
// from oldQualifiedId to newQualifiedId. Used after rename/move to migrate rules.
//
// Usage:
//   node rewrite-rule-refs.bundle.js \
//     --content-model '<json>' \
//     --old-id '$form.panel.phone' \
//     --new-id '$form.panel.phoneNumber'
//
//   node rewrite-rule-refs.bundle.js \
//     --content-model-file /tmp/content-model.json \
//     --old-id '$form.panel.phone' \
//     --new-id '$form.panel.phoneNumber'
//
// Output:
//   Array of affected rules with rewritten ASTs:
//   [{ fieldName, capiKey, pointer, fdKey, rewrittenAst }]
//
//   Each entry should be followed by:
//     1. validate-rule.bundle.js on the rewrittenAst
//     2. generate-formula.bundle.js to recompile the formula
//     3. patch-aem-page-content to update the fd:rules node
//
// Exit codes: 0=success (zero or more rewrites), 1=error, 2=bad args

import { readFileSync } from 'fs';
import { walkItems, findFormRoot } from '../../../../../../lib/scripts/content-model-walk.js';
import { RULE_AST_KEYS, rewriteComponentRefs } from '@aemforms/rule-editor-transformer';

function findFdRulesChild(itemsObj) {
  if (!itemsObj || typeof itemsObj !== 'object') return null;
  for (const val of Object.values(itemsObj)) {
    if (val.id === 'fd:rules' || val.componentType === 'fd:rules') return val;
  }
  return null;
}

function rewriteRuleRefs(contentModel, oldId, newId) {
  const formRoot = findFormRoot(contentModel);
  if (!formRoot) return [];

  const formRootCapiKey = formRoot['capi-key'] || '0';
  const formRootPointer = formRootCapiKey.split(':').map(s => `/items/${s}`).join('');

  const rewrites = [];

  walkItems(formRoot.items || {}, '$form', formRootCapiKey, formRootPointer, 1, (entry, ctx) => {
    const rulesNode = findFdRulesChild(entry.items);
    if (!rulesNode) return;

    const ruleSource = rulesNode.properties || rulesNode;

    for (const fdKey of RULE_AST_KEYS) {
      const astArray = ruleSource[fdKey];
      if (!Array.isArray(astArray) || astArray.length === 0) continue;

      let ast;
      try { ast = JSON.parse(astArray[0]); } catch { continue; }

      const rewritten = rewriteComponentRefs(ast, oldId, newId);

      // Only include if something actually changed
      if (JSON.stringify(rewritten) === JSON.stringify(ast)) continue;

      const capiKey = entry['capi-key'] || ctx.capiKey;
      rewrites.push({
        fieldName: ctx.name,
        capiKey,
        pointer: capiKey.split(':').map(s => `/items/${s}`).join(''),
        fdKey,
        rewrittenAst: rewritten,
      });
    }
  });

  return rewrites;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = flag => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };

const contentModelJson = get('--content-model');
const contentModelFile = get('--content-model-file');
const oldId            = get('--old-id');
const newId            = get('--new-id');

if ((!contentModelJson && !contentModelFile) || !oldId || !newId) {
  process.stderr.write(
    'Usage: node rewrite-rule-refs.bundle.js --content-model <json> --old-id <id> --new-id <id>\n' +
    '       node rewrite-rule-refs.bundle.js --content-model-file <path> --old-id <id> --new-id <id>\n'
  );
  process.exit(2);
}

let contentModel;
try {
  const isFilePath = s => typeof s === 'string' && (s.startsWith('/') || s.startsWith('./') || s.startsWith('~/'));
  const raw = (contentModelJson && !isFilePath(contentModelJson))
    ? contentModelJson
    : readFileSync(contentModelFile || contentModelJson, 'utf8');
  const parsed = JSON.parse(raw);
  contentModel = (parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
} catch (err) {
  process.stderr.write('Error: could not parse content model: ' + err.message + '\n');
  process.exit(1);
}

const rewrites = rewriteRuleRefs(contentModel, oldId, newId);
process.stdout.write(JSON.stringify(rewrites, null, 2) + '\n');
process.exit(0);
