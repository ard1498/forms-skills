"""Generator - Generates JavaScript client files from registry using Jinja2.

Generates AEM Forms-compatible async helper functions for API calls.
Uses globals.functions.request() for all HTTP requests.

Features:
- Template-based code generation (Jinja2)
- Support for path, query, header, and body parameters
- Support for different HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Configurable body structure (single wrapper, multi-root, or none)
"""

import json
import re
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape


def _needs_quoting(key: str) -> bool:
    """Check if a JS property key needs quoting (contains non-identifier chars)."""
    return bool(re.search(r"[^a-zA-Z0-9_$]", key)) or (key and key[0].isdigit())


def _js_key(key: str) -> str:
    """Format a string as a JS object property key, quoting if needed."""
    return f"'{key}'" if _needs_quoting(key) else key


def _js_access(key: str) -> str:
    """Format JS property access, using bracket notation if needed.

    Returns the full access pattern including the object reference style:
    - 'name' -> '.name' (dot notation)
    - 'special-name' -> "['special-name']" (bracket notation)

    Usage in template: params{{ p.name | js_access }}
    """
    return f"['{key}']" if _needs_quoting(key) else f".{key}"


def to_js_identifier(name: str) -> str:
    """Convert a string to a valid JavaScript identifier.

    Converts hyphens and other invalid characters to camelCase.
    Examples:
        'aattri-test' -> 'aattriTest'
        'adobe-getssodata' -> 'adobeGetssodata'
        'INTEGRATION' -> 'INTEGRATION'

    Args:
        name: The name to convert

    Returns:
        Valid JavaScript identifier
    """
    if not name:
        return "unnamed"

    # Split by hyphens, underscores, or other non-alphanumeric
    parts = re.split(r"[-_\s]+", name)

    # First part stays as-is
    result = parts[0]

    # Subsequent parts get capitalized (camelCase)
    for part in parts[1:]:
        if part:
            result += part[0].upper() + part[1:]

    # Ensure it doesn't start with a number
    if result and result[0].isdigit():
        result = "_" + result

    # Remove any remaining invalid characters
    result = re.sub(r"[^a-zA-Z0-9_$]", "", result)

    return result or "unnamed"


def _create_env() -> Environment:
    """Create Jinja2 environment with templates and custom filters."""
    templates_dir = Path(__file__).parent / "templates"

    env = Environment(
        loader=FileSystemLoader(templates_dir),
        autoescape=False,  # JS doesn't need HTML escaping
        trim_blocks=True,
        lstrip_blocks=True,
        keep_trailing_newline=True,
    )

    # Add custom filters
    env.filters["js_key"] = _js_key
    env.filters["js_access"] = _js_access

    return env


def _prepare_params(params: dict) -> dict:
    """Prepare params grouped by location.

    Args:
        params: Raw params dict from API config

    Returns:
        Dict with params grouped by location and other metadata
    """
    all_params = []
    path_params = []
    query_params = []
    header_params = []
    body_params = []
    required_params = []

    for name, config in params.items():
        leaf_name = name.split(".")[-1] if "." in name else name
        location = config.get("in", "body")

        param = {
            "name": leaf_name,
            "type": config.get("type", "string"),
            "description": config.get("description", ""),
            "required": config.get("required", False),
            "default": config.get("default"),
            "location": location,
        }

        all_params.append(param)

        if param["required"]:
            required_params.append(param)

        if location == "path":
            path_params.append(param)
        elif location == "query":
            query_params.append(param)
        elif location == "header":
            header_params.append(param)
        else:
            body_params.append(param)

    # Example params for JSDoc (first 2)
    example_params = all_params[:2] if all_params else []

    return {
        "params": all_params,
        "path_params": path_params,
        "query_params": query_params,
        "header_params": header_params,
        "body_params": body_params,
        "required_params": required_params,
        "example_params": example_params,
    }


def _build_body_tree(raw_params: dict) -> dict:
    """Build a nested tree from dotted body-param apiKeys.

    Given params like:
      {"RequestPayload.userAgent": ..., "RequestPayload.journeyInfo.journeyID": ...}
    Returns:
      {"RequestPayload": {"userAgent": {"_leaf": {...}}, "journeyInfo": {"journeyID": {"_leaf": {...}}}}}
    """
    tree: dict = {}
    for key, config in raw_params.items():
        if config.get("in", "body") != "body":
            continue
        parts = key.split(".")
        current = tree
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                current[part] = {"_leaf": {
                    "name": part,
                    "default": config.get("default"),
                }}
            else:
                if part not in current:
                    current[part] = {}
                node = current[part]
                if "_leaf" in node:
                    node.pop("_leaf")
                current = node
    return tree


def _render_body_lines(tree: dict, indent: int = 4) -> list[str]:
    """Recursively render a body tree as indented JS object lines."""
    lines: list[str] = []
    pad = " " * indent
    for key, value in tree.items():
        if "_leaf" in value:
            leaf = value["_leaf"]
            line = f"{pad}{_js_key(leaf['name'])}: params{_js_access(leaf['name'])}"
            if leaf.get("default") is not None:
                line += f" ?? {json.dumps(leaf['default'])}"
            line += ","
            lines.append(line)
        else:
            lines.append(f"{pad}{_js_key(key)}: {{")
            lines.extend(_render_body_lines(value, indent + 2))
            lines.append(f"{pad}}},")
    return lines


def generate_client_file(api_key: str, api_config: dict, env: Environment = None) -> str:
    """Generate JavaScript client file content for an API.

    Args:
        api_key: API identifier (used as function name)
        api_config: API configuration dict
        env: Optional Jinja2 environment (created if not provided)

    Returns:
        JavaScript file content
    """
    if env is None:
        env = _create_env()

    template = env.get_template("api-client.js.j2")

    raw_params = api_config.get("params", {})
    param_groups = _prepare_params(raw_params)

    body_structure = api_config.get("bodyStructure", "none")

    # Build the body object lines from the full dotted param keys
    if body_structure and body_structure != "none":
        body_tree = _build_body_tree(raw_params)
        body_lines = _render_body_lines(body_tree, indent=4)
    elif param_groups["body_params"]:
        # Flat body — render params directly
        body_lines = []
        for p in param_groups["body_params"]:
            line = f"    {_js_key(p['name'])}: params{_js_access(p['name'])}"
            if p.get("default") is not None:
                line += f" ?? {json.dumps(p['default'])}"
            line += ","
            body_lines.append(line)
    else:
        body_lines = []

    context = {
        "api_key": api_key,
        "function_name": to_js_identifier(api_key),
        "name": api_config.get("name", api_key),
        "description": api_config.get("description", f"{api_key} API"),
        "endpoint": api_config.get("endpoint", ""),
        "method": api_config.get("method", "POST").upper(),
        "body_lines": body_lines,
        "success_condition": api_config.get("successCondition"),
        **param_groups,
    }

    return template.render(**context)


def generate_index_file(api_keys: list[str], env: Environment = None) -> str:
    """Generate index.js that re-exports all APIs.

    Args:
        api_keys: List of API identifiers (file keys, may contain hyphens)
        env: Optional Jinja2 environment (created if not provided)

    Returns:
        JavaScript index file content
    """
    if env is None:
        env = _create_env()

    template = env.get_template("index.js.j2")

    apis = [
        {"key": key, "function_name": to_js_identifier(key)}
        for key in sorted(api_keys)
    ]

    return template.render(apis=apis)


def generate_all_clients(registry: dict, output_dir: Path) -> dict:
    """Generate all client files from registry.

    Args:
        registry: API registry dict
        output_dir: Directory to write JS files to (api-clients/)

    Returns:
        Stats dict with counts
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    env = _create_env()
    api_keys = []
    errors = []

    for api_key, api_config in registry.items():
        try:
            content = generate_client_file(api_key, api_config, env)
            filepath = output_dir / f"{api_key}.js"
            filepath.write_text(content, encoding="utf-8")
            api_keys.append(api_key)
        except Exception as e:
            errors.append(f"{api_key}: {e}")

    # Generate index.js in api-clients folder
    index_content = generate_index_file(api_keys, env)
    index_path = output_dir / "index.js"
    index_path.write_text(index_content, encoding="utf-8")

    return {
        "files_generated": len(api_keys),
        "index_generated": True,
        "errors": errors,
    }
