#!/usr/bin/env node
// Scans an AEM content model for fd:rules nodes that reference a given qualifiedId in their ASTs.
// Used before rename/move/delete to identify rules that will break.
//
// Usage:
//   node find-rule-refs.bundle.js --content-model '<json>' --qualified-id '$form.panel.phone'
//   node find-rule-refs.bundle.js --content-model-file /tmp/content-model.json --qualified-id '$form.panel.phone'
//
// Output:
//   { refs: [{ fieldName, capiKey, pointer, fdKey }], total }
//
// Exit codes: 0=success (zero or more refs), 1=error, 2=bad args

import { readFileSync } from 'fs';
import { RULE_AST_KEYS } from '@aemforms/rule-editor-transformer';
import { walkItems, findFormRoot } from '../../../../../../lib/scripts/content-model-walk.js';

// Find the fd:rules child node inside a field's items
function findFdRulesChild(itemsObj) {
  if (!itemsObj || typeof itemsObj !== 'object') return null;
  for (const val of Object.values(itemsObj)) {
    if (val.id === 'fd:rules' || val.componentType === 'fd:rules') return val;
  }
  return null;
}

// Recursively walk an AST object/array looking for COMPONENT nodes with id === targetId
function hasComponentRef(node, targetId) {
  if (!node || typeof node !== 'object') return false;
  if (['COMPONENT', 'AFCOMPONENT', 'VALUE_FIELD'].includes(node.nodeName) && node.id === targetId) return true;
  for (const val of Object.values(node)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (hasComponentRef(item, targetId)) return true;
      }
    } else if (typeof val === 'object' && val !== null) {
      if (hasComponentRef(val, targetId)) return true;
    }
  }
  return false;
}

function findRuleRefs(contentModel, targetQualifiedId) {
  const formRoot = findFormRoot(contentModel);
  if (!formRoot) return { refs: [], total: 0 };

  const formRootCapiKey = formRoot['capi-key'] || '0';
  const formRootPointer = formRootCapiKey.split(':').map(s => `/items/${s}`).join('');

  const refs = [];

  walkItems(formRoot.items || {}, '$form', formRootCapiKey, formRootPointer, 1, (entry, ctx) => {
    const rulesNode = findFdRulesChild(entry.items);
    if (!rulesNode) return;

    // Check properties in both locations: top-level (patch format) and under .properties (possible get format)
    const ruleSource = rulesNode.properties || rulesNode;

    for (const fdKey of RULE_AST_KEYS) {
      const astArray = ruleSource[fdKey];
      if (!Array.isArray(astArray) || astArray.length === 0) continue;

      let ast;
      try { ast = JSON.parse(astArray[0]); } catch { continue; }

      if (hasComponentRef(ast, targetQualifiedId)) {
        const capiKey = entry['capi-key'] || ctx.capiKey;
        refs.push({
          fieldName: ctx.name,
          capiKey,
          pointer: capiKey.split(':').map(s => `/items/${s}`).join(''),
          fdKey,
        });
      }
    }
  });

  return { refs, total: refs.length };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = flag => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };

const contentModelJson = get('--content-model');
const contentModelFile = get('--content-model-file');
const qualifiedId      = get('--qualified-id');

if ((!contentModelJson && !contentModelFile) || !qualifiedId) {
  process.stderr.write(
    'Usage: node find-rule-refs.bundle.js --content-model <json> --qualified-id <id>\n' +
    '       node find-rule-refs.bundle.js --content-model-file <path> --qualified-id <id>\n'
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

const result = findRuleRefs(contentModel, qualifiedId);
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(0);
