"""OpenAPI Parser - Parses OpenAPI 3.0 YAML files to build registry."""

import json
from pathlib import Path
from typing import Any, Optional

import yaml

from .config import get_project_paths


def parse_openapi_file(filepath: Path) -> Optional[dict]:
    """Parse an OpenAPI 3.0 YAML file.

    Args:
        filepath: Path to YAML file

    Returns:
        API configuration dict or None if parsing fails
    """
    try:
        content = filepath.read_text(encoding="utf-8")
        doc = yaml.safe_load(content)
    except Exception as e:
        print(f"  Warning: Failed to parse YAML {filepath.name}: {e}")
        return None

    if not doc or not isinstance(doc, dict):
        return None

    # Extract info
    info = doc.get("info", {})
    api_config: dict[str, Any] = {
        "name": info.get("title", filepath.stem),
        "description": info.get("description", ""),
        "params": {},
        "response": {},
    }

    # Extract AEM config
    aem_config = doc.get("x-aem-config", {})
    if aem_config:
        api_config["source"] = aem_config.get("source", "local")
        api_config["executeAtClient"] = aem_config.get("executeAtClient", True)
        api_config["encryptionRequired"] = aem_config.get("encryptionRequired", False)
        api_config["authType"] = aem_config.get("authType", "None")
        api_config["isOutputAnArray"] = aem_config.get("isOutputAnArray", False)
        api_config["bodyStructure"] = aem_config.get("bodyStructure", "requestString")
        if aem_config.get("fdmName"):
            api_config["fdmName"] = aem_config["fdmName"]

    # Extract path and method
    paths = doc.get("paths", {})
    for endpoint, methods in paths.items():
        api_config["endpoint"] = endpoint

        for method, operation in methods.items():
            if method in ["get", "post", "put", "delete", "patch"]:
                api_config["method"] = method.upper()

                # Extract success condition
                if operation.get("x-success-condition"):
                    api_config["successCondition"] = operation["x-success-condition"]

                # Extract path/query/header parameters from parameters section
                parameters = operation.get("parameters", [])
                for param in parameters:
                    param_name = param.get("name")
                    if param_name:
                        param_schema = param.get("schema", {})
                        api_config["params"][param_name] = {
                            "type": param_schema.get("type", "string"),
                            "description": param.get("description", ""),
                            "in": param.get("in", "query"),
                            "required": param.get("required", False),
                        }
                        if "default" in param_schema:
                            api_config["params"][param_name]["default"] = param_schema["default"]

                # Extract request body params
                request_body = operation.get("requestBody", {})
                content = request_body.get("content", {})
                json_content = content.get("application/json", {})
                schema = json_content.get("schema", {})

                # Handle $ref to components
                if "$ref" in schema:
                    ref_path = schema["$ref"]
                    schema = _resolve_ref(doc, ref_path)

                # Extract params from requestString
                if schema:
                    _extract_params_from_schema(schema, api_config)

                # Extract response fields
                responses = operation.get("responses", {})
                success_response = responses.get("200", {})
                resp_content = success_response.get("content", {})
                resp_json = resp_content.get("application/json", {})
                resp_schema = resp_json.get("schema", {})

                if "$ref" in resp_schema:
                    ref_path = resp_schema["$ref"]
                    resp_schema = _resolve_ref(doc, ref_path)

                if resp_schema:
                    _extract_response_from_schema(resp_schema, api_config)

                break  # Only process first method
        break  # Only process first path

    return api_config


def _resolve_ref(doc: dict, ref: str) -> dict:
    """Resolve a $ref pointer in the document."""
    if not ref.startswith("#/"):
        return {}

    parts = ref[2:].split("/")
    result = doc
    for part in parts:
        if isinstance(result, dict) and part in result:
            result = result[part]
        else:
            return {}

    return result if isinstance(result, dict) else {}


def _extract_params_from_schema(schema: dict, api_config: dict) -> None:
    """Extract parameters from request body schema."""
    properties = schema.get("properties", {})

    # Check for requestString wrapper
    if "requestString" in properties:
        request_string = properties["requestString"]
        inner_props = request_string.get("properties", {})
        # OpenAPI spec: required is at schema level, not on each property
        required_fields = set(request_string.get("required", []))
        for param_name, param_schema in inner_props.items():
            api_config["params"][param_name] = {
                "type": param_schema.get("type", "string"),
                "description": param_schema.get("description", ""),
                "in": "body",
            }
            if "default" in param_schema:
                api_config["params"][param_name]["default"] = param_schema["default"]
            # Check required array at schema level (OpenAPI standard)
            if param_name in required_fields:
                api_config["params"][param_name]["required"] = True
    else:
        # Direct properties without wrapper
        required_fields = set(schema.get("required", []))
        for param_name, param_schema in properties.items():
            api_config["params"][param_name] = {
                "type": param_schema.get("type", "string"),
                "description": param_schema.get("description", ""),
                "in": "body",
            }
            if "default" in param_schema:
                api_config["params"][param_name]["default"] = param_schema["default"]
            if param_name in required_fields:
                api_config["params"][param_name]["required"] = True


def _extract_response_from_schema(
    schema: dict, api_config: dict, prefix: str = ""
) -> None:
    """Extract response fields from schema."""
    properties = schema.get("properties", {})

    for field_name, field_schema in properties.items():
        full_name = f"{prefix}{field_name}" if prefix else field_name

        if field_schema.get("type") == "object" and "properties" in field_schema:
            # Nested object - recurse
            _extract_response_from_schema(
                field_schema, api_config, prefix=f"{full_name}."
            )
        else:
            api_config["response"][full_name] = {
                "type": field_schema.get("type", "string"),
                "description": field_schema.get("description", ""),
            }


def build_registry() -> dict[str, dict]:
    """Build registry from all YAML files in refs/apis/generated/spec/.

    Returns:
        Registry dict mapping API names to configurations
    """
    spec_dir, api_clients_dir, generated_dir = get_project_paths()

    if not spec_dir.exists():
        print(f"Warning: spec directory not found: {spec_dir}")
        return {}

    registry: dict[str, dict] = {}

    # Find all YAML files (excluding template and index)
    yaml_files = sorted(list(spec_dir.glob("*.yaml")) + list(spec_dir.glob("*.yml")))

    for yaml_file in yaml_files:
        # Skip template and hidden files
        if yaml_file.name.startswith("_") or yaml_file.name.startswith("."):
            continue

        try:
            api_config = parse_openapi_file(yaml_file)
            if api_config and api_config.get("name"):
                # Use filename (without extension) as registry key
                key = yaml_file.stem
                registry[key] = api_config
        except Exception as e:
            print(f"  Warning: Failed to parse {yaml_file.name}: {e}")

    return registry


def load_registry() -> dict[str, dict]:
    """Load registry from JSON file.

    Returns:
        Registry dict
    """
    spec_dir, api_clients_dir, generated_dir = get_project_paths()
    registry_path = generated_dir / "registry.json"

    if not registry_path.exists():
        return {}

    with open(registry_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_registry(registry: dict[str, dict]) -> Path:
    """Save registry to JSON file.

    Args:
        registry: Registry dict

    Returns:
        Path to saved file
    """
    spec_dir, api_clients_dir, generated_dir = get_project_paths()
    registry_path = generated_dir / "registry.json"

    # Ensure directory exists
    generated_dir.mkdir(parents=True, exist_ok=True)

    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    return registry_path
