# BLOCK_STATEMENTS Grammar

Each action in a rule is a `BLOCK_STATEMENT`. Multiple actions are multiple items in `BLOCK_STATEMENTS`.

```json
{
  "nodeName": "BLOCK_STATEMENTS",
  "items": [
    { "nodeName": "BLOCK_STATEMENT", "choice": { ...action... } },
    { "nodeName": "BLOCK_STATEMENT", "choice": { ...action... } }
  ]
}
```

---

## HIDE_STATEMENT / SHOW_STATEMENT

```json
{ "nodeName": "HIDE_STATEMENT", "items": [{ "nodeName": "AFCOMPONENT", "value": { "id": "$form.panel1" } }] }
{ "nodeName": "SHOW_STATEMENT", "items": [{ "nodeName": "AFCOMPONENT", "value": { "id": "$form.panel1" } }] }
```

---

## ENABLE_STATEMENT / DISABLE_STATEMENT

```json
{ "nodeName": "ENABLE_STATEMENT", "items": [{ "nodeName": "AFCOMPONENT", "value": { "id": "$form.field1" } }] }
{ "nodeName": "DISABLE_STATEMENT", "items": [{ "nodeName": "AFCOMPONENT", "value": { "id": "$form.field1" } }] }
```

---

## SET_VALUE_STATEMENT

Set the value of a field. Target is `VALUE_FIELD`; value is `EXPRESSION`.

```json
{
  "nodeName": "SET_VALUE_STATEMENT",
  "items": [
    { "nodeName": "VALUE_FIELD", "value": { "id": "$form.field1" } },
    { "nodeName": "to", "value": null },
    {
      "nodeName": "EXPRESSION",
      "choice": {
        "nodeName": "STRING_LITERAL",
        "value": "hello"
      }
    }
  ]
}
```

EXPRESSION choices: `STRING_LITERAL`, `NUMERIC_LITERAL`, `FUNCTION_CALL`, `BINARY_EXPRESSION`, `MEMBER_EXPRESSION`, `COMPONENT`. See `calc-expression.md` for EXPRESSION syntax details.

---

## CLEAR_VALUE_STATEMENT

Clear the value of a field.

```json
{
  "nodeName": "CLEAR_VALUE_STATEMENT",
  "items": [
    { "nodeName": "VALUE_FIELD", "value": { "id": "$form.field1" } }
  ]
}
```

---

## SET_PROPERTY

Set a property (label, placeholder, readOnly, required, etc.) on a component.

```json
{
  "nodeName": "SET_PROPERTY",
  "items": [
    {
      "nodeName": "MEMBER_EXPRESSION",
      "items": [
        { "nodeName": "PROPERTY_LIST", "value": "label" },
        { "nodeName": "of", "value": null },
        { "nodeName": "COMPONENT", "value": { "id": "$form.field1" } }
      ]
    },
    { "nodeName": "to", "value": null },
    {
      "nodeName": "EXTENDED_EXPRESSION",
      "choice": { "nodeName": "STRING_LITERAL", "value": "New Label" }
    }
  ]
}
```

Common property values: `"label"`, `"placeholder"`, `"readOnly"`, `"required"`, `"value"`, `"visible"`, `"enabled"`.

---

## SUBMIT_FORM / RESET_FORM / VALIDATE_FORM

```json
{ "nodeName": "SUBMIT_FORM", "items": [] }
{ "nodeName": "RESET_FORM", "items": [] }
{ "nodeName": "VALIDATE_FORM", "items": [] }
```

---

## SET_FOCUS

```json
{
  "nodeName": "SET_FOCUS",
  "items": [
    { "nodeName": "to", "value": null },
    { "nodeName": "AFCOMPONENT", "value": { "id": "$form.field1" } }
  ]
}
```

---

## DISPATCH_EVENT

Dispatch a custom event on a component. Structure: `STRING_LITERAL on AFCOMPONENT`.

```json
{
  "nodeName": "DISPATCH_EVENT",
  "items": [
    { "nodeName": "STRING_LITERAL", "value": "custom:myEvent" },
    { "nodeName": "on", "value": null },
    { "nodeName": "AFCOMPONENT", "value": { "id": "$form.field1" } }
  ]
}
```

---

## NAVIGATE_TO

Navigate to a URL, component, or function result in a specified window/tab mode.

```json
{
  "nodeName": "NAVIGATE_TO",
  "items": [
    {
      "nodeName": "NAVIGATE_TO_EXPRESSION",
      "choice": { "nodeName": "URL_LITERAL", "value": "https://example.com" }
    },
    { "nodeName": "in", "value": null },
    {
      "nodeName": "NAVIGATE_METHOD_OPTIONS",
      "choice": { "nodeName": "NEW_WINDOW", "value": null }
    }
  ]
}
```

`NAVIGATE_TO_EXPRESSION` choices: `URL_LITERAL`, `COMPONENT`, `FUNCTION_CALL`.  
`NAVIGATE_METHOD_OPTIONS` choices: `NEW_WINDOW`, `NEW_TAB`, `SAME_TAB`.

---

## ADD_INSTANCE / REMOVE_INSTANCE

Add or remove a repeatable panel instance.

```json
{ "nodeName": "ADD_INSTANCE", "items": [{ "nodeName": "of", "value": null }, { "nodeName": "REPEATABLE_COMPONENT", "value": { "id": "$form.repeatablePanel" } }] }
{ "nodeName": "REMOVE_INSTANCE", "items": [{ "nodeName": "of", "value": null }, { "nodeName": "REPEATABLE_COMPONENT", "value": { "id": "$form.repeatablePanel" } }] }
```

---

## FUNCTION_CALL as BLOCK_STATEMENT

Invoking a function for its side-effects uses `FUNCTION_CALL` directly as a BLOCK_STATEMENT choice:

```json
{
  "nodeName": "FUNCTION_CALL",
  "functionName": { "id": "myCustomFn", "impl": "$0($1)" },
  "params": [
    { "nodeName": "COMPONENT", "value": { "id": "$form.field1" } }
  ]
}
```

The `impl` value uses `$0()` for zero-arg, `$0($1)` for one arg, `$0($1, $2)` for two args, etc. — see agent-kb `08` for OOTB function impl strings and `12` for custom function authoring.


---

## SAVE_FORM *(requires FT_FORMS_11581)*

Save the current form state. No items.

```json
{ "nodeName": "SAVE_FORM", "items": [] }
```

---

## NAVIGATE_IN_PANEL *(requires FT_FORMS_10781)*

Move focus to the next or previous item within a panel.

```json
{
  "nodeName": "NAVIGATE_IN_PANEL",
  "items": [
    { "nodeName": "PANEL_FOCUS_OPTION", "choice": { "nodeName": "NEXT_ITEM" } },
    { "nodeName": "of", "value": null },
    { "nodeName": "PANEL", "value": { "id": "$form.panel1" } }
  ]
}
```

`PANEL_FOCUS_OPTION` choices: `NEXT_ITEM`, `PREVIOUS_ITEM`.

---

## WRITE_JSON_FORMULA *(requires FT_FORMS_20655)*

Emit a raw JSON Formula string directly. The `STRING_LITERAL` value is stripped of surrounding quotes and emitted verbatim.

```json
{
  "nodeName": "WRITE_JSON_FORMULA",
  "items": [
    { "nodeName": "STRING_LITERAL", "value": "someFormula()" }
  ]
}
```

---

## SET_VARIABLE *(requires FT_FORMS_19884)*

Store a value in a named variable on a component.

```json
{
  "nodeName": "SET_VARIABLE",
  "items": [
    { "nodeName": "key", "value": null },
    { "nodeName": "VARIABLE_NAME", "choice": { "nodeName": "STRING_LITERAL", "value": "myVar" } },
    { "nodeName": "value", "value": null },
    { "nodeName": "VARIABLE_VALUE", "choice": { "nodeName": "STRING_LITERAL", "value": "hello" } },
    { "nodeName": "on", "value": null },
    { "nodeName": "AFCOMPONENT", "value": { "id": "$form.field1" } }
  ]
}
```

`VARIABLE_NAME` choices: `AFCOMPONENT`, `STRING_LITERAL`, `FUNCTION_CALL`, `GET_VARIABLE`, `BINARY_EXPRESSION`.  
`VARIABLE_VALUE` choices: `STRING_LITERAL`, `NUMERIC_LITERAL`, `BOOLEAN_LITERAL`, `AFCOMPONENT`, `FUNCTION_CALL`, `GET_VARIABLE`, `BINARY_EXPRESSION`.

---

## GET_VARIABLE *(requires FT_FORMS_19884)*

Retrieve a named variable from a component (used as an expression, not a statement).

```json
{
  "nodeName": "GET_VARIABLE",
  "items": [
    { "nodeName": "key", "value": null },
    { "nodeName": "VARIABLE_NAME", "choice": { "nodeName": "STRING_LITERAL", "value": "myVar" } },
    { "nodeName": "from", "value": null },
    { "nodeName": "AFCOMPONENT", "value": { "id": "$form.field1" } }
  ]
}
```

---

## ASYNC_FUNCTION_CALL *(requires FT_FORMS_13519)*

Invoke an async/callback function for its side-effects as a BLOCK_STATEMENT.

```json
{
  "nodeName": "ASYNC_FUNCTION_CALL",
  "functionName": { "id": "fetchData", "impl": "$0($1)", "args": [] },
  "params": [
    { "nodeName": "COMPONENT", "value": { "id": "$form.field1", "type": "TEXT FIELD|STRING" } }
  ]
}
```
