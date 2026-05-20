# Conditions Grammar

Used in EVENT_SCRIPTS (`EVENT_CONDITION`), VALIDATE_EXPRESSION, CALC_EXPRESSION (When clause), and visibility/enabled expressions (CONDITIONORALWAYS).

---

## EXPRESSION Choices

| Value type | nodeName | value field |
|------------|----------|-------------|
| String literal | `STRING_LITERAL` | `"hello"` |
| Number literal | `NUMERIC_LITERAL` | `42` |
| Boolean | `BOOLEAN_LITERAL` | `true` / `false` |
| Field value | `COMPONENT` | `{ "id": "$form.field1" }` |
| Member property | `MEMBER_EXPRESSION` | see below |
| Function result | `FUNCTION_CALL` | see calc-expression.md |
| Binary arithmetic | `BINARY_EXPRESSION` | see calc-expression.md |

> **`PRIMITIVE_EXPRESSION`** is a distinct node used only for literal values (`STRING_LITERAL | NUMERIC_LITERAL | BOOLEAN_LITERAL`). It appears in `EVENT_AND_COMPARISON` — not as a wrapper in `COMPARISON_EXPRESSION`.

---

## COMPARISON_EXPRESSION

Binary comparison: `EXPRESSION OPERATOR EXPRESSION`.

```json
{
  "nodeName": "COMPARISON_EXPRESSION",
  "items": [
    {
      "nodeName": "EXPRESSION",
      "choice": { "nodeName": "COMPONENT", "value": { "id": "$form.field1" } }
    },
    {
      "nodeName": "OPERATOR",
      "choice": { "nodeName": "EQUALS_TO", "value": null }
    },
    {
      "nodeName": "EXPRESSION",
      "choice": { "nodeName": "STRING_LITERAL", "value": "yes" }
    }
  ]
}
```

**OPERATOR nodeNames:**

| Group | nodeNames |
|---|---|
| Comparison | `EQUALS_TO`, `NOT_EQUALS_TO`, `GREATER_THAN`, `LESS_THAN`, `GREATER_THAN_EQUAL`, `LESS_THAN_EQUAL` |
| String | `CONTAINS`, `DOES_NOT_CONTAIN`, `STARTS_WITH`, `ENDS_WITH` |
| Unary (no RHS) | `IS_EMPTY`, `IS_NOT_EMPTY`, `IS_TRUE`, `IS_FALSE` |

For unary operators, omit the right-hand EXPRESSION or set its choice to `null`.

---

## BOOLEAN_BINARY_EXPRESSION (AND / OR)

Combine two CONDITIONs. `CONDITION` choice is `COMPARISON_EXPRESSION | BOOLEAN_BINARY_EXPRESSION`.

```json
{
  "nodeName": "BOOLEAN_BINARY_EXPRESSION",
  "items": [
    {
      "nodeName": "CONDITION",
      "choice": { "nodeName": "COMPARISON_EXPRESSION", "items": [ ... ] }
    },
    {
      "nodeName": "OPERATOR",
      "choice": { "nodeName": "AND", "value": null }
    },
    {
      "nodeName": "CONDITION",
      "choice": { "nodeName": "COMPARISON_EXPRESSION", "items": [ ... ] }
    }
  ]
}
```

OPERATOR choices: `AND`, `OR`.

---

## MEMBER_EXPRESSION (property access)

Access a property of a component (e.g., `visible of field1`).

```json
{
  "nodeName": "MEMBER_EXPRESSION",
  "items": [
    { "nodeName": "PROPERTY_LIST", "value": "visible" },
    { "nodeName": "of", "value": null },
    { "nodeName": "COMPONENT", "value": { "id": "$form.field1" } }
  ]
}
```

Valid properties per field type are defined in `../agent-kb/06-rule-properties-by-field-type.md`. Common ones:
- All fields: `"value"`, `"visible"`, `"enabled"`, `"valid"`, `"label"`
- Number fields: additionally `"minimum"`, `"maximum"`
- Date fields: additionally `"minimum"`, `"maximum"`
- Dropdown/radio: additionally `"options"`
