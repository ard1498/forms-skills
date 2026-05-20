# FORMAT_EXPRESSION Grammar

Used for `fd:format` (Format event). Controls the display format of a field value.

```json
{
  "nodeName": "ROOT",
  "items": [{
    "nodeName": "STATEMENT",
    "choice": {
      "nodeName": "FORMAT_EXPRESSION",
      "items": [
        { "nodeName": "VALUE_FIELD", "value": { "id": "$form.field1" } },
        { "nodeName": "Using", "value": null },
        { "nodeName": "Expression", "value": null },
        {
          "nodeName": "NUMBER_FORMAT_EXPRESSION",
          "choice": { ...format choice... }
        }
      ]
    }
  }],
  "enabled": true,
  "isValid": true
}
```

The sequence is always: `VALUE_FIELD`, `Using`, `Expression`, `NUMBER_FORMAT_EXPRESSION`.

---

## NUMBER_FORMAT_EXPRESSION Choices

```json
// String mask literal
{ "nodeName": "STRING_LITERAL", "value": "##,##0.00" }

// Function-based format
{
  "nodeName": "FUNCTION_CALL",
  "functionName": { "id": "formatDate", "impl": "$0($1)" },
  "params": [
    { "nodeName": "COMPONENT", "value": { "id": "$form.dateField" } }
  ]
}
```

For available format strings and OOTB formatting functions, see `../agent-kb/07-json-formula-for-rules.md`.

---

## Example: Format a number as currency

```json
{
  "nodeName": "ROOT",
  "items": [{
    "nodeName": "STATEMENT",
    "choice": {
      "nodeName": "FORMAT_EXPRESSION",
      "items": [
        { "nodeName": "VALUE_FIELD", "value": { "id": "$form.amountField" } },
        { "nodeName": "Using", "value": null },
        { "nodeName": "Expression", "value": null },
        {
          "nodeName": "NUMBER_FORMAT_EXPRESSION",
          "choice": { "nodeName": "STRING_LITERAL", "value": "##,##0.00" }
        }
      ]
    }
  }],
  "enabled": true,
  "isValid": true
}
```
