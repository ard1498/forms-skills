---
name: manage-apis
description: >
  Manages AEM Form Data Model API definitions using the api-manager CLI tool.
  Discovers, adds, syncs, and builds OpenAPI 3.0 specs into generated JS clients.
  Use when discovering, adding, syncing, or building API definitions and generated clients.
  Triggers: api, apis, endpoint, registry, fdm, form data model, sync APIs, build clients,
  api-manager, api integration, api client, curl to api.
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

**Do NOT use for:** Writing custom function logic that calls APIs — use the **create-function** skill instead (it covers the async wrapper + `globals.functions.request()` pattern).

## Critical Rules

1. **Always use `globals.functions.request()`** — NEVER use `fetch()` directly in AEM Forms
2. **Always `--dry-run` first** — run `build --dry-run` or `sync --dry-run` before actual execution
3. **Staging-then-copy workflow** — generated clients go to `refs/apis/api-clients/` (staging), user manually copies needed clients to `code/blocks/form/api-clients/`
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
| Generate from cURL | `api-skill <curl-command>` |

### Sync Requirements

The `sync` command requires environment variables `AEM_HOST` and `AEM_TOKEN` to be set (see Environment section).

## Workflow

1. **Discover** — `list` and `show` to inspect existing APIs
2. **Sync or Add** — `sync` from AEM FDM or `add` a new spec manually
3. **Build** — `build --dry-run` first, then `build` to generate JS clients
4. **Compare** — diff staging vs code to see what changed:
   ```
   diff -rq refs/apis/api-clients/ code/blocks/form/api-clients/
   ```
5. **Deploy** — copy needed clients from staging to code directory

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

The `build` command generates JavaScript clients like this:

```javascript
/**
 * API Name - Brief description
 * @param {Object} params
 * @param {string} params.mobileNumber - Customer mobile number [required]
 * @param {Object} globals - AEM Forms globals object
 * @returns {Promise<Object>} API response
 */
export async function apiName(params, globals) {
  if (params.mobileNumber === undefined || params.mobileNumber === null) {
    throw new Error('Required parameter "mobileNumber" is missing');
  }
  const response = await globals.functions.request({
    url: '/api/endpoint.json',
    method: 'POST',
    contentType: 'application/json',
    body: { requestString: { mobileNumber: params.mobileNumber } }
  });
  return response;
}
```

## Using APIs in Custom Functions

Import the generated client and call it from a sync exported wrapper:

```javascript
import { apiName } from './api-clients';

// Internal async helper
async function callApi(mobileNumber, globals) {
  const response = await apiName({ mobileNumber }, globals);
  if (response.body?.status?.responseCode === '0') {
    globals.functions.setProperty(globals.form.result, { value: response.body.data });
  }
}

// Exported sync wrapper (required for rule editor visibility)
/**
 * @name fetchData Fetch Data
 * @param {string} mobileNumber - Mobile number
 * @param {scope} globals - Globals object
 */
function fetchData(mobileNumber, globals) {
  callApi(mobileNumber, globals).catch(function(err) { console.error(err); });
}

export { fetchData };
```

**Note:** Generated api-clients are `async` functions — they won't appear in the visual rule editor directly. Always create a sync wrapper (see **create-function** skill for the full pattern).

## File Structure

```
refs/apis/                        # Source of truth (OpenAPI 3.0 YAML)
├── _template.yaml                # Template for new APIs
├── *.yaml                        # Individual API specs
└── generated/
    ├── spec/*.yaml               # Generated OpenAPI specs (from sync)
    ├── api-clients/*.js          # Generated JavaScript clients (staging)
    └── registry.json             # API registry

code/blocks/form/api-clients/     # Deployed clients (copied from staging)
└── *.js
```

## Environment

Create `.env` in project root for AEM sync:

```
AEM_HOST=https://author.aem.example.com
AEM_TOKEN=your-bearer-token
```

Both `AEM_HOST` and `AEM_TOKEN` are required for `sync` operations. Other commands (`list`, `show`, `build`, `add`, `test`) work without them.