# Build Your First AEM Form with AI

This tutorial walks you through building a complete AEM Adaptive Form using the aem-forms skills. You'll create a Contact Us form — with fields, business rules, and a custom function — entirely through natural language.

**Prerequisites:** Claude Code with the aem-forms plugin installed, Node.js 18+, Python 3.10+

---

## What You'll Build

A Contact Us form with:
- Full Name, Email, Phone fields
- Inquiry Type dropdown (General, Support, Sales)
- Message field that appears only when "Support" is selected
- A custom function that pre-fills the message for "Sales" inquiries

---

## Step 1: Set Up Your Workspace

Tell Claude:

> "Set up a new AEM Forms workspace for my contact form project."

Claude will create the workspace directory, collect your AEM and GitHub credentials, and verify connectivity. Follow the prompts — it'll ask for your AEM Author URL, GitHub repo, and tokens.

Once setup completes you'll have a workspace like:

```
<eds-repo-root>/
├── .claude/settings.json ← hooks
├── blocks/form/          ← your EDS form code lives here directly
└── .skills-workspace/    ← agent workspace (gitignored)
    ├── .env              ← your credentials
    ├── CLAUDE.md         ← guidance for Claude in this workspace
    ├── repo/             ← pulled forms land here
    ├── refs/             ← fragment references and API specs
    └── plans/            ← generated execution plans
```

---

## Step 2: Analyze Requirements

Tell Claude:

> "Here are the requirements for a Contact Us form. Please analyze them.
>
> I need a contact form for website visitors with:
> - Full Name (required, 2–50 characters)
> - Email (required, valid email format)
> - Phone (optional)
> - Inquiry Type (dropdown: General, Support, Sales)
> - Message (multiline, required when Inquiry Type is 'Support')
> - On submit, show a thank-you message"

Claude uses the `analyze-requirements` skill to produce a structured specification — field inventory, panel structure, validation rules, and rule requirements. Review it and confirm before moving on.

---

## Step 3: Create the Form

Tell Claude:

> "Create the form JSON based on that specification."

Claude uses the `forms-content-author` skill to generate `form.json` with the correct field types, validation constraints, and panel layout. It runs the form validator automatically — you'll see any issues flagged before the file is written.

---

## Step 4: Add Business Rules

Tell Claude:

> "Add the visibility rule: show the message field when Inquiry Type is 'Support', hide it otherwise."

Claude uses the `forms-rule-creator` skill. It:
1. Runs `transform-form` to get the exact component names from your form
2. Constructs the rule JSON using the correct grammar
3. Validates the rule before saving — it will not save an invalid rule

The rule lands in `form.rule.json` alongside your form.

---

## Step 5: Add a Custom Function

Tell Claude:

> "Create a custom function that pre-fills the message field with 'I'm interested in learning more about...' when the inquiry type is set to Sales."

Claude uses the `forms-rule-creator` skill to write the function with proper JSDoc annotations and wire it into the form's `customFunctionsPath`. It verifies the function appears in the parsed output before finishing.

---

## Step 6: Push to AEM

Tell Claude:

> "Push the form to AEM."

Claude will confirm with you before pushing. Once deployed, open your AEM instance and the form will be live and ready to test in the visual rule editor.

---

## What Each Skill Did

| Skill | What it handled |
|-------|----------------|
| `setup-workspace` | Credentials, directory structure, connectivity |
| `analyze-requirements` | Structured spec from plain-language requirements |
| `forms-content-author` | `form.json` with fields, panels, validation |
| `forms-rule-creator` | Business rules in `form.rule.json` |
| `forms-rule-creator` | Custom JS function wired to the form |

---

## Known Limitations

- **AEM connection required** — `forms-content-author` uses the Sites Content MCP server to read and write form content. IMS tokens for AEM as a Cloud Service expire; re-authenticate via the MCP server if you get a 401.
- **No API integration in this tutorial** — `manage-apis` and data-loading rules require an OpenAPI spec in `refs/apis/`. See the plugin README for how to add APIs.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module 'lodash'` | Run `npm install` in `forms-rule-creator/` |
| Validator reports invalid field type | Check `forms-orchestrator/.../forms-content-author/references/field-types.md` for valid types |
| Rule validator says Unknown nodeName | Check `forms-orchestrator/.../forms-rule-creator/references/grammar-reference.md` |
| 401 on AEM push | Bearer token expired — regenerate and paste into `.env` |
| Wrong working directory errors | Make sure you're running commands from the workspace root |
