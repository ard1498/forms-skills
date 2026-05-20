# Field Type → fieldType Reference

Maps user natural language to the AEM `fieldType` value. The exact `componentType` is resolved
from the live definition by `resolve-component-type.bundle.js` — it is **not** hard-coded here.

**How to use this table:**
1. Match user intent against the "User Says" column (keyword match — any phrase in the list qualifies)
2. Take the `fieldType` value and optional `hint`
3. Pass both to `resolve-component-type` to get the exact `componentType` from the definition

---

## Field Types

| User Says | fieldType | hint | Notes |
|---|---|---|---|
| text, name, first name, last name, input, short text, string | `text-input` | — | Default for any free-text single-line input |
| phone, mobile, telephone, cell, contact number | `tel` | — | |
| email, email address, e-mail | `email` | — | |
| number, amount, count, age, quantity, price, rate, salary | `number-input` | — | |
| date, DOB, date of birth, expiry, expiry date, calendar | `date-input` | — | |
| date and time, datetime, timestamp, appointment | `datetime-input` | — | |
| dropdown, select, picker, choose one, list | `drop-down` | — | |
| radio, radio button, single choice, one of, option group | `radio-group` | — | |
| checkbox group, multi-select, multiple choice, tick all that apply | `checkbox-group` | — | |
| checkbox, agree, accept, yes/no, single tick, terms | `checkbox` | `checkbox` | Use hint to distinguish from switch |
| switch, toggle, on/off, enable/disable | `checkbox` | `switch` | Same fieldType as checkbox — hint picks the switch component |
| file, upload, attachment, document, PDF upload, image upload | `file-input` | — | |
| submit, submit button, send, confirm, done | `button` | `submit` | |
| reset, clear, start over, reset button | `button` | `reset` | |
| button, action button, generic button, click | `button` | `button` | |
| title, heading, section heading, h1, h2, h3 | `plain-text` | `title` | |
| text block, paragraph, description text, static text, body text | `plain-text` | `text` | |
| image, photo, picture, graphic, logo | `image` | — | |
| section, panel, group, container, step | `panel` | — | panelcontainer |
| accordion, collapsible section | `panel` | `accordion` | |
| wizard layout, wizard | `panel` | `wizard` | Wizard wrapper — appears once, wraps panelcontainer steps |
| wizard step | `panel` | — | Individual wizard step — use panelcontainer inside the wizard wrapper |
| tabs, tab panel, tabbed section | `panel` | `tabsontop` | |
| fragment, reusable section, embedded form | `panel` | `fragment` | |

---

## Ambiguous fieldTypes — When a Hint is Required

Some fieldTypes map to multiple componentTypes in the definition. The `hint` column above drives
`resolve-component-type` to pick the right one deterministically.

| fieldType | Without hint (prefix-preference rule picks) | With hint |
|---|---|---|
| `button` | `.../form/button` (generic) | `submit` → `.../form/actions/submit` · `reset` → `.../form/actions/reset` |
| `checkbox` | `.../form/checkbox` | `switch` → `.../form/switch` |
| `plain-text` | `.../form/text` (alphabetical) | `title` → `.../form/title` · `text` → `.../form/text` |
| `text-input` | `.../form/textinput` (prefix-preference) | — |
| `file-input` | `.../form/fileinput` (prefix-preference) | — |

---

## Panels

`panelcontainer`, `accordion`, `wizard`, `tabsontop`, and `fragment` use `fieldType: "panel"`.
The definition exposes `./fieldType` as a required hidden select with `"panel"` as the only option —
`resolve-component-type` handles them the same way as any other component.

> **Wizard structure:** the `wizard` component is the navigation wrapper (step tabs, progress bar, next/back buttons) and appears **once**. Each individual step is a `panelcontainer` nested inside it.
>
> ```
> guideContainer (form)
>   └── wizard                  ← ONE wizard wrapper
>         ├── panelcontainer    ← step 1
>         ├── panelcontainer    ← step 2
>         └── panelcontainer    ← step 3
> ```
