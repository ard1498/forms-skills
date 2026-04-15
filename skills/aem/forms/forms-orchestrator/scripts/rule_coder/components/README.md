# Form Components Explorer

CLI tool for discovering and visualizing fields, panels, and other components in an AEM form JSON file.

## Usage

```bash
python3 -m rule_coder.components <form.json> [options]
```

## Options

| Flag | Description |
|------|-------------|
| `--tree` | Show hierarchical tree view |
| `--json` | Output as JSON |
| `-s`, `--search <term>` | Search components by name (partial match) |
| `-t`, `--type <fieldType>` | Filter by fieldType (`panel`, `text-input`, `drop-down`, `button`, etc.) |
| `-w`, `--watch` | Watch for file changes and auto-refresh |

## Examples

### Tree view

```bash
python3 -m rule_coder.components repo/content/forms/af/forms-team/fragments/accountselection.form.json --tree
```

### Table view

```bash
python3 -m rule_coder.components repo/content/forms/af/forms-team/fragments/accountselection.form.json
```

### Search for components

```bash
python3 -m rule_coder.components form.json -s "account"
```

### Filter by field type

```bash
python3 -m rule_coder.components form.json -t button
```

### JSON output

```bash
python3 -m rule_coder.components form.json --json | jq '.[].name'
```

### Live reload

```bash
python3 -m rule_coder.components form.json --tree -w
```
