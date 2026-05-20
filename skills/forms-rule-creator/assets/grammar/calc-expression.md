# CALC_EXPRESSION and CLEAR_EXPRESSION Grammar

Used for `fd:calc` (Calculate event). CALC_EXPRESSION sets a value; CLEAR_EXPRESSION clears it.

---

## CALC_EXPRESSION

```json
{
  "nodeName": "ROOT",
  "items": [{
    "nodeName": "STATEMENT",
    "choice": {
      "nodeName": "CALC_EXPRESSION",
      "items": [
        { "nodeName": "VALUE_FIELD", "value": { "id": "$form.totalField" } },
        { "nodeName": "to", "value": null },
        {
          "nodeName": "EXPRESSION",
          "choice": { ... }
        },
        { "nodeName": "When", "value": null },
        { "nodeName": "CONDITIONORALWAYS", "choice": null }
      ]
    }
  }],
  "enabled": true,
  "isValid": true
}
```

The sequence is always: `VALUE_FIELD`, `to`, `EXPRESSION`, `When`, `CONDITIONORALWAYS`.

`CONDITIONORALWAYS.choice: null` means always calculate. For a conditional calc, use a COMPARISON_EXPRESSION (see conditions.md).

---

## EXPRESSION Choices

```json
// String literal
{ "nodeName": "STRING_LITERAL", "value": "hello" }

// Number literal
{ "nodeName": "NUMERIC_LITERAL", "value": 42 }

// Boolean literal — BOOLEAN_LITERAL is a choice between True/False nodes
{ "nodeName": "True" }
{ "nodeName": "False" }

// Another field's value
{ "nodeName": "COMPONENT", "value": { "id": "$form.field1" } }

// Field property
{
  "nodeName": "MEMBER_EXPRESSION",
  "items": [
    { "nodeName": "PROPERTY_LIST", "value": "value" },
    { "nodeName": "of", "value": null },
    { "nodeName": "COMPONENT", "value": { "id": "$form.field1" } }
  ]
}

// Function call
{
  "nodeName": "FUNCTION_CALL",
  "functionName": { "id": "sum", "impl": "$0($1, $2)" },
  "params": [
    { "nodeName": "COMPONENT", "value": { "id": "$form.field1" } },
    { "nodeName": "COMPONENT", "value": { "id": "$form.field2" } }
  ]
}
```

For OOTB function `id` and `impl` values, see `../agent-kb/08-ootb-functions-reference.md`. For json-formula expression syntax, see `../agent-kb/07-json-formula-for-rules.md`.

---

## CLEAR_EXPRESSION

Sequence: `VALUE_FIELD When CONDITIONORALWAYS`. Use `CONDITIONORALWAYS.choice: null` to always clear.

```json
{
  "nodeName": "ROOT",
  "items": [{
    "nodeName": "STATEMENT",
    "choice": {
      "nodeName": "CLEAR_EXPRESSION",
      "items": [
        { "nodeName": "VALUE_FIELD", "value": { "id": "$form.totalField" } },
        { "nodeName": "When", "value": null },
        { "nodeName": "CONDITIONORALWAYS", "choice": null }
      ]
    }
  }],
  "enabled": true,
  "isValid": true,
  "version": 1
}
```

---

## Example: Calculate total = field1 + field2

```json
{
  "nodeName": "ROOT",
  "items": [{
    "nodeName": "STATEMENT",
    "choice": {
      "nodeName": "CALC_EXPRESSION",
      "items": [
        { "nodeName": "VALUE_FIELD", "value": { "id": "$form.totalField" } },
        { "nodeName": "to", "value": null },
        {
          "nodeName": "EXPRESSION",
          "choice": {
            "nodeName": "FUNCTION_CALL",
            "functionName": { "id": "sum", "impl": "$0($1, $2)" },
            "params": [
              { "nodeName": "COMPONENT", "value": { "id": "$form.field1" } },
              { "nodeName": "COMPONENT", "value": { "id": "$form.field2" } }
            ]
          }
        },
        { "nodeName": "When", "value": null },
        { "nodeName": "CONDITIONORALWAYS", "choice": null }
      ]
    }
  }],
  "enabled": true,
  "isValid": true
}
```
