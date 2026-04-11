#!/usr/bin/env node
/**
 * EDS Form Validator CLI
 *
 * Self-contained validator with optional _form.json for custom components.
 *
 * Usage:
 *   node validate.cjs <form.json>
 *   node validate.cjs <form.json> <_form.json>
 *   node validate.cjs <form.json> --json
 */

const fs = require('fs');
const path = require('path');
const { validate } = require('./FormFieldValidator.cjs');

function main() {
  const args = process.argv.slice(2);
  const nonFlagArgs = args.filter(a => !a.startsWith('--'));
  const jsonOnly = args.includes('--json');

  if (args.includes('--help') || args.includes('-h') || nonFlagArgs.length < 1) {
    console.log(`
EDS Form Field Validator
========================

A self-contained validator for Adobe EDS form fields.
Validates form.json against built-in field schemas.

Usage:
  node validate.cjs <form.json>                        Validate a form file
  node validate.cjs <form.json> <_form.json>           Validate with custom components from _form.json
  node validate.cjs <form.json> --json                 Output JSON report only (for LLM)
  node validate.cjs <form.json> <_form.json> --json    Both options combined
  node validate.cjs --help                             Show this help

Arguments:
  form.json      Path to the form definition file to validate
  _form.json     (Optional) Path to _form.json containing custom component filters
                 If provided, unknown fd:viewType values that match components in
                 the filters will be skipped (custom components).
                 If not provided, unknown fd:viewType values will cause errors.

What it validates:
  - fieldType: Must be present and valid
  - fd:viewType: Must be valid (or match custom component in _form.json)
  - name: Must be present, start with letter, contain only letters/numbers/underscores
  - Property names: Must be valid for the field type
  - Property types: string, number, boolean, array as expected
  - Property values: Must be in allowed enum values where applicable
  - Constraints: minLength <= maxLength, minimum <= maximum, etc.
  - Regex patterns: Must be valid regular expressions

Examples:
  node validate.cjs ./form.json
  node validate.cjs ./form.json ./authoring/_form.json
  node validate.cjs /path/to/my-form.json --json
`);
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }

  const formPath = nonFlagArgs[0];
  const formJsonPath = nonFlagArgs[1]; // Optional _form.json path

  // Load form
  let form;
  try {
    form = JSON.parse(fs.readFileSync(formPath, 'utf-8'));
  } catch (e) {
    console.error(`Error loading form from ${formPath}: ${e.message}`);
    process.exit(1);
  }

  // Load _form.json if provided to get custom components
  let customComponents = null;
  if (formJsonPath) {
    try {
      const formJson = JSON.parse(fs.readFileSync(formJsonPath, 'utf-8'));
      // Extract components from filters
      if (formJson.filters && formJson.filters[0] && formJson.filters[0].components) {
        customComponents = formJson.filters[0].components;
        if (!jsonOnly) {
          console.log(`Loaded ${customComponents.length} custom components from ${formJsonPath}`);
        }
      }
    } catch (e) {
      console.error(`Error loading _form.json from ${formJsonPath}: ${e.message}`);
      process.exit(1);
    }
  }

  // Validate
  const options = customComponents ? { customComponents } : {};
  const result = validate(form, options);

  // Output
  if (jsonOnly) {
    console.log(JSON.stringify(result.llmReport, null, 2));
  } else {
    console.log('\n' + result.summary);
    console.log('\n--- JSON Report (for LLM) ---');
    console.log(JSON.stringify(result.llmReport, null, 2));
  }

  process.exit(result.isValid ? 0 : 1);
}

main();
