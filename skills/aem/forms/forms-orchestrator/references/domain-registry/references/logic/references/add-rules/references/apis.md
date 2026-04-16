# API Reference — globals.functions

## setProperty / setVariable APIs

| Action | API |
|--------|-----|
| Show field/panel | `globals.functions.setProperty(field, { visible: true })` |
| Hide field/panel | `globals.functions.setProperty(field, { visible: false })` |
| Enable field | `globals.functions.setProperty(field, { enabled: true })` |
| Disable field | `globals.functions.setProperty(field, { enabled: false })` |
| Set value | `globals.functions.setProperty(field, { value: val })` |
| Clear value | `globals.functions.setProperty(field, { value: null })` |
| Set required | `globals.functions.setProperty(field, { required: true })` |
| Set label | `globals.functions.setProperty(field, { label: { value: 'text' } })` |
| Dispatch event | `globals.functions.dispatchEvent(globals.form, 'custom:event', payload)` |
| Submit form | `globals.functions.submitForm()` |
| Reset form | `globals.functions.reset()` |
| Navigate | `globals.functions.navigateTo(url)` |
| Set variable | `globals.functions.setVariable('key', value)` |
| Get variable | `globals.functions.getVariable('key')` |

> **`setProperty`** — sets OOTB properties of a component (visible, enabled, value, required, label).
> **`setVariable` / `getVariable`** — sets and reads custom properties/variables (not OOTB). Use for any custom data that doesn't map to a built-in property.

---

## OOTB Functions

**Math:** sum, avg, abs, ceil, floor, round, min, max, power, mod, sqrt
**String:** concat, contains, startsWith, endsWith, lower, upper, trim, replace, split, join
**Array:** length, sort, reverse, unique, toArray
**Type:** type, keys, values, toString, toNumber
**Date:** today

---

## Repeatable Panel Population

### Using importData for Form/Panel Population

`globals.functions.importData(data, qualifiedName?)` imports data into the form model. Two signatures:

**1. Form-level import (no qualifiedName):** Imports data into the entire form model.

```javascript
globals.functions.importData({
  customerName: 'John Doe',
  accountType: 'Savings',
});
```

**2. Panel-level import (with qualifiedName):** Imports data into a specific container/repeatable panel. The `qualifiedName` is resolved to find the target panel.

```javascript
var qualifiedName = globals.form.accountDetailsPanel.$qualifiedName;
globals.functions.importData([
  { accountNumber: '1234567890', customerId: 'C001' },
  { accountNumber: '0987654321', customerId: 'C002' },
], qualifiedName);
```

**Feature Toggle:** Requires `FT_FORMS-20002` to be enabled.

| Approach | Use When |
|----------|----------|
| `importData(data)` | Populating multiple form fields at once (form-level) |
| `importData(data, qualifiedName)` | Populating a specific container/repeatable panel |

---

## API Calls in Custom Functions

Discover APIs before writing code:
```bash
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/api-manager" list | grep -i <keyword>
"${CLAUDE_PLUGIN_ROOT}/forms-orchestrator/scripts/api-manager" show <apiName> --json
ls refs/apis/generated/api-clients/<apiName>.js
```

Always use the generated api-client:

```javascript
// CORRECT
import { leadcreationapi } from './api-clients/leadcreationapi.js';

async function handleSubmit(globals) {
  var response = await leadcreationapi({ mobileNo: '9999999999' }, globals);
  if (response.ok) { ... }
}
```

Generated clients are async, return `{ ok, status, body }`, and handle headers/URL internally.
