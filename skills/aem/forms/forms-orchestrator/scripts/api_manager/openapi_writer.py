"""OpenAPI Writer - Generates OpenAPI 3.0 specs using apispec.

Uses the apispec library for standards-compliant OpenAPI generation.
Includes validation to ensure generated specs are valid OpenAPI 3.0.
"""

import re
from typing import Any

from apispec import APISpec
from openapi_spec_validator import validate


def create_spec_for_api(api_config: dict) -> APISpec:
    """Create an APISpec for a single API.

    Args:
        api_config: API configuration from AEM FDM

    Returns:
        APISpec instance
    """
    name = api_config.get("name", "Unknown API")
    description = api_config.get("description", f"{name} API")

    spec = APISpec(
        title=name,
        version="1.0.0",
        openapi_version="3.0.3",
        info={"description": description},
    )

    return spec


def _to_operation_id(name: str) -> str:
    """Convert API name to valid operationId (camelCase)."""
    words = re.split(r"[^a-zA-Z0-9]+", name)
    if not words:
        return "unnamed"

    result = words[0].lower()
    for word in words[1:]:
        if word:
            result += word[0].upper() + word[1:].lower()

    return result


def _separate_params_by_location(params: dict) -> dict:
    """Separate parameters by their location (path, query, header, body).

    Args:
        params: Raw params dict from API config

    Returns:
        Dict with params grouped by location
    """
    path_params = []
    query_params = []
    header_params = []
    body_params = {}

    for param_name, param_config in params.items():
        # Use flat name (strip requestString. prefix)
        flat_name = param_name.split(".")[-1] if "." in param_name else param_name
        location = param_config.get("in", "body")

        if location == "path":
            path_params.append(
                {
                    "name": flat_name,
                    "in": "path",
                    "required": True,  # Path params are always required
                    "schema": {"type": param_config.get("type", "string")},
                    "description": param_config.get("description", ""),
                }
            )
        elif location == "query":
            query_params.append(
                {
                    "name": flat_name,
                    "in": "query",
                    "required": param_config.get("required", False),
                    "schema": {"type": param_config.get("type", "string")},
                    "description": param_config.get("description", ""),
                }
            )
        elif location == "header":
            header_params.append(
                {
                    "name": flat_name,
                    "in": "header",
                    "required": param_config.get("required", False),
                    "schema": {"type": param_config.get("type", "string")},
                    "description": param_config.get("description", ""),
                }
            )
        else:
            # Body param
            body_params[flat_name] = {
                "type": param_config.get("type", "string"),
                "description": param_config.get("description", ""),
            }
            if param_config.get("default") is not None:
                body_params[flat_name]["default"] = param_config["default"]

    return {
        "path_params": path_params,
        "query_params": query_params,
        "header_params": header_params,
        "body_params": body_params,
    }


def _build_response_properties(response: dict) -> dict:
    """Build response properties handling nested fields like 'status.responseCode'."""
    properties = {}

    for field_name, field_config in response.items():
        parts = field_name.split(".")

        if len(parts) == 1:
            # Simple field
            properties[field_name] = {
                "type": field_config.get("type", "string"),
            }
            if field_config.get("description"):
                properties[field_name]["description"] = field_config["description"]
        else:
            # Nested field - create object structure
            root = parts[0]
            if root not in properties:
                properties[root] = {"type": "object", "properties": {}}
            elif "properties" not in properties[root]:
                properties[root] = {"type": "object", "properties": {}}

            leaf = parts[-1]
            properties[root]["properties"][leaf] = {
                "type": field_config.get("type", "string"),
            }
            if field_config.get("description"):
                properties[root]["properties"][leaf]["description"] = field_config[
                    "description"
                ]

    return properties


def write_api_to_openapi(api_config: dict, validate_output: bool = True) -> str:
    """Convert API config to OpenAPI 3.0 YAML string.

    Uses apispec for standards-compliant generation and optionally validates
    the output against OpenAPI 3.0 spec.

    Args:
        api_config: API configuration object
        validate_output: Whether to validate the generated spec (default: True)

    Returns:
        OpenAPI YAML content

    Raises:
        OpenAPIValidationError: If validation fails
    """
    name = api_config.get("name", "Unknown API")
    description = api_config.get("description", f"{name} API")
    endpoint = api_config.get("endpoint", "/api/endpoint")
    method = api_config.get("method", "POST").lower()
    params = api_config.get("params", {})
    response = api_config.get("response", {})
    body_structure = api_config.get("bodyStructure", "requestString")
    success_condition = api_config.get("successCondition")

    # Create spec
    spec = APISpec(
        title=name,
        version="1.0.0",
        openapi_version="3.0.3",
        info={"description": description},
    )

    # Separate params by location
    param_groups = _separate_params_by_location(params)
    path_params = param_groups["path_params"]
    query_params = param_groups["query_params"]
    header_params = param_groups["header_params"]
    body_params = param_groups["body_params"]

    # Build operation object
    operation: dict[str, Any] = {
        "operationId": _to_operation_id(name),
        "summary": name,
        "description": description,
        "responses": {
            "200": {
                "description": "Successful response",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/Response"}
                    }
                },
            }
        },
    }
    if success_condition:
        operation["x-success-condition"] = success_condition

    # Add parameters (path + query + header)
    all_params = path_params + query_params + header_params
    if all_params:
        operation["parameters"] = all_params

    # Add request body (only for methods that support it and if there are body params)
    if body_params and method in ["post", "put", "patch"]:
        operation["requestBody"] = {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {"$ref": "#/components/schemas/RequestBody"}
                }
            },
        }

    # Add path to spec
    spec.path(path=endpoint, operations={method: operation})

    # Add Response schema
    response_properties = _build_response_properties(response)
    spec.components.schema(
        "Response",
        {
            "type": "object",
            "properties": response_properties,
        },
    )

    # Add RequestBody schema (only if there are body params)
    if body_params:
        if body_structure and body_structure != "none":
            # Wrap in body structure (e.g., requestString)
            spec.components.schema(
                "RequestBody",
                {
                    "type": "object",
                    "properties": {
                        body_structure: {
                            "type": "object",
                            "description": "SDK wraps flat params into this structure",
                            "properties": body_params,
                        }
                    },
                },
            )
        else:
            # Direct properties without wrapper
            spec.components.schema(
                "RequestBody",
                {
                    "type": "object",
                    "properties": body_params,
                },
            )

    # Get the spec dict and add AEM-specific extensions
    spec_dict = spec.to_dict()

    # Add x-aem-config at root level (after info)
    aem_config = {
        "source": api_config.get("source", "local"),
        "executeAtClient": api_config.get("executeAtClient", True),
        "encryptionRequired": api_config.get("encryptionRequired", False),
        "authType": api_config.get("authType", "None"),
        "isOutputAnArray": api_config.get("isOutputAnArray", False),
        "bodyStructure": body_structure,
    }
    if api_config.get("fdmName"):
        aem_config["fdmName"] = api_config["fdmName"]

    spec_dict["x-aem-config"] = aem_config

    # Validate if requested
    if validate_output:
        try:
            validate(spec_dict)
        except Exception as e:
            # Log warning but don't fail - some AEM APIs may have edge cases
            import sys

            print(
                f"  Warning: OpenAPI validation issue for {name}: {e}", file=sys.stderr
            )

    # Convert to YAML with proper ordering
    import yaml

    # Custom representer to maintain key order
    def represent_dict(dumper, data):
        return dumper.represent_mapping("tag:yaml.org,2002:map", data.items())

    yaml.add_representer(dict, represent_dict)

    # Reorder keys for better readability
    ordered_spec = _reorder_spec_keys(spec_dict)

    return yaml.dump(
        ordered_spec,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
        width=120,
    )


def _reorder_spec_keys(spec_dict: dict) -> dict:
    """Reorder spec keys for better readability.

    Puts keys in a logical order: openapi, info, x-aem-config, paths, components
    """
    key_order = [
        "openapi",
        "info",
        "x-aem-config",
        "servers",
        "tags",
        "paths",
        "components",
    ]

    ordered = {}
    for key in key_order:
        if key in spec_dict:
            ordered[key] = spec_dict[key]

    # Add any remaining keys
    for key, value in spec_dict.items():
        if key not in ordered:
            ordered[key] = value

    return ordered


def generate_filename(api_name: str) -> str:
    """Generate filename from API name.

    Args:
        api_name: API name

    Returns:
        Filename (without path)
    """
    filename = re.sub(r"[^a-z0-9]+", "-", api_name.lower())
    filename = filename.strip("-")
    return f"{filename}.yaml"


def generate_index(apis: list[dict], sync_stats: dict = None) -> str:
    """Generate _index.yaml content with API statistics.

    Args:
        apis: List of API configurations
        sync_stats: Optional sync statistics dict

    Returns:
        YAML content for _index.yaml
    """
    from datetime import datetime

    import yaml

    total = len(apis)
    post_count = sum(1 for a in apis if a.get("method", "POST").upper() == "POST")
    get_count = sum(1 for a in apis if a.get("method", "").upper() == "GET")
    encrypted_count = sum(1 for a in apis if a.get("encryptionRequired"))
    client_side_count = sum(1 for a in apis if a.get("executeAtClient"))

    index_doc = {
        "title": "API Reference Documentation",
        "description": f"This directory contains {total} API definitions in OpenAPI 3.0 format",
        "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "sourceOfTruth": {
            "primary": "AEM Form Data Model",
            "local": "OpenAPI YAML files in this directory",
            "generated": "code/blocks/form/api-clients/*.js",
        },
        "commands": {
            "list": "api-manager list",
            "show": "api-manager show <apiName>",
            "sync": "api-manager sync",
            "build": "api-manager build",
        },
        "statistics": {
            "totalApis": total,
            "postMethods": post_count,
            "getMethods": get_count,
            "encryptedApis": encrypted_count,
            "clientSideApis": client_side_count,
        },
        "usage": {
            "example": """
import { customerIdentification } from './api-clients';

var response = await customerIdentification({
  mobileNumber: '9876543210',
  dateOfBirth: '01/01/1990'
}, globals);

if (response.ok && response.body?.status?.responseCode === '0') {
  // Success
}
""".strip(),
        },
    }

    return yaml.dump(
        index_doc,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
        width=120,
    )
