# Adobe Skills for AI Coding Agents

Repository of Adobe AEM Forms skills for AI coding agents.

## Installation

### Claude Code Plugins

```bash
/plugin install github:adobe/forms-skills
```

## Available Skills

### AEM Forms

Turn natural language into production AEM Adaptive Forms. A plan-driven skill gateway across 6 domains.

**Quick Start:**
```bash
# Say: "Set up a new AEM Forms workspace for my project."
# Then: "Here's the requirements doc for my form. Build it."
```

The **forms-orchestrator** routes intents through a 6-step algorithm — it generates plans from requirements via a Planner, resolves skills via a Domain Registry, and executes them. For single tasks it routes directly to the matching domain.

#### Domains

| Domain | Skills |
|--------|--------|
| `analysis` | `analyze-requirements`, `analyze-v1-form`, `create-screen-doc`, `jud-to-screen` |
| `content-author` | `forms-custom-components` (+ `forms-content-update`, `forms-content-generate` internally) |
| `rule-creator` | `forms-rule-creator` |
| `integration` | `manage-apis` |
| `infra` | `setup-workspace` |
| `context-management` | `manage-context` |

**Requirements:** Node.js 18+, `git` on PATH.

## Repository Structure

```
forms-skills/
├── .claude-plugin/plugin.json          ← plugin identity (aem-forms)
├── evals/                              ← eval scenarios, fixtures, runner scripts
├── skills/
│   ├── forms-orchestrator/             ← entry point router
│   ├── forms-analysis/                 ← analysis domain
│   ├── forms-content-author/           ← content authoring domain
│   │   ├── forms-content-update/       ← MCP-based form authoring (internal sub-skill)
│   │   ├── forms-content-generate/     ← component payload builder (internal sub-skill)
│   │   └── references/
│   │       └── forms-custom-components/
│   ├── forms-rule-creator/             ← rule & custom function authoring
│   ├── forms-infra/                    ← infra domain
│   ├── forms-integration/              ← integration domain
│   ├── forms-context-management/       ← context & session domain
│   └── forms-shared/                   ← shared scripts (api-manager, etc.)
└── README.md
```

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines on adding or updating skills. Join [#agentskills](https://adobe.enterprise.slack.com/archives/C0APTKDNPEY) on Adobe Slack for questions and discussion.

## Resources

- [agentskills.io Specification](https://agentskills.io)
- [Claude Code Plugins](https://code.claude.com/docs/en/discover-plugins)
- [#agentskills Slack Channel](https://adobe.enterprise.slack.com/archives/C0APTKDNPEY)

## License

Apache 2.0 - see [LICENSE](LICENSE) for details.
