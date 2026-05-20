---
name: manage-apis
description: >
  Use when managing AEM Form Data Model API definitions — discover, add, sync,
  or build OpenAPI 3.0 specs and generated JS clients.
  Triggers: api, apis, endpoint, registry, fdm, form data model, sync APIs,
  build clients, api-manager, api integration, api client, curl to api.
type: skill
license: Apache-2.0
metadata:
  author: Adobe
  version: "0.1"
---

# API Manager Skill

Manages API integrations for AEM Forms using OpenAPI 3.0 specifications and the `api-manager` CLI.

## When to Use

- User wants to discover, list, or inspect available API integrations
- Adding a new API definition (from scratch, from AEM FDM, or from a cURL command)
- Syncing API specs from an AEM Form Data Model instance
- Building/regenerating JavaScript API clients from YAML specs
- Comparing staging vs deployed API clients
- Troubleshooting API integration issues in forms

**Do NOT use for:** Writing custom function logic that calls APIs — use the **forms-rule-creator** skill instead (it covers custom function authoring, the async wrapper pattern, and `globals.functions.request()`).

## Critical Rules

1. **Always use `globals.functions.request()`** — NEVER use `fetch()` directly in AEM Forms
2. **Always `--dry-run` first** — run `build --dry-run` or `sync --dry-run` before actual execution
3. **Staging-then-copy workflow** — generated clients go to `refs/apis/generated/api-clients/` (staging), user manually copies needed clients to `blocks/form/api-clients/` (in `$FORMS_EDS_ROOT`)
4. **Never fabricate API names or endpoints** — always discover via `list` / `show` or sync from AEM
5. **CLI-first** — always use the `api-manager` CLI for all API operations; do not hand-edit generated files

## Tool Commands

| Action | Command |
|--------|---------|
| List all APIs | `api-manager list` |
| List APIs as JSON | `api-manager list --json` |
| Show API details | `api-manager show <name>` |
| Show API as JSON | `api-manager show <name> --json` |
| Build clients (preview) | `api-manager build --dry-run` |
| Build clients | `api-manager build` |
| Add new API | `api-manager add` |
| Sync from AEM (preview) | `api-manager sync --dry-run` |
| Sync from AEM | `api-manager sync` |
| Test for spec changes | `api-manager test` |
| Generate from cURL | `python3 scripts/api_skill.py --curl "<curl-command>" --repo-root "$FORMS_WORKSPACE"` |

### Sync Requirements

The `sync` command requires environment variables `AEM_HOST` and `AEM_TOKEN` to be set (see Environment section).

## Workflow

1. **Discover** — `list` and `show` to inspect existing APIs
2. **Sync or Add** — `sync` from AEM FDM or `add` a new spec manually
3. **Build** — `build --dry-run` first, then `build` to generate JS clients
4. **Compare** — diff staging vs code to see what changed:
   ```
   diff -rq "$FORMS_WORKSPACE/refs/apis/generated/api-clients/" "$FORMS_EDS_ROOT/blocks/form/api-clients/"
   ```
5. **Deploy** — copy needed clients from staging to code directory:
   ```
   cp "$FORMS_WORKSPACE/refs/apis/generated/api-clients/"*.js "$FORMS_EDS_ROOT/blocks/form/api-clients/"
   ```
6. **Wire into form** — use **forms-rule-creator** to create the custom function wrapper (sync-wrapper pattern below), then **forms-content-update** to patch the rule into the form's content model

## OpenAPI YAML Template

Each API is defined as an OpenAPI 3.0 YAML file in `refs/apis/`:

```yaml
openapi: 3.0.3

info:
  title: API Name
  version: 1.0.0
  description: Brief description

x-aem-config:
  source: local                  # 'local' or 'aem-api-integration'
  executeAtClient: true
  encryptionRequired: false
  authType: None
  isOutputAnArray: false
  bodyStructure: requestString   # 'requestString', 'none', 'RequestPayload', or 'requestContext,requestData' for multi-root

paths:
  /api/endpoint.json:
    post:
      operationId: apiName
      summary: API Display Name
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RequestBody'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response'
      x-success-condition: response.body?.status?.responseCode === '0'

components:
  schemas:
    RequestBody:
      type: object
      properties:
        requestString:
          type: object
          required: [mobileNumber]
          properties:
            mobileNumber:
              type: string
    Response:
      type: object
      properties:
        status:
          type: object
          properties:
            responseCode:
              type: string
```

### Key Fields

| Field | Purpose |
|-------|---------|
| `x-aem-config.bodyStructure` | `"requestString"` wraps body in `{ requestString: {...} }`, `"none"` sends flat, `"RequestPayload"` or comma-separated names like `"requestContext,requestData"` for multi-root structures |
| `x-aem-config.source` | `"local"` for manual, `"aem-api-integration"` for synced |
| `x-success-condition` | JS expression to evaluate success from response |
| `operationId` | Becomes the exported function name in generated client |

## Generated Client Pattern

The `build` command generates `async` JavaScript clients like this:

```javascript
// Auto-generated by api-manager - DO NOT EDIT
export async function apiName(params, globals) {
  params = params || {};
  if (params.mobileNumber === undefined || params.mobileNumber === null) {
    throw new Error('apiName: mobileNumber is required');
  }
  return globals.functions.request({
    url: '/api/endpoint.json',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { requestString: { mobileNumber: params.mobileNumber } },
  });
}
```

Response shape: `Promise<{ ok: boolean, status: number, body: object }>`.
Check the generated file header for the `x-success-condition` expression — use it to distinguish application-level success from HTTP success.

## Custom Function Pattern

The rule editor parser **silently ignores `async function` declarations**. Generated clients are `async` and will not appear in the rule editor. Always wrap them in a plain sync exported function.

### Full Pattern

```javascript
import { apiName } from './api-clients';

// async helper — not exported, not registered
async function _callApiName(mobileNumber, globals) {
  var response = await apiName({ mobileNumber }, globals);
  if (response.ok) {
    globals.functions.setProperty(globals.form.resultField, { value: response.body.data });
  } else {
    globals.functions.markFieldAsInvalid(
      globals.form.mobileNumberField.$id,
      'Request failed: ' + response.status,
      { useId: true }
    );
  }
}

// sync exported wrapper — the only declaration the parser registers
/**
 * Fetch data via API Name.
 * @name fetchApiName
 * @param {STRING} mobileNumber - Mobile number
 * @param {SCOPE} globals
 */
function fetchApiName(mobileNumber, globals) {
  _callApiName(mobileNumber, globals).catch(function(err) {
    console.error('[fetchApiName]', err);
  });
}

export { fetchApiName };
```

### JSDoc Rules for the Sync Wrapper

| Constraint | Rule |
|---|---|
| Declaration | `function` only — NOT `async function` (parser silently ignores async) |
| `@name` | Required when exported name differs from declared name |
| `globals` param | Always last; `@param {SCOPE} globals` — parser strips it from args |
| Optional params | Bracket the name: `@param {STRING} [paramName]` |
| Types | `STRING`, `NUMBER`, `BOOLEAN`, `DATE`, `ARRAY`, `OBJECT`, `SCOPE` |

### Fragment vs Form Scope

If the custom function lives in a fragment (`fd:fragment === true`), prefer `globals.$fragment` over `globals.form`:

```javascript
const scope = (globals.field?.fragment && globals.field.fragment !== '$form')
  ? globals.$fragment
  : globals.form;
globals.functions.setProperty(scope.resultField, { value: response.body.data });
```

### Common Mistakes

| Mistake | Fix |
|---|---|
| Exporting `async function` | Parser ignores it — use a plain `function` wrapper |
| Calling `await` in the exported function | Not possible in sync function — push to internal async helper |
| Using `fetch()` | Bypasses AEM's request pipeline — always use `globals.functions.request()` |
| Omitting `.catch()` on the async call | Unhandled rejections silently fail in the rule engine |
| Including `globals` in the rule's params array | Parser strips it automatically |

### Next Steps

After writing the custom function:
1. Use **forms-rule-creator** to generate the rule AST that calls `fetchApiName`
2. Use **forms-content-update** to patch that rule into the form's content model JSON

Do not hand-edit form content model files or custom function files directly.

## File Structure

```
refs/apis/                        # Source of truth (OpenAPI 3.0 YAML)
├── _template.yaml                # Template for new APIs
├── *.yaml                        # Individual API specs
└── generated/
    ├── spec/*.yaml               # Generated OpenAPI specs (from sync)
    ├── api-clients/*.js          # Generated JavaScript clients (staging)
    └── registry.json             # API registry

<eds-repo-root>/blocks/form/api-clients/     # Deployed clients (copied from staging)
└── *.js
```

## Verifying the Setup

```bash
api-manager list          # should exit 0 (empty list is fine)
api-manager build --dry-run   # should exit 0 when specs exist
api-manager show <name>   # should show details for a known API
```

## Environment

Create `.skills-workspace/.env` for AEM sync:

```
AEM_HOST=https://author.aem.example.com
AEM_TOKEN=your-bearer-token
```

Both `AEM_HOST` and `AEM_TOKEN` are required for `sync` operations. Other commands (`list`, `show`, `build`, `add`, `test`) work without them.