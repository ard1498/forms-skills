"""Markdown Writer - Writes API config to markdown format."""

import re
from typing import Any


def write_api_to_markdown(api_config: dict) -> str:
    """Convert API config to markdown string.

    Args:
        api_config: API configuration object

    Returns:
        Markdown content
    """
    lines = []

    # Title and description
    lines.append(f"# {api_config.get('name', 'Unknown API')}")
    lines.append("")
    lines.append(api_config.get("description", "API description"))
    lines.append("")

    # Endpoint section
    lines.append("## Endpoint")
    lines.append("")
    lines.append("| Property | Value |")
    lines.append("|----------|-------|")
    lines.append(f"| URL | `{api_config.get('endpoint', '/api/endpoint')}` |")
    lines.append(f"| Method | `{api_config.get('method', 'POST')}` |")
    if api_config.get("contentType"):
        lines.append(f"| Content-Type | `{api_config['contentType']}` |")
    lines.append("")

    # Execution Info section (for API integrations)
    lines.append("## Execution Info")
    lines.append("")
    lines.append("| Property | Value |")
    lines.append("|----------|-------|")
    # Source - distinguishes AEM-synced APIs from local ones
    source = api_config.get("source", "local")
    lines.append(f"| Source | {source} |")
    if api_config.get("executeAtClient") is not None:
        lines.append(
            f"| Execute at Client | {'Yes' if api_config['executeAtClient'] else 'No'} |"
        )
    if api_config.get("encryptionRequired") is not None:
        lines.append(
            f"| Encryption Required | {'Yes' if api_config['encryptionRequired'] else 'No'} |"
        )
    if api_config.get("authType"):
        lines.append(f"| Authentication | {api_config['authType']} |")
    if api_config.get("isOutputAnArray") is not None:
        lines.append(
            f"| Response is Array | {'Yes' if api_config['isOutputAnArray'] else 'No'} |"
        )
    lines.append("")

    # Request Parameters section
    params = api_config.get("params", {})
    if params:
        lines.append("## Request Parameters")
        lines.append("")
        lines.append(
            "Parameters use flat names for SDK DX. The SDK wraps body params into the appropriate structure internally."
        )
        lines.append("")
        lines.append("| Parameter | Type | Required | Default | Location | Description |")
        lines.append("|-----------|------|----------|---------|----------|-------------|")

        for name, config in params.items():
            flat_name = name.split(".")[-1] if "." in name else name
            required = "Yes" if config.get("required") else "No"
            default_val = config.get("default") if config.get("default") is not None else "-"
            location = config.get("in", "body")
            description = config.get("description", "")
            lines.append(
                f"| `{flat_name}` | {config.get('type', 'string')} | {required} | {default_val} | {location} | {description} |"
            )
        lines.append("")

    # Response Fields section
    response = api_config.get("response", {})
    if response:
        lines.append("## Response Fields")
        lines.append("")
        lines.append("| Field | Type | Description |")
        lines.append("|-------|------|-------------|")

        for name, config in response.items():
            lines.append(
                f"| `{name}` | {config.get('type', 'string')} | {config.get('description', '')} |"
            )
        lines.append("")

    # Success Condition section
    if api_config.get("successCondition"):
        lines.append("## Success Condition")
        lines.append("")
        lines.append(f"`{api_config['successCondition']}`")
        lines.append("")

    # Notes section
    if api_config.get("notes"):
        lines.append("## Notes")
        lines.append("")
        notes = api_config["notes"]
        if not isinstance(notes, list):
            notes = [notes]
        for note in notes:
            lines.append(f"- {note}")
        lines.append("")

    # FDM Source (if synced from AEM)
    if api_config.get("fdmName"):
        lines.append("<!-- ")
        lines.append(f"FDM Source: {api_config['fdmName']}")
        lines.append("Synced from AEM FDM")
        lines.append("-->")
        lines.append("")

    return "\n".join(lines)


def generate_filename(api_name: str) -> str:
    """Generate filename from API name.

    Args:
        api_name: API name

    Returns:
        Filename (without path)
    """
    # Lowercase for filesystem compatibility (macOS is case-insensitive)
    # Replace spaces and special chars with hyphens
    filename = re.sub(r"[^a-z0-9]+", "-", api_name.lower())
    filename = filename.strip("-")
    return f"{filename}.md"


def generate_index(apis: list[dict], sync_stats: dict = None) -> str:
    """Generate _index.md content with current API statistics.

    Args:
        apis: List of API configurations
        sync_stats: Optional sync statistics dict

    Returns:
        Markdown content for _index.md
    """
    from datetime import datetime

    total = len(apis)
    post_count = sum(1 for a in apis if a.get("method", "POST").upper() == "POST")
    get_count = sum(1 for a in apis if a.get("method", "").upper() == "GET")
    encrypted_count = sum(1 for a in apis if a.get("encryptionRequired"))
    client_side_count = sum(1 for a in apis if a.get("executeAtClient"))

    lines = [
        "# API Reference Documentation",
        "",
        f"This directory contains **{total} API definitions** auto-synced from AEM Form Data Model (FDM).",
        "",
        f"*Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}*",
        "",
        "## Source of Truth",
        "",
        "```",
        "AEM FDM ──[sync]──> Markdown files ──[generate]──> api-clients/*.js",
        "```",
        "",
        "- **Primary Source**: AEM Form Data Model (`/conf/forms/settings/cloudconfigs/fdm`)",
        "- **Local Format**: Markdown files in this directory",
        "- **Generated Clients**: `code/blocks/form/api-clients/*.js` (typed async functions)",
        "",
        "## Quick Start",
        "",
        "```bash",
        "# List all APIs",
        "api-manager list",
        "",
        "# Search for specific API",
        "api-manager list | grep -i otp",
        "",
        "# Show API details",
        "api-manager show customerIdentification",
        "",
        "# Show as JSON",
        "api-manager show customerIdentification --json",
        "```",
        "",
        "## Management Commands",
        "",
        "| Command | Description |",
        "|---------|-------------|",
        "| `api-manager sync` | Fetch latest from AEM FDM |",
        "| `api-manager build` | Regenerate registry.json |",
        "| `api-manager test` | Check for API changes |",
        "| `api-manager add` | Add new API interactively |",
        "",
        "## API Statistics",
        "",
        "| Metric | Count |",
        "|--------|-------|",
        f"| Total APIs | {total} |",
        f"| POST methods | {post_count} |",
        f"| GET methods | {get_count} |",
        f"| Encrypted APIs | {encrypted_count} |",
        f"| Client-side APIs | {client_side_count} |",
        "",
        "## Using APIs in Custom Functions",
        "",
        "**Using generated api-clients (recommended):**",
        "```javascript",
        "import { customerIdentification } from './api-clients';",
        "",
        "// Pass flat params - SDK wraps into the correct body structure internally",
        "const response = await customerIdentification({",
        "  mobileNumber: '9876543210',",
        "  dateOfBirth: '01/01/1990'",
        "}, globals);",
        "",
        "if (response.ok && response.body?.status?.responseCode === '0') {",
        "  console.log(response.body);  // API response",
        "} else {",
        "  console.error('Error:', response.status, response.body);",
        "}",
        "```",
        "",
        "**Using globals.functions.request() directly:**",
        "```javascript",
        "// For cases where you need direct control",
        "const response = await globals.functions.request({",
        "  url: '/api/customerIdentification',",
        "  method: 'POST',",
        "  body: { mobileNumber: '9876543210' }",
        "});",
        "```",
        "",
        "## Sync Workflow",
        "",
        "```bash",
        "# Check for changes",
        "api-manager sync --dry-run",
        "",
        "# Apply changes",
        "api-manager sync",
        "",
        "# Rebuild registry and run tests",
        "api-manager build",
        "",
        "# If tests fail and changes are intentional",
        "api-manager test --update",
        "```",
        "",
        "## Notes",
        "",
        "- APIs are synced from AEM FDM type `api-integration`",
        "- This file is auto-generated by `api-manager sync`",
        "- Do not edit manually - changes will be overwritten",
        "",
    ]

    return "\n".join(lines)
