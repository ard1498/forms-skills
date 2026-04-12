# create-form — Eval Plan

## Automated

Run the form validator smoke test:

```bash
bash skills/create-form/eval/eval-form-validate.sh
```

## Manual (E2E)

### Prompt
> Create the form JSON for a Contact Us form with these fields:
> - Full Name (required, 2-50 chars)
> - Email (required, valid email)
> - Phone (optional)
> - Inquiry Type (dropdown: General, Support, Sales)
> - Message (multiline, required when Inquiry Type is "Support")

### Expected Behavior
- Creates `form/contact-us.form.json`
- Correct field types (text-input, email, telephone-input, drop-down)
- Proper validation constraints
- Runs `form-validate` after creation
- Validator reports no errors

### Checklist
- [ ] form.json was created
- [ ] JSON is valid and parseable
- [ ] All 5 fields present with correct types
- [ ] Validator was run
- [ ] Validator reports success
- [ ] Drop-down has correct enum values
- [ ] No `fd:rules` in form.json (rules are separate)