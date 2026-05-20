#!/usr/bin/env node
// Find a field (or multiple fields) in an AEM content model by name, id, or jcr:title.
//
// Usage (single):
//   node find-field.bundle.js --content-model '<json>' --name '<fieldName>'
//   node find-field.bundle.js --content-model-file /tmp/content-model.json --name '<fieldName>'
//
// Usage (multi):
//   node find-field.bundle.js --content-model-file /tmp/content-model.json --names 'phone,country'
//
// Output (single, found):
//   { found, capiKey, pointer, propertyPointer, qualifiedId, type, displayName, componentType, isPanel, component }
//
// Output (multi):
//   [{ name, found, capiKey, pointer, propertyPointer, qualifiedId, type, displayName, componentType, isPanel, component }]
//
// Exit codes: 0=found (all found for multi), 1=not found, 2=bad args

import { readFileSync } from 'fs';
import { walkItems, findFormRoot, fieldTypeToType, PANEL_FIELD_TYPES } from '../../../../../../lib/scripts/content-model-walk.js';

function capiToPointer(capiKey) {
  return capiKey.split(':').map(s => `/items/${s}`).join('');
}

function isPanel(fieldType) {
  return PANEL_FIELD_TYPES.has(fieldType || '');
}

function stripServerFields(entry) {
  const { 'capi-key': _k, 'capi-index': _i, ...rest } = entry;
  if (rest.items && typeof rest.items === 'object' && !Array.isArray(rest.items)) {
    const children = Object.values(rest.items);
    rest.items = children.length > 0 ? children.map(stripServerFields) : [];
  }
  return rest;
}

function findFieldByName(contentModel, targetName) {
  const formRoot = findFormRoot(contentModel);
  if (!formRoot) return { found: false };

  const formRootCapiKey = formRoot['capi-key'] || '0';
  const formRootPointer = capiToPointer(formRootCapiKey);

  let result = null;

  walkItems(formRoot.items || {}, '$form', formRootCapiKey, formRootPointer, 1, (entry, ctx) => {
    if (result) return; // already found — walkItems doesn't short-circuit, so guard here

    const nameMatch  = entry.properties?.name === targetName;
    const idMatch    = !entry.properties?.name && entry.id === targetName;
    const titleMatch = entry.properties?.['jcr:title']?.toLowerCase() === targetName.toLowerCase();

    if (nameMatch || idMatch || titleMatch) {
      // Use stored capi-key for capiKey/pointer (authoritative), ctx.qualifiedId for rule ID
      const capiKey = entry['capi-key'] || ctx.capiKey;
      const pointer = capiToPointer(capiKey);
      const fieldType = entry.properties?.fieldType || '';

      result = {
        found: true,
        capiKey,
        pointer,
        propertyPointer: pointer + '/properties',
        qualifiedId: ctx.qualifiedId,
        type: fieldTypeToType(fieldType),
        displayName: entry.properties?.['jcr:title'] || ctx.name,
        componentType: entry.componentType || '',
        isPanel: isPanel(fieldType),
        component: stripServerFields(entry),
      };
    }
  });

  return result || { found: false };
}

function findFieldsByNames(contentModel, names) {
  return names.map(name => ({ name, ...findFieldByName(contentModel, name) }));
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = flag => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };

const contentModelJson = get('--content-model');
const contentModelFile = get('--content-model-file');
const name             = get('--name');
const namesArg         = get('--names');

if ((!contentModelJson && !contentModelFile) || (!name && !namesArg)) {
  process.stderr.write(
    'Usage: node find-field.bundle.js --content-model <json> --name <name>\n' +
    '       node find-field.bundle.js --content-model-file <path> --names "a,b,c"\n'
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
  // Unwrap { eTag, data } API response format from get-aem-page-content
  contentModel = (parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
} catch (err) {
  process.stderr.write('Error: could not parse content model: ' + err.message + '\n');
  process.exit(2);
}

if (name) {
  const result = findFieldByName(contentModel, name);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.found ? 0 : 1);
} else {
  const names = namesArg.split(',').map(n => n.trim()).filter(Boolean);
  const results = findFieldsByNames(contentModel, names);
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  process.exit(results.every(r => r.found) ? 0 : 1);
}
