---
name: scaffold-form
description: >
  Scaffolds a new, empty AEM Adaptive Form JSON file pair (form.json + rule.json) from
  a built-in template. Auto-converts kebab/snake-case names to Title Case, supports
  optional submit button, and refuses to overwrite existing files. Use when starting a
  brand-new form definition from scratch without touching AEM.
  Triggers: scaffold form, new form, blank form, empty form, form template, form skeleton,
  generate form json, scaffold-form, create form locally.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
allowed-tools: Read, Write, Edit, Bash
---

# Form Scaffolder

You generate empty AEM Adaptive Form JSON files from a template using the `scaffold-form` CLI.

## When to Use

- Creating a brand-new form definition locally (without AEM)
- Generating a starter form.json + rule.json pair
- Starting from a clean template before adding fields

**Do NOT use for:** Modifying existing forms (use **create-form** skill), or creating forms on AEM Author (use **sync-forms** skill).

## Critical Rules

1. **Use the CLI** — do not hand-create form.json files from scratch
2. **Will not overwrite** — the tool refuses to create files that already exist
3. **Naming convention** — form names should be kebab-case (e.g., `my-registration-form`)
4. **Always add fields after scaffolding** — the scaffolded form is empty; delegate to the **create-form** skill to add fields

## Tool Commands

| Action | Command |
|--------|---------|
| Scaffold a form | `scaffold-form <form_name>` |
| With custom title | `scaffold-form <form_name> --title "My Form Title"` |
| With submit button | `scaffold-form <form_name> --with-submit` |
| Custom output dir | `scaffold-form <form_name> --output-dir ./my-dir` |

## Workflow

1. **Scaffold** — `scaffold-form my-registration-form --with-submit`
2. **Verify** — check the generated `form/my-registration-form.form.json` and `.rule.json`
3. **Add fields** — delegate to the **create-form** skill to populate the form
4. **Add rules** — delegate to the **add-rules** skill for business logic

## Output

The tool generates two files:

```
<output-dir>/
├── <form_name>.form.json    # Empty form structure with metadata
└── <form_name>.rule.json    # Empty rules file
```

The form.json includes:
- Proper AEM resource types and field types
- Auto-generated Title Case title from the form name
- Optional submit button (when `--with-submit` is used)

## Examples

### Basic form
```bash
scaffold-form customer-onboarding
```
Creates `form/customer-onboarding.form.json` with title "Customer Onboarding".

### Form with submit button in custom directory
```bash
scaffold-form loan-application --with-submit --output-dir ./forms
```
Creates `forms/loan-application.form.json` with title "Loan Application" and a submit button.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| File already exists | Choose a different name or delete the existing file first |
| Wrong title | Use `--title "Custom Title"` to override auto-generated title |
| No output | Check `--output-dir` path exists |