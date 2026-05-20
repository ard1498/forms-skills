# EVENT_SCRIPTS Grammar

## Overview

EVENT_SCRIPTS represents a conditional event rule: "When [trigger/condition], then [actions]".

```
EVENT_SCRIPTS
├── EVENT_CONDITION
│   └── choice: EVENT_AND_COMPARISON | BINARY_EVENT_CONDITION
├── Then (keyword)
└── BLOCK_STATEMENTS

With FT_FORMS_12053 (Else block, allowBase: true — omitting Else is also valid):
EVENT_SCRIPTS
├── EVENT_CONDITION
├── Then
├── BLOCK_STATEMENTS  (then-branch)
├── Else (keyword)
└── BLOCK_STATEMENTS  (else-branch)
```

## Skeleton JSON

```json
{
  "nodeName": "EVENT_SCRIPTS",
  "items": [
    {
      "nodeName": "EVENT_CONDITION",
      "choice": { ... },
      "nested": false
    },
    { "nodeName": "Then", "value": null },
    {
      "nodeName": "BLOCK_STATEMENTS",
      "items": [
        { "nodeName": "BLOCK_STATEMENT", "choice": { ... } }
      ]
    }
  ]
}
```

Wrap in ROOT + STATEMENT:
```json
{
  "nodeName": "ROOT",
  "items": [
    {
      "nodeName": "STATEMENT",
      "choice": { ...EVENT_SCRIPTS above... }
    }
  ]
}
```

---

## EVENT_CONDITION Choices

### EVENT_AND_COMPARISON

Two forms exist. FT_FORMS_19582 is ON by default and has `allowBase: true` — both forms are valid simultaneously. Use the FT form (recommended).

**FT form (recommended):** LHS is `EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION` wrapping `COMPONENT` or `FUNCTION_CALL`:

```json
{
  "nodeName": "EVENT_AND_COMPARISON",
  "items": [
    {
      "nodeName": "EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION",
      "choice": {
        "nodeName": "COMPONENT",
        "value": { "id": "$form.button1" }
      }
    },
    {
      "nodeName": "EVENT_AND_COMPARISON_OPERATOR",
      "choice": { "nodeName": "is clicked", "value": null }
    },
    {
      "nodeName": "PRIMITIVE_EXPRESSION",
      "choice": null
    }
  ]
}
```

**Base form (also valid):** LHS is `COMPONENT` directly:

```json
{
  "nodeName": "EVENT_AND_COMPARISON",
  "items": [
    {
      "nodeName": "COMPONENT",
      "value": { "id": "$form.button1" }
    },
    {
      "nodeName": "EVENT_AND_COMPARISON_OPERATOR",
      "choice": { "nodeName": "is clicked", "value": null }
    },
    {
      "nodeName": "PRIMITIVE_EXPRESSION",
      "choice": null
    }
  ]
}
```

**`EVENT_AND_COMPARISON_OPERATOR` valid nodeNames:**

| nodeName | Meaning | PRIMITIVE_EXPRESSION |
|---|---|---|
| `is changed` | field value changed | `choice: null` |
| `is clicked` | button/link clicked | `choice: null` |
| `is initialized` | field initialized | `choice: null` |
| `EQUALS_TO` | value equals | STRING/NUMERIC/BOOLEAN_LITERAL |
| `NOT_EQUALS_TO` | value does not equal | STRING/NUMERIC/BOOLEAN_LITERAL |
| `GREATER_THAN` | value greater than | NUMERIC_LITERAL |
| `LESS_THAN` | value less than | NUMERIC_LITERAL |
| `HAS_SELECTED` | option is selected | STRING_LITERAL |

For lifecycle operators (`is changed`, `is clicked`, `is initialized`): set `PRIMITIVE_EXPRESSION.choice` to `null`.  
For value-comparison operators: provide a `PRIMITIVE_EXPRESSION` with a literal choice.

### BINARY_EVENT_CONDITION

Combines two EVENT_CONDITIONs with AND or OR:

```json
{
  "nodeName": "BINARY_EVENT_CONDITION",
  "items": [
    {
      "nodeName": "EVENT_CONDITION",
      "choice": { "nodeName": "EVENT_AND_COMPARISON", "items": [ ... ] },
      "nested": true
    },
    {
      "nodeName": "OPERATOR",
      "choice": { "nodeName": "AND", "value": null }
    },
    {
      "nodeName": "EVENT_CONDITION",
      "choice": { "nodeName": "EVENT_AND_COMPARISON", "items": [ ... ] },
      "nested": true
    }
  ]
}
```

OPERATOR choices: `AND`, `OR`.

---

## Else Block (FT_FORMS_12053)

FT_FORMS_12053 is ON by default (`allowBase: true`). Add an Else branch only when the prompt requires different actions on the else path.

```json
{
  "nodeName": "EVENT_SCRIPTS",
  "items": [
    { "nodeName": "EVENT_CONDITION", "choice": { ... }, "nested": false },
    { "nodeName": "Then", "value": null },
    {
      "nodeName": "BLOCK_STATEMENTS",
      "items": [ { "nodeName": "BLOCK_STATEMENT", "choice": { ...then action... } } ]
    },
    { "nodeName": "Else", "value": null },
    {
      "nodeName": "BLOCK_STATEMENTS",
      "items": [ { "nodeName": "BLOCK_STATEMENT", "choice": { ...else action... } } ]
    }
  ]
}
```

---

## fd:* Key Selection

Use `../agent-kb/05-rule-events-by-scenario.md` to confirm the correct fd:* key. Quick reference:

| Trigger | fd:* key |
|---------|----------|
| Button click | `fd:click` |
| Field value change | `fd:valueCommit` |
| Form initialize | `fd:init` |
| Form submit success | `fd:submitSuccess` |
| Form submit error | `fd:submitError` |

---

## Full Example: "When button1 is clicked, submit the form"

```json
{
  "nodeName": "ROOT",
  "items": [{
    "nodeName": "STATEMENT",
    "choice": {
      "nodeName": "EVENT_SCRIPTS",
      "items": [
        {
          "nodeName": "EVENT_CONDITION",
          "choice": {
            "nodeName": "EVENT_AND_COMPARISON",
            "items": [
              {
                "nodeName": "EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION",
                "choice": {
                  "nodeName": "COMPONENT",
                  "value": { "id": "$form.button1" }
                }
              },
              {
                "nodeName": "EVENT_AND_COMPARISON_OPERATOR",
                "choice": { "nodeName": "is clicked", "value": null }
              },
              { "nodeName": "PRIMITIVE_EXPRESSION", "choice": null }
            ]
          },
          "nested": false
        },
        { "nodeName": "Then", "value": null },
        {
          "nodeName": "BLOCK_STATEMENTS",
          "items": [{
            "nodeName": "BLOCK_STATEMENT",
            "choice": { "nodeName": "SUBMIT_FORM", "items": [] }
          }]
        }
      ]
    }
  }],
  "enabled": true,
  "isValid": true,
  "version": 1
}
```
