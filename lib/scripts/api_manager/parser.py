"""Parser - Parses markdown API docs to build registry."""

import json
import re
from pathlib import Path
from typing import Any, Optional

from .config import get_project_paths
from .exceptions import ParseError


def parse_markdown_file(filepath: Path) -> Optional[dict]:
    """Parse a markdown API documentation file.

    Args:
        filepath: Path to markdown file

    Returns:
        API configuration dict or None if parsing fails
    """
    content = filepath.read_text(encoding="utf-8")
    lines = content.split("\n")

    api_config: dict[str, Any] = {
        "params": {},
        "response": {},
    }

    current_section = None
    table_headers: list[str] = []

    for line in lines:
        line = line.strip()

        # Parse title (# name)
        if line.startswith("# "):
            api_config["name"] = line[2:].strip()
            continue

        # Parse section headers (## section)
        if line.startswith("## "):
            current_section = line[3:].strip().lower()
            table_headers = []
            continue

        # Skip empty lines and horizontal rules
        if not line or line.startswith("---"):
            continue

        # Parse table rows
        if line.startswith("|"):
            cells = [c.strip() for c in line.split("|")[1:-1]]

            # Check if this is a header row
            if all(set(c) <= set("-:") for c in cells):
                continue  # Skip separator row

            # Check if this might be a header row (first row of table)
            if not table_headers:
                table_headers = [c.lower() for c in cells]
                continue

            # Parse data row based on section
            if current_section == "endpoint":
                _parse_endpoint_row(cells, api_config)
            elif current_section == "execution info":
                _parse_execution_info_row(cells, api_config)
            elif current_section == "request parameters":
                _parse_param_row(cells, table_headers, api_config)
            elif current_section == "response fields":
                _parse_response_row(cells, table_headers, api_config)

        # Parse success condition (code block or inline code)
        if current_section == "success condition":
            match = re.search(r"`([^`]+)`", line)
            if match:
                api_config["successCondition"] = match.group(1)

        # Parse notes (bullet points)
        if current_section == "notes" and line.startswith("-"):
            if "notes" not in api_config:
                api_config["notes"] = []
            api_config["notes"].append(line[1:].strip())

    # Validate required fields
    if not api_config.get("name"):
        return None

    return api_config


def _parse_endpoint_row(cells: list[str], api_config: dict) -> None:
    """Parse endpoint table row."""
    if len(cells) < 2:
        return

    prop = cells[0].lower()
    value = _extract_code(cells[1])

    if prop == "url":
        api_config["endpoint"] = value
    elif prop == "method":
        api_config["method"] = value
    elif prop == "content-type":
        api_config["contentType"] = value
    elif prop == "body structure":
        api_config["bodyStructure"] = value


def _parse_execution_info_row(cells: list[str], api_config: dict) -> None:
    """Parse execution info table row."""
    if len(cells) < 2:
        return

    prop = cells[0].lower()
    value = cells[1].strip()

    if prop == "source":
        api_config["source"] = value
    elif prop == "execute at client":
        api_config["executeAtClient"] = value.lower() == "yes"
    elif prop == "encryption required":
        api_config["encryptionRequired"] = value.lower() == "yes"
    elif prop == "authentication":
        api_config["authType"] = value
    elif prop == "response is array":
        api_config["isOutputAnArray"] = value.lower() == "yes"


def _parse_param_row(cells: list[str], headers: list[str], api_config: dict) -> None:
    """Parse parameter table row."""
    if len(cells) < 2:
        return

    # Create mapping from header index to cell value
    row_data = {}
    for i, header in enumerate(headers):
        if i < len(cells):
            row_data[header] = cells[i]

    # Extract parameter name
    param_name = _extract_code(row_data.get("parameter", ""))
    if not param_name or param_name.lower() == "field":
        return

    param_config: dict[str, Any] = {}

    # Type
    if "type" in row_data:
        param_config["type"] = row_data["type"].strip()

    # Required
    if "required" in row_data:
        param_config["required"] = row_data["required"].strip().lower() == "yes"

    # Default
    if "default" in row_data:
        default_val = row_data["default"].strip()
        if default_val and default_val != "-":
            param_config["default"] = default_val

    # Location (in)
    if "location" in row_data:
        param_config["in"] = row_data["location"].strip()

    # Description
    if "description" in row_data:
        param_config["description"] = row_data["description"].strip()

    api_config["params"][param_name] = param_config


def _parse_response_row(cells: list[str], headers: list[str], api_config: dict) -> None:
    """Parse response field table row."""
    if len(cells) < 2:
        return

    # Create mapping from header index to cell value
    row_data = {}
    for i, header in enumerate(headers):
        if i < len(cells):
            row_data[header] = cells[i]

    # Extract field name
    field_name = _extract_code(row_data.get("field", ""))
    if not field_name or field_name.lower() == "field":
        return

    field_config: dict[str, Any] = {}

    # Type
    if "type" in row_data:
        field_config["type"] = row_data["type"].strip()

    # Description
    if "description" in row_data:
        field_config["description"] = row_data["description"].strip()

    api_config["response"][field_name] = field_config


def _extract_code(text: str) -> str:
    """Extract text from inline code blocks."""
    match = re.search(r"`([^`]+)`", text)
    return match.group(1) if match else text.strip()


def build_registry() -> dict[str, dict]:
    """Build registry from all markdown files in refs/apis/.

    Returns:
        Registry dict mapping API names to configurations
    """
    refs_dir, api_stubs_dir = get_project_paths()

    if not refs_dir.exists():
        print(f"Warning: refs/apis directory not found: {refs_dir}")
        return {}

    registry: dict[str, dict] = {}

    # Find all markdown files (excluding template)
    md_files = sorted(refs_dir.glob("*.md"))

    for md_file in md_files:
        # Skip template and hidden files
        if md_file.name.startswith("_") or md_file.name.startswith("."):
            continue

        try:
            api_config = parse_markdown_file(md_file)
            if api_config and api_config.get("name"):
                # Use filename (without .md) as registry key
                key = md_file.stem
                registry[key] = api_config
        except Exception as e:
            print(f"  Warning: Failed to parse {md_file.name}: {e}")

    return registry


def save_registry(registry: dict[str, dict]) -> Path:
    """Save registry to JSON file.

    Args:
        registry: Registry dict

    Returns:
        Path to saved file
    """
    refs_dir, api_stubs_dir = get_project_paths()
    registry_path = api_stubs_dir / "registry.json"

    # Ensure directory exists
    api_stubs_dir.mkdir(parents=True, exist_ok=True)

    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    return registry_path


def load_registry() -> dict[str, dict]:
    """Load registry from JSON file.

    Returns:
        Registry dict
    """
    refs_dir, api_stubs_dir = get_project_paths()
    registry_path = api_stubs_dir / "registry.json"

    if not registry_path.exists():
        return {}

    with open(registry_path, "r", encoding="utf-8") as f:
        return json.load(f)
