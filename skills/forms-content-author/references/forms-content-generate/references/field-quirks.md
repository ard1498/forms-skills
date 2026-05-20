# Field-Specific Quirks

AEM-specific property rules that apply regardless of what the definition schema says.

## telephoneinput

- `pattern`: HTML input pattern — regex without delimiters, anchored to full value
  - 10-digit Indian mobile: `"[6-9][0-9]{9}"`
  - Any 10-digit: `"[0-9]{10}"`
  - International with +: `"\\+?[0-9]{7,15}"`
  - Omit if no format constraint needed

## numberinput

- `type`: `"integer"` for counts/ages (whole numbers only), `"number"` for amounts/rates (decimals allowed)

## datepicker

- `displayFormat`: CLDR date skeleton — valid symbols only (parser rejects others):

| Symbol | Meaning | Examples |
|---|---|---|
| `y` | Year (NOT `Y`) | `y`=2024, `yy`=24, `yyyy`=2024 |
| `M` or `L` | Month | `M`=1, `MM`=01, `MMM`=Jan, `MMMM`=January |
| `d` | Day of month (NOT `D`) | `d`=5, `dd`=05 |
| `E` | Day of week | `E`=Mon, `EEEE`=Monday |
| Separators | `/` `-` `.` `,` space | |

Shorthand values: `"full"` `"long"` `"medium"` `"short"` · Empty string `""` = runtime default

Common patterns: `"d/M/y"` `"dd/MM/yyyy"` `"yyyy-MM-dd"` `"d MMMM, y"` `"short"`

Common mistakes: `YYYY` → use `y`; `D` → use `d`; `hh:mm` alone → rejected

## dropdown / radiobutton / checkboxgroup

- `enum` = submitted/stored value (e.g. `"IN"`, `"M"`) — regular array property, NOT child items
- `enumNames` = label shown to user (e.g. `"India"`, `"Male"`) — must pair 1:1 with `enum`
- Pairing and shape are validator-enforced
- `checkboxgroup` type: `"string[]"` `"boolean[]"` or `"number[]"`

## checkbox

- Follow definition for `checkedValue`, `uncheckedValue`, `enableUncheckedValue`
- `uncheckedValue` is validator-enforced as conditional

## switch

- Own componentType (`form/switch`) — never `checkbox + fd:viewType`
- `fieldType` is `"checkbox"` (same as checkbox)

## fileinput

- `accept`: array of MIME types — NOT file extensions, NOT comma-separated string
  - `accept` has no definition entry — derive from user intent
  - PDFs: `["application/pdf"]` · Images: `["image/jpeg","image/png","image/gif"]`
  - PDFs + images: `["image/jpeg","application/pdf","image/png"]` · Any: omit entirely

## panelcontainer

- `fieldType`: always `"panel"` — the only allowed value; set from the definition's required select (applies to panelcontainer, accordion, wizard, tabsontop, fragment)
- `layout`: `"simple"` (single-column, default) · `"responsiveGrid"` (multi-column, use for side-by-side) · `""` falls back to `"simple"` — prefer explicit
- Always include `"items": []` (empty) or `"items": [...]` (pre-populated children)
