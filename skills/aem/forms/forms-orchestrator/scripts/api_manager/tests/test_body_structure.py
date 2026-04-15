"""End-to-end tests for body structure detection and code generation.

Tests the full pipeline: inputJson -> _parse_input_json -> spec YAML -> parse back -> JS client.
Uses real inputJson payloads from AEM FDM APIs.
"""

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from api_manager.aem_client import AemFdmClient
from api_manager.generator import generate_client_file
from api_manager.openapi_parser import parse_openapi_file
from api_manager.openapi_writer import write_api_to_openapi


# ---------------------------------------------------------------------------
# Real inputJson fixtures from AEM
# ---------------------------------------------------------------------------

JOURNEY_DROPOFF_PARAM_INPUT_JSON = json.dumps({
    "displayName": "demogAdityaTest",
    "url": "/content/example_commonforms/api/journeydropoffparam.json",
    "method": "POST",
    "operationName": "POST /content/example_commonforms/api/journeydropoffparam.json",
    "authType": "None",
    "contentType": "application/json",
    "authentication": {},
    "inputMapping": [
        {"apiKey": "RequestPayload.userAgent", "type": "string", "in": "body",
         "defaultValue": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        {"apiKey": "RequestPayload.journeyInfo.journeyID", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "RequestPayload.journeyInfo.journeyName", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "RequestPayload.leadProfile", "type": "string", "in": "body", "defaultValue": "{}"},
    ],
    "outputMapping": [
        {"apiKey": "status", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "formData.journeyStateInfo[*].state", "type": "string", "in": "body", "defaultValue": ""},
    ],
    "isOutputAnArray": False,
    "encryptionRequired": False,
    "executeAtClient": True,
    "swaggerSpec": {
        "openapi": "3.0.0",
        "info": {"title": "demogAdityaTest", "description": "Generated API Integration Spec", "version": "1.0.0"},
        "paths": {
            "/content/example_commonforms/api/journeydropoffparam.json": {
                "post": {
                    "parameters": [],
                    "requestBody": {"content": {"application/json": {"schema": {"$ref": "#/components/schemas/RequestBodySchema"}}}},
                    "responses": {"200": {"description": "Success", "content": {"application/json": {"schema": {"type": "object", "$ref": "#/components/schemas/SuccessResponse"}}}}},
                }
            }
        },
        "components": {
            "schemas": {
                "RequestBodySchema": {
                    "type": "object",
                    "properties": {
                        "RequestPayload": {
                            "type": "object",
                            "properties": {
                                "userAgent": {"type": "string", "default": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                                "journeyInfo": {"type": "object", "properties": {"journeyID": {"type": "string"}, "journeyName": {"type": "string"}}},
                                "leadProfile": {"type": "string", "default": "{}"},
                            }
                        }
                    }
                },
                "SuccessResponse": {"type": "object", "properties": {"status": {"type": "string"}}},
            }
        },
    },
})

SAVE_ADDITIONAL_DETAILS_INPUT_JSON = json.dumps({
    "displayName": "saveAdditionalDetails_Assets",
    "url": "/content/example_loan_forms/api/xpressAssist/saveAdditionalDetails.json",
    "method": "POST",
    "operationName": "POST /content/example_loan_forms/api/xpressAssist/saveAdditionalDetails.json",
    "authType": "None",
    "contentType": "application/json",
    "authentication": {},
    "inputMapping": [
        {"apiKey": "requestContext.bankJourneyID", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestContext.partnerJourneyID", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestContext.partnerID", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestContext.journeyID", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestContext.journeyName", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestContext.mobileNo", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestData.occupation", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestData.loanAmount", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestData.bankName", "type": "string", "in": "body", "defaultValue": ""},
    ],
    "outputMapping": [
        {"apiKey": "bankJourneyID", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "status.errorCode", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "status.responseCode", "type": "string", "in": "body", "defaultValue": ""},
    ],
    "isOutputAnArray": False,
    "encryptionRequired": True,
    "executeAtClient": True,
    "swaggerSpec": {
        "openapi": "3.0.0",
        "info": {"title": "saveAdditionalDetails_Assets", "version": "1.0.0"},
        "paths": {
            "/content/example_loan_forms/api/xpressAssist/saveAdditionalDetails.json": {
                "post": {
                    "parameters": [],
                    "requestBody": {"content": {"application/json": {"schema": {"$ref": "#/components/schemas/RequestBodySchema"}}}},
                    "responses": {"200": {"description": "Success", "content": {"application/json": {"schema": {"type": "object"}}}}},
                }
            }
        },
        "components": {
            "schemas": {
                "RequestBodySchema": {
                    "type": "object",
                    "properties": {
                        "requestContext": {
                            "type": "object",
                            "properties": {
                                "bankJourneyID": {"type": "string"},
                                "partnerJourneyID": {"type": "string"},
                                "partnerID": {"type": "string"},
                                "journeyID": {"type": "string"},
                                "journeyName": {"type": "string"},
                                "mobileNo": {"type": "string"},
                            }
                        },
                        "requestData": {
                            "type": "object",
                            "properties": {
                                "occupation": {"type": "string"},
                                "loanAmount": {"type": "string"},
                                "bankName": {"type": "string"},
                            }
                        },
                    }
                }
            }
        },
    },
})

REQUESTSTRING_INPUT_JSON = json.dumps({
    "displayName": "accountSelection",
    "url": "/content/example_hdb_commonforms/api/accountselection.json",
    "method": "POST",
    "operationName": "POST /content/example_hdb_commonforms/api/accountselection.json",
    "authType": "None",
    "contentType": "application/json",
    "authentication": {},
    "inputMapping": [
        {"apiKey": "requestString.mobileNumber", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestString.dateOfBirth", "type": "string", "in": "body", "defaultValue": ""},
        {"apiKey": "requestString.productCode", "type": "string", "in": "body", "defaultValue": ""},
    ],
    "outputMapping": [
        {"apiKey": "status", "type": "string", "in": "body", "defaultValue": ""},
    ],
    "isOutputAnArray": False,
    "encryptionRequired": False,
    "executeAtClient": True,
})


# ---------------------------------------------------------------------------
# Helper: run the full pipeline from inputJson to generated JS
# ---------------------------------------------------------------------------

def _run_pipeline(input_json_str: str, api_key: str = "testapi"):
    """Run full pipeline: parse inputJson -> write spec -> parse spec -> generate JS."""
    client = AemFdmClient.__new__(AemFdmClient)
    content = {"type": "api-integration"}

    # Step 1: Parse inputJson (what sync does when fetching from AEM)
    api_config = client._parse_input_json(input_json_str, content)
    assert api_config is not None, "Failed to parse inputJson"

    # Step 2: Write OpenAPI spec YAML
    spec_yaml = write_api_to_openapi(api_config, validate_output=False)

    # Step 3: Parse the spec back (what build does)
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode="w", delete=False) as f:
        f.write(spec_yaml)
        tmppath = Path(f.name)
    try:
        parsed_config = parse_openapi_file(tmppath)
    finally:
        tmppath.unlink()

    assert parsed_config is not None, "Failed to parse generated spec"

    # Step 4: Generate JS client
    js_output = generate_client_file(api_key, parsed_config)

    return api_config, parsed_config, spec_yaml, js_output


# ---------------------------------------------------------------------------
# Tests: journeyDropOffParam (single root with nested sub-objects)
# ---------------------------------------------------------------------------

class TestJourneyDropOffParam:
    """Test RequestPayload wrapper with nested journeyInfo sub-object."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.api_config, self.parsed, self.spec, self.js = _run_pipeline(
            JOURNEY_DROPOFF_PARAM_INPUT_JSON, "journeydropoffparam"
        )

    def test_body_structure_detected_as_request_payload(self):
        assert self.api_config["bodyStructure"] == "RequestPayload"

    def test_params_have_dotted_keys(self):
        param_keys = list(self.api_config["params"].keys())
        assert "RequestPayload.userAgent" in param_keys
        assert "RequestPayload.journeyInfo.journeyID" in param_keys
        assert "RequestPayload.journeyInfo.journeyName" in param_keys
        assert "RequestPayload.leadProfile" in param_keys

    def test_round_trip_preserves_dotted_keys(self):
        parsed_keys = list(self.parsed["params"].keys())
        assert "RequestPayload.userAgent" in parsed_keys
        assert "RequestPayload.journeyInfo.journeyID" in parsed_keys
        assert "RequestPayload.journeyInfo.journeyName" in parsed_keys
        assert "RequestPayload.leadProfile" in parsed_keys

    def test_round_trip_preserves_body_structure(self):
        assert self.parsed["bodyStructure"] == "RequestPayload"

    def test_spec_has_nested_schema(self):
        assert "RequestPayload:" in self.spec
        assert "journeyInfo:" in self.spec
        assert "journeyID:" in self.spec
        assert "journeyName:" in self.spec

    def test_js_has_request_payload_wrapper(self):
        assert "RequestPayload: {" in self.js

    def test_js_has_nested_journey_info(self):
        assert "journeyInfo: {" in self.js
        assert "journeyID: params.journeyID" in self.js
        assert "journeyName: params.journeyName" in self.js

    def test_js_has_flat_params_at_payload_level(self):
        assert "userAgent: params.userAgent" in self.js
        assert "leadProfile: params.leadProfile" in self.js

    def test_js_body_structure(self):
        """Verify the complete body object structure."""
        lines = self.js.split("\n")
        body_lines = []
        in_body = False
        for line in lines:
            if "var body" in line:
                in_body = True
            if in_body:
                body_lines.append(line.strip())
                if line.strip() == "};":
                    break

        assert body_lines[0] == "var body = {"
        assert body_lines[1] == "RequestPayload: {"
        # userAgent should be direct child of RequestPayload
        assert any("userAgent:" in l for l in body_lines)
        # journeyInfo should be a nested object
        assert any("journeyInfo: {" in l for l in body_lines)
        # journeyID/journeyName should be inside journeyInfo
        journey_info_idx = next(i for i, l in enumerate(body_lines) if "journeyInfo: {" in l)
        closing_brace_idx = next(i for i in range(journey_info_idx + 1, len(body_lines)) if body_lines[i] == "},")
        journey_info_content = body_lines[journey_info_idx + 1:closing_brace_idx]
        assert any("journeyID:" in l for l in journey_info_content)
        assert any("journeyName:" in l for l in journey_info_content)


# ---------------------------------------------------------------------------
# Tests: saveAdditionalDetails (multi-root: requestContext + requestData)
# ---------------------------------------------------------------------------

class TestSaveAdditionalDetails:
    """Test multi-root body with requestContext + requestData."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.api_config, self.parsed, self.spec, self.js = _run_pipeline(
            SAVE_ADDITIONAL_DETAILS_INPUT_JSON, "saveadditionaldetails-assets"
        )

    def test_body_structure_detected_as_multi_root(self):
        assert self.api_config["bodyStructure"] == "requestContext,requestData"

    def test_params_grouped_by_root(self):
        keys = list(self.api_config["params"].keys())
        context_keys = [k for k in keys if k.startswith("requestContext.")]
        data_keys = [k for k in keys if k.startswith("requestData.")]
        assert len(context_keys) == 6
        assert len(data_keys) == 3

    def test_round_trip_preserves_multi_root(self):
        assert self.parsed["bodyStructure"] == "requestContext,requestData"
        parsed_keys = list(self.parsed["params"].keys())
        assert any(k.startswith("requestContext.") for k in parsed_keys)
        assert any(k.startswith("requestData.") for k in parsed_keys)

    def test_js_has_both_roots(self):
        assert "requestContext: {" in self.js
        assert "requestData: {" in self.js

    def test_js_context_params_in_correct_root(self):
        lines = self.js.split("\n")
        in_context = False
        context_params = []
        for line in lines:
            if "requestContext: {" in line:
                in_context = True
                continue
            if in_context:
                if line.strip() == "},":
                    break
                context_params.append(line.strip())
        assert any("bankJourneyID:" in p for p in context_params)
        assert any("journeyID:" in p for p in context_params)
        assert any("mobileNo:" in p for p in context_params)

    def test_js_data_params_in_correct_root(self):
        lines = self.js.split("\n")
        in_data = False
        data_params = []
        for line in lines:
            if "requestData: {" in line:
                in_data = True
                continue
            if in_data:
                if line.strip() == "},":
                    break
                data_params.append(line.strip())
        assert any("occupation:" in p for p in data_params)
        assert any("loanAmount:" in p for p in data_params)
        assert any("bankName:" in p for p in data_params)


# ---------------------------------------------------------------------------
# Tests: accountSelection (classic requestString wrapper)
# ---------------------------------------------------------------------------

class TestRequestString:
    """Test classic requestString single-wrapper pattern."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.api_config, self.parsed, self.spec, self.js = _run_pipeline(
            REQUESTSTRING_INPUT_JSON, "accountselection"
        )

    def test_body_structure_detected_as_request_string(self):
        assert self.api_config["bodyStructure"] == "requestString"

    def test_params_have_request_string_prefix(self):
        keys = list(self.api_config["params"].keys())
        assert all(k.startswith("requestString.") for k in keys if self.api_config["params"][k].get("in") == "body")

    def test_round_trip_preserves_request_string(self):
        assert self.parsed["bodyStructure"] == "requestString"
        parsed_keys = list(self.parsed["params"].keys())
        body_keys = [k for k in parsed_keys if self.parsed["params"][k].get("in") == "body"]
        assert all(k.startswith("requestString.") for k in body_keys)

    def test_js_has_request_string_wrapper(self):
        assert "requestString: {" in self.js

    def test_js_has_params_inside_wrapper(self):
        lines = self.js.split("\n")
        in_rs = False
        rs_params = []
        for line in lines:
            if "requestString: {" in line:
                in_rs = True
                continue
            if in_rs:
                if line.strip() in ("}", "},"):
                    break
                rs_params.append(line.strip())
        assert any("mobileNumber:" in p for p in rs_params)
        assert any("dateOfBirth:" in p for p in rs_params)
        assert any("productCode:" in p for p in rs_params)

    def test_js_no_flat_body_params(self):
        """Params should be inside requestString wrapper, not at top level of body."""
        lines = self.js.split("\n")
        body_start = next(i for i, l in enumerate(lines) if "var body = {" in l)
        first_child = lines[body_start + 1].strip()
        assert first_child.startswith("requestString:")


# ---------------------------------------------------------------------------
# Tests: _detect_body_structure unit tests
# ---------------------------------------------------------------------------

class TestDetectBodyStructure:
    """Unit tests for AemFdmClient._detect_body_structure."""

    def test_single_wrapper(self):
        params = {
            "requestString.a": {"in": "body"},
            "requestString.b": {"in": "body"},
        }
        assert AemFdmClient._detect_body_structure(params) == "requestString"

    def test_multi_root(self):
        params = {
            "requestContext.a": {"in": "body"},
            "requestData.b": {"in": "body"},
        }
        assert AemFdmClient._detect_body_structure(params) == "requestContext,requestData"

    def test_flat_no_dots(self):
        params = {
            "mobile": {"in": "body"},
            "dob": {"in": "body"},
        }
        assert AemFdmClient._detect_body_structure(params) == "none"

    def test_no_body_params(self):
        params = {
            "id": {"in": "path"},
            "q": {"in": "query"},
        }
        assert AemFdmClient._detect_body_structure(params) == "none"

    def test_ignores_non_body_params(self):
        params = {
            "requestString.a": {"in": "body"},
            "Authorization": {"in": "header"},
        }
        assert AemFdmClient._detect_body_structure(params) == "requestString"

    def test_deep_nesting_uses_first_segment(self):
        params = {
            "RequestPayload.journeyInfo.journeyID": {"in": "body"},
            "RequestPayload.leadProfile": {"in": "body"},
        }
        assert AemFdmClient._detect_body_structure(params) == "RequestPayload"

    def test_preserves_root_order(self):
        params = {
            "requestContext.a": {"in": "body"},
            "requestContext.b": {"in": "body"},
            "requestData.c": {"in": "body"},
        }
        result = AemFdmClient._detect_body_structure(params)
        assert result == "requestContext,requestData"

    def test_empty_params(self):
        assert AemFdmClient._detect_body_structure({}) == "none"
