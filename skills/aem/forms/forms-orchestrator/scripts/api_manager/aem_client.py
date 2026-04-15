"""AEM FDM Client - Fetches API definitions from AEM Form Data Model."""

import json
from typing import Any, Optional
from urllib.parse import quote

import requests

from .config import Config
from .exceptions import AemConnectionError


class AemFdmClient:
    """Client for fetching API definitions from AEM Form Data Model."""

    def __init__(self, config: Config):
        """Initialize AEM FDM client.

        Args:
            config: Configuration with AEM host and auth
        """
        self.host = config.aem_host.rstrip("/")
        self.auth_header = config.auth_header
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": self.auth_header,
            "Accept": "application/json",
        })
        self.session.timeout = 30

    def _request(self, path: str) -> Any:
        """Make HTTP request to AEM.

        Args:
            path: URL path

        Returns:
            JSON response data

        Raises:
            AemConnectionError: If request fails
        """
        url = f"{self.host}{path}"
        try:
            response = self.session.get(url, timeout=30)
            # Handle 200 OK and 300 Multiple Choices (returns array of URLs)
            if response.status_code in (200, 300):
                return response.json()
            else:
                raise AemConnectionError(
                    f"HTTP {response.status_code}: {response.reason}"
                )
        except requests.exceptions.JSONDecodeError as e:
            raise AemConnectionError(f"Invalid JSON response: {e}")
        except requests.exceptions.RequestException as e:
            raise AemConnectionError(f"Request failed: {e}")

    def fetch_all_apis(self) -> list[dict]:
        """Fetch all APIs from FDM.

        Handles both response formats:
        - Array of URLs (paginated) -> fetch each URL and combine
        - Object with FDM data -> process directly

        Returns:
            List of API definitions
        """
        fdm_path = "/conf/forms/settings/cloudconfigs/fdm.infinity.json"
        data = self._request(fdm_path)

        # Check response format
        if isinstance(data, list):
            # Paginated response - array of URLs to fetch
            return self._fetch_from_paginated_urls(data)

        # Direct object response - check if it has full content or just shallow listing
        return self._process_response(data)

    def _process_response(self, data: dict) -> list[dict]:
        """Process response data - handles both full and shallow responses."""
        # Check if data has full content (jcr:content with inputJson) or just shallow listing
        has_full_content = self._has_full_content(data)

        if has_full_content:
            return self._extract_api_integrations(data)
        else:
            # Shallow listing - need to fetch each FDM individually
            return self._fetch_individual_fdms(data)

    def _has_full_content(self, data: dict) -> bool:
        """Check if response has full content (inputJson) or just shallow listing."""
        for key, value in data.items():
            if key.startswith(("jcr:", "sling:")):
                continue
            if (
                value
                and isinstance(value, dict)
                and value.get("jcr:primaryType") == "cq:Page"
            ):
                content = value.get("jcr:content")
                # If jcr:content exists and has inputJson, it's full content
                if content and content.get("inputJson"):
                    return True
                # If jcr:content exists but no inputJson, it's shallow
                if content and not content.get("inputJson"):
                    return False
        # Default to trying full extraction
        return True

    def _fetch_from_paginated_urls(self, urls: list[str]) -> list[dict]:
        """Fetch APIs from paginated URLs.

        When we get paginated URLs, fetch .3.json depth to get type info,
        then fetch individual FDMs for full content.
        """
        # Use .3.json depth which includes jcr:content.type but not inputJson
        list_url = "/conf/forms/settings/cloudconfigs/fdm.3.json"
        try:
            list_data = self._request(list_url)
            # This will be shallow (no inputJson), so it will fetch individual FDMs
            return self._process_response(list_data)
        except AemConnectionError:
            # Fallback: fetch each paginated URL and combine
            all_data = {}
            for url in urls:
                try:
                    page_data = self._request(url)
                    all_data.update(page_data)
                except AemConnectionError as e:
                    print(f"  Warning: Failed to fetch {url}: {e}")
            return self._process_response(all_data)

    def _fetch_individual_fdms(self, data: dict) -> list[dict]:
        """Fetch individual FDMs when we only have shallow listing."""
        # First identify api-integration FDMs from shallow listing
        api_integration_fdms = []
        for key, value in data.items():
            if key.startswith(("jcr:", "sling:")):
                continue
            if (
                value
                and isinstance(value, dict)
                and value.get("jcr:primaryType") == "cq:Page"
            ):
                content = value.get("jcr:content")
                # Strict filter: only type === 'api-integration'
                if content and content.get("type") == "api-integration":
                    api_integration_fdms.append(key)

        print(f"  Found {len(api_integration_fdms)} api-integration FDMs, fetching details...")

        # Fetch each FDM individually to get inputJson
        apis = []
        for fdm_name in api_integration_fdms:
            try:
                fdm_path = f"/conf/forms/settings/cloudconfigs/fdm/{quote(fdm_name)}.infinity.json"
                fdm_data = self._request(fdm_path)

                content = fdm_data.get("jcr:content")
                if not content or content.get("type") != "api-integration":
                    continue

                api_config = self._parse_input_json(content.get("inputJson"), content)
                if api_config:
                    api_config["fdmName"] = fdm_name
                    apis.append(api_config)
            except AemConnectionError as e:
                print(f"  Warning: Failed to fetch {fdm_name}: {e}")

        return apis

    def _extract_api_integrations(self, data: dict) -> list[dict]:
        """Extract API integrations from FDM data with full content."""
        apis = []

        for key, value in data.items():
            # Skip JCR metadata
            if key.startswith(("jcr:", "sling:")):
                continue

            # Check if this is a cq:Page
            if (
                not value
                or not isinstance(value, dict)
                or value.get("jcr:primaryType") != "cq:Page"
            ):
                continue

            content = value.get("jcr:content")
            if not content:
                continue

            # Strict filter: only type === 'api-integration'
            if content.get("type") != "api-integration":
                continue

            # Parse inputJson to get API details
            api_config = self._parse_input_json(content.get("inputJson"), content)
            if api_config:
                api_config["fdmName"] = key
                apis.append(api_config)

        return apis

    def _parse_input_json(
        self, input_json_str: Optional[str], content: dict
    ) -> Optional[dict]:
        """Parse inputJson string to extract API configuration."""
        if not input_json_str:
            # Fallback to content fields if inputJson not available
            if not content.get("name") and not content.get("jcr:title") and not content.get("serviceEndPoint"):
                return None  # Not enough info
            return {
                "name": content.get("name") or content.get("jcr:title") or "unknown",
                "description": f"{content.get('name') or content.get('jcr:title')} API",
                "endpoint": content.get("serviceEndPoint", ""),
                "method": "POST",
                "params": {},
                "response": {},
                "encryptionRequired": content.get("encryptionRequired", False),
                "executeAtClient": content.get("executeAtClient", False),
            }

        try:
            input_json = json.loads(input_json_str)

            # Extract parameters from inputMapping
            params = {}
            input_mapping = input_json.get("inputMapping", [])
            if isinstance(input_mapping, list):
                for param in input_mapping:
                    param_name = param.get("apiKey") or param.get("name")
                    if param_name:
                        params[param_name] = {
                            "type": param.get("type", "string"),
                            "required": param.get("required", False),
                            "description": param.get("description") or f"{param.get('in', 'body')} parameter",
                            "default": param.get("defaultValue"),
                            "in": param.get("in", "body"),
                        }

            # Extract response fields from outputMapping
            response = {}
            output_mapping = input_json.get("outputMapping", [])
            if isinstance(output_mapping, list):
                for field in output_mapping:
                    field_name = field.get("apiKey") or field.get("name")
                    if field_name:
                        response[field_name] = {
                            "type": field.get("type", "string"),
                            "description": field.get("description", ""),
                        }

            # Enrich with swaggerSpec data (especially required fields)
            swagger_spec = input_json.get("swaggerSpec")
            if swagger_spec:
                self._enrich_from_swagger(swagger_spec, params, response)

            # Detect body structure from inputMapping apiKeys
            body_structure = self._detect_body_structure(params)

            return {
                "name": input_json.get("displayName") or content.get("name") or "unknown",
                "description": f"{input_json.get('operationName') or input_json.get('displayName') or content.get('name')} API",
                "endpoint": input_json.get("url") or content.get("serviceEndPoint", ""),
                "method": input_json.get("method", "POST"),
                "params": params,
                "response": response,
                "bodyStructure": body_structure,
                "contentType": input_json.get("contentType", "application/json"),
                "authType": input_json.get("authType", "None"),
                "encryptionRequired": input_json.get("encryptionRequired", False),
                "executeAtClient": input_json.get("executeAtClient", False),
                "isOutputAnArray": input_json.get("isOutputAnArray", False),
            }
        except json.JSONDecodeError as e:
            print(f"  Warning: Failed to parse inputJson: {e}")
            return None

    @staticmethod
    def _detect_body_structure(params: dict) -> str:
        """Detect body wrapper structure from param apiKey prefixes.

        Inspects the first dotted segment of body-param keys to determine
        how the request body is wrapped.

        Returns:
            - "none" if body params have no dotted prefix (flat)
            - A single wrapper name (e.g. "requestString", "RequestPayload")
            - Comma-separated roots for multi-root bodies
              (e.g. "requestContext,requestData")
        """
        roots: list[str] = []
        seen: set[str] = set()
        has_body_params = False

        for key, config in params.items():
            if config.get("in", "body") != "body":
                continue
            has_body_params = True
            if "." in key:
                root = key.split(".")[0]
                if root not in seen:
                    seen.add(root)
                    roots.append(root)

        if not has_body_params:
            return "none"

        if not roots:
            return "none"

        if len(roots) == 1:
            return roots[0]

        return ",".join(roots)

    def _enrich_from_swagger(
        self, swagger_spec: dict, params: dict, response: dict
    ) -> None:
        """Enrich params and response from Swagger/OpenAPI spec.

        Updates required field from swagger spec.
        """
        paths = swagger_spec.get("paths")
        if not paths:
            return

        # Find first path and method
        for path, methods in paths.items():
            for method, spec in methods.items():
                if not isinstance(spec, dict):
                    continue

                # Extract/update parameters from swagger spec
                parameters = spec.get("parameters", [])
                if isinstance(parameters, list):
                    for param in parameters:
                        param_name = param.get("name")
                        if not param_name:
                            continue

                        # Update existing param or create new one
                        if param_name in params:
                            # Update required field from swagger
                            params[param_name]["required"] = param.get("required", False)
                            if param.get("description"):
                                params[param_name]["description"] = param["description"]
                        else:
                            schema = param.get("schema", {})
                            params[param_name] = {
                                "type": schema.get("type", "string"),
                                "required": param.get("required", False),
                                "description": param.get("description") or f"{param.get('in')} parameter",
                                "in": param.get("in"),
                            }
                            if schema.get("default") is not None:
                                params[param_name]["default"] = schema["default"]

                # Extract request body schema and required fields
                req_body = spec.get("requestBody", {})
                req_body_content = req_body.get("content", {})
                req_body_json = req_body_content.get("application/json", {})
                req_body_schema = req_body_json.get("schema", {})

                if req_body_schema:
                    required_fields = req_body_schema.get("required", [])
                    req_body_props = req_body_schema.get("properties", {})

                    for name, schema in req_body_props.items():
                        is_required = name in required_fields
                        if name in params:
                            # Update required from schema.required array
                            params[name]["required"] = is_required
                            if schema.get("description"):
                                params[name]["description"] = schema["description"]
                        else:
                            params[name] = {
                                "type": schema.get("type", "string"),
                                "required": is_required,
                                "description": schema.get("description", ""),
                            }

                # Extract response schema
                responses = spec.get("responses", {})
                success_response = responses.get("200") or responses.get("201")
                if success_response:
                    res_content = success_response.get("content", {})
                    res_json = res_content.get("application/json", {})
                    res_schema = res_json.get("schema", {})
                    res_body_props = res_schema.get("properties", {})

                    if isinstance(res_body_props, dict):
                        for name, schema in res_body_props.items():
                            if name not in response:
                                response[name] = {
                                    "type": schema.get("type", "string"),
                                    "description": schema.get("description", ""),
                                }

                # Only process first method found
                return
