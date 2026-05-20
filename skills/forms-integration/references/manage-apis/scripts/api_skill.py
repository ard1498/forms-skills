#!/usr/bin/env python3
"""CLI for generating an API ref ("skill") markdown doc from a cURL request."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import parse_qsl, urlparse


DEFAULT_REPO_ROOT = Path.cwd()

# Headers that are generally browser noise; keep docs focused on the integration contract.
NOISY_HEADERS = {
    "accept",
    "accept-language",
    "cache-control",
    "pragma",
    "priority",
    "referer",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
    "sec-fetch-dest",
    "sec-fetch-mode",
    "sec-fetch-site",
    "user-agent",
    "origin",
    "cookie",
}


@dataclass(frozen=True)
class ParsedCurl:
    method: str
    url: str
    headers: Dict[str, str]
    body_text: Optional[str]


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s_]+", "-", value)
    value = re.sub(r"-{2,}", "-", value)
    return value.strip("-") or "api"


def _read_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _parse_curl(curl: str) -> ParsedCurl:
    """
    Supports patterns similar to `fd-api-integration/src/ApiIntegrationForm.js`.
    Not a full shell parser, but robust for typical `curl ... -H 'k: v' --data-raw '...json...'`.
    """
    curl = curl.strip()
    if not curl:
        raise ValueError("Empty cURL input")

    # URL (single-quoted, double-quoted, or bare)
    url = None
    url_patterns = [
        r"curl(?:\s+--location(?:\s+--globoff)?)?\s+'([^']+)'",
        r'curl(?:\s+--location(?:\s+--globoff)?)?\s+"([^"]+)"',
        r"curl(?:\s+--location(?:\s+--globoff)?)?\s+(\S+)",
    ]
    for pat in url_patterns:
        m = re.search(pat, curl)
        if m:
            candidate = m.group(1)
            if candidate.startswith("http") or candidate.startswith("/"):
                url = candidate
                break
    if not url:
        raise ValueError("Could not find URL in cURL")

    # Method
    method = "GET"
    m = re.search(r"\s-X\s+(\w+)", curl)
    if m:
        method = m.group(1).upper()

    # Headers
    headers: Dict[str, str] = {}
    for hm in re.finditer(r"(?:-H|--header)\s+'([^:]+):\s*([^']*)'", curl):
        headers[hm.group(1).strip()] = hm.group(2).strip()
    for hm in re.finditer(r'(?:-H|--header)\s+"([^:]+):\s*([^"]*)"', curl):
        headers[hm.group(1).strip()] = hm.group(2).strip()

    # Body (raw) - support --data* and -d forms.
    body_text = None
    data_patterns = [
        r"--data(?:-raw|-binary|-urlencode)?\s+'([\s\S]+?)'",
        r'--data(?:-raw|-binary|-urlencode)?\s+"([\s\S]+?)"',
        r"-d\s+'([\s\S]+?)'",
        r'-d\s+"([\s\S]+?)"',
    ]
    for pat in data_patterns:
        dm = re.findall(pat, curl)
        if dm:
            # pick the last payload occurrence
            body_text = dm[-1]
            if not m:  # method not explicitly set; curl with data defaults to POST
                method = "POST"
            break

    return ParsedCurl(method=method, url=url, headers=headers, body_text=body_text)


def _header_lookup(headers: Dict[str, str], key: str) -> Optional[str]:
    for k, v in headers.items():
        if k.lower() == key.lower():
            return v
    return None


def _detect_auth(headers: Dict[str, str]) -> str:
    auth = _header_lookup(headers, "Authorization")
    if auth:
        if auth.lower().startswith("basic "):
            return "Basic"
        if auth.lower().startswith("bearer "):
            return "Bearer"
        return "Authorization"
    if _header_lookup(headers, "X-API-Key") or _header_lookup(headers, "x-api-key"):
        return "API Key"
    return "None"


def _infer_content_type(headers: Dict[str, str], body_text: Optional[str]) -> str:
    ct = _header_lookup(headers, "Content-Type")
    if ct:
        return ct
    if body_text:
        # default for payloads
        return "application/json"
    return "application/json"


def _split_url(url: str) -> Tuple[str, str, List[Tuple[str, str]]]:
    """
    Returns: (path_for_doc, server_hint, query_params)
    - path_for_doc: for template URL row (prefer path+query stripped)
    - server_hint: origin if absolute, else empty
    - query_params: list of (key, value)
    """
    p = urlparse(url)
    if p.scheme and p.netloc:
        path = p.path or "/"
        query = list(parse_qsl(p.query, keep_blank_values=True))
        return path, f"{p.scheme}://{p.netloc}", query
    # Relative URL
    if "?" in url:
        path, q = url.split("?", 1)
        return path, "", list(parse_qsl(q, keep_blank_values=True))
    return url, "", []


def _json_loads_maybe(s: Optional[str]) -> Optional[Any]:
    if not s:
        return None
    s = s.strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception:
        # Common when a cURL payload is pasted with escaped quotes, e.g. {\"a\":1}
        # or doubly-escaped, e.g. {\\\"a\\\":1}. Try a few unescape passes.
        candidates: List[str] = []

        # 1) Replace backslash-escaped quotes once
        candidates.append(s.replace('\\"', '"'))

        # 2) Decode escape sequences once/twice (handles \\\" -> \", then \" -> ")
        try:
            s1 = bytes(s, "utf-8").decode("unicode_escape")
            candidates.append(s1)
            try:
                s2 = bytes(s1, "utf-8").decode("unicode_escape")
                candidates.append(s2)
            except Exception:
                pass
        except Exception:
            pass

        # 3) Combine: decode then replace quotes
        for c in list(candidates):
            candidates.append(c.replace('\\"', '"'))

        for cand in candidates:
            cand = cand.strip()
            if not cand:
                continue
            try:
                return json.loads(cand)
            except Exception:
                continue

        return None


def _type_name(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int) and not isinstance(value, bool):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return "string"


def _flatten_json_for_table(value: Any, prefix: str = "") -> List[Dict[str, str]]:
    """
    Produces rows for markdown table:
      - Field (dot notation; arrays use `[]`)
      - Required (unknown -> Yes for fields present in example)
      - Type
      - Description (TBD)
    """
    rows: List[Dict[str, str]] = []

    def rec(v: Any, path: str) -> None:
        if isinstance(v, dict):
            if not v and path:
                rows.append({"field": path, "required": "Yes", "type": "object", "desc": "TBD"})
                return
            for k, vv in v.items():
                new_path = f"{path}.{k}" if path else str(k)
                rec(vv, new_path)
            return

        if isinstance(v, list):
            array_path = f"{path}[]" if path else "[]"
            if not v:
                rows.append({"field": array_path, "required": "Yes", "type": "array", "desc": "TBD"})
                return
            first = v[0]
            if isinstance(first, dict):
                # recurse with array item prefix
                for k, vv in first.items():
                    rec(vv, f"{array_path}.{k}")
            else:
                rows.append(
                    {
                        "field": array_path,
                        "required": "Yes",
                        "type": f"array<{_type_name(first)}>",
                        "desc": "TBD",
                    }
                )
            return

        # primitive
        if path:
            rows.append({"field": path, "required": "Yes", "type": _type_name(v), "desc": "TBD"})

    rec(value, prefix)
    return rows


def _schema_skeleton(value: Any) -> Any:
    """
    Create a JSON skeleton with type placeholders (no real values).
    """
    if isinstance(value, dict):
        return {k: _schema_skeleton(v) for k, v in value.items()}
    if isinstance(value, list):
        if not value:
            return []
        return [_schema_skeleton(value[0])]
    t = _type_name(value)
    if t == "string":
        return "string"
    if t == "integer":
        return 0
    if t == "number":
        return 0.0
    if t == "boolean":
        return False
    if t == "null":
        return None
    return "string"


def _md_table(rows: Iterable[Iterable[str]], headers: Iterable[str]) -> str:
    headers_list = list(headers)
    out = []
    out.append("| " + " | ".join(headers_list) + " |")
    out.append("|" + "|".join(["-" * (len(h) + 2) for h in headers_list]) + "|")
    for r in rows:
        out.append("| " + " | ".join(r) + " |")
    return "\n".join(out)


def _render_api_ref(
    *,
    title: str,
    description: str,
    method: str,
    url_path: str,
    content_type: str,
    execute_at_client: bool,
    encryption_required: bool,
    public_key: Optional[str],
    headers: Dict[str, str],
    query_params: List[Tuple[str, str]],
    request_json: Optional[Any],
    response_json: Optional[Any],
) -> str:
    # Headers table: hide values; keep names + some inferred descriptions
    header_rows: List[List[str]] = []
    for name in sorted(headers.keys(), key=lambda s: s.lower()):
        lname = name.lower()
        if lname in NOISY_HEADERS:
            continue
        required = "Yes" if lname in {"content-type", "authorization", "x-api-key"} else "No"
        desc = "TBD"
        if lname == "authorization":
            desc = "Authentication header (Bearer/Basic/etc.)"
        elif lname == "content-type":
            desc = f"Request content type (e.g. `{content_type}`)"
        elif lname == "x-api-key":
            desc = "API key for authentication"
        header_rows.append([name, required, "string", desc])

    if _header_lookup(headers, "Content-Type") is None:
        header_rows.insert(0, ["Content-Type", "Yes", "string", f"Request content type (e.g. `{content_type}`)"])

    qp_rows = [[k, "No", "string", (f"`{v}`" if v != "" else ""), "TBD"] for k, v in query_params]

    req_rows = _flatten_json_for_table(request_json) if request_json is not None else []

    req_schema_block = ""
    if request_json is not None:
        req_schema_block = "```json\n" + json.dumps(_schema_skeleton(request_json), indent=2) + "\n```"
    else:
        req_schema_block = "```json\n{}\n```"

    resp_schema_block = ""
    resp_rows: List[Dict[str, str]] = []
    if response_json is not None:
        resp_rows = _flatten_json_for_table(response_json)
        resp_schema_block = "```json\n" + json.dumps(_schema_skeleton(response_json), indent=2) + "\n```"
    else:
        resp_schema_block = "```json\n{\n  \"success\": true,\n  \"data\": {}\n}\n```"

    parts = []
    parts.append(f"# {title}\n")
    parts.append(description.strip() or "TBD\n")
    parts.append("\n## Endpoint\n")
    parts.append(
        _md_table(
            [
                ["Method", f"`{method}`"],
                ["URL", f"`{url_path}`"],
                ["Content-Type", f"`{content_type}`"],
            ],
            headers=["Property", "Value"],
        )
        + "\n"
    )
    parts.append("\n## Execution Info\n")
    parts.append(
        _md_table(
            [
                ["Execute at Client", "Yes" if execute_at_client else "No"],
                ["Encryption Required", "Yes" if encryption_required else "No"],
                ["Public Key", public_key if (encryption_required and public_key) else "N/A"],
            ],
            headers=["Property", "Value"],
        )
        + "\n"
    )

    parts.append("\n## Headers\n\n")
    parts.append(
        _md_table(
            header_rows if header_rows else [["(none)", "No", "string", ""]],
            headers=["Header", "Required", "Type", "Description"],
        )
        + "\n"
    )

    parts.append("\n## Query Parameters\n\n")
    if qp_rows:
        parts.append(_md_table(qp_rows, headers=["Parameter", "Required", "Type", "Default", "Description"]) + "\n")
    else:
        parts.append("_No query parameters._\n")

    parts.append("\n## Request Body\n\n")
    if req_rows:
        parts.append(
            _md_table(
                [[r["field"], r["required"], r["type"], r["desc"]] for r in req_rows],
                headers=["Field", "Required", "Type", "Description"],
            )
            + "\n"
        )
    else:
        parts.append("_No request body fields detected from cURL._\n")

    parts.append("\n### Request Schema (JSON)\n\n")
    parts.append(req_schema_block + "\n")

    parts.append("\n## Response Body\n\n### Success Response (2xx)\n\n")
    if resp_rows:
        parts.append(
            _md_table(
                [[r["field"], r["type"], r["desc"]] for r in resp_rows],
                headers=["Field", "Type", "Description"],
            )
            + "\n"
        )
    parts.append(resp_schema_block + "\n")

    parts.append("\n### Error Response (4xx/5xx)\n\n")
    parts.append(
        "```json\n{\n  \"success\": false,\n  \"error\": {\n    \"code\": \"TBD\",\n    \"message\": \"TBD\",\n    \"details\": {}\n  }\n}\n```\n"
    )

    parts.append("\n## Notes\n\n- Auth detected from cURL: **" + _detect_auth(headers) + "**\n- Fill in required/optional flags and descriptions once the API contract is confirmed.\n")

    return "".join(parts).rstrip() + "\n"


def _update_api_index(index_path: Path, api_title: str, api_file: str, description: str, client_side: bool, encrypted: bool) -> None:
    text = _read_text_file(index_path)
    lines = text.splitlines()

    marker = "<!-- Add new APIs above this line -->"
    try:
        idx = lines.index(marker)
    except ValueError:
        raise RuntimeError(f"Could not find marker in {index_path}: {marker}")

    # Keep description short in index
    short_desc = description.strip().splitlines()[0].strip()
    if len(short_desc) > 80:
        short_desc = short_desc[:77] + "..."

    row = f"| {api_title} | [{api_file}]({api_file}) | {short_desc or 'TBD'} | {'Yes' if client_side else 'No'} | {'Yes' if encrypted else 'No'} |"

    # Avoid duplicate insertion (by file)
    for l in lines:
        if f"[{api_file}]({api_file})" in l:
            return

    lines.insert(idx, row)
    index_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Generate API ref markdown from a cURL request.")
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--curl", help="cURL command as a single string")
    src.add_argument("--curl-file", help="Path to file containing the cURL command")

    parser.add_argument("--repo-root", default=str(DEFAULT_REPO_ROOT), help="Repo root path (default: this workspace)")
    parser.add_argument("--out", default="refs/apis", help="Output directory relative to repo root (default: refs/apis)")
    parser.add_argument("--title", help="API title (default: '<METHOD> <PATH>')")
    parser.add_argument("--description", default="TBD", help="API description text")
    parser.add_argument("--name", help="Output base name/slug (default: derived from title/path)")
    parser.add_argument("--execute-at-client", choices=["yes", "no"], default="no")
    parser.add_argument("--encryption-required", choices=["yes", "no"], default="no")
    parser.add_argument("--public-key", help="Public key reference/path to include when encryption-required=yes")
    parser.add_argument("--response-file", help="Optional JSON file containing a sample success response")
    parser.add_argument("--force", action="store_true", help="Overwrite existing API ref file if it exists")

    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).expanduser().resolve()
    out_dir = (repo_root / args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    curl_text = args.curl
    if args.curl_file:
        curl_text = _read_text_file(Path(args.curl_file).expanduser().resolve())
    if not curl_text:
        print("ERROR: No cURL provided", file=sys.stderr)
        return 2

    parsed = _parse_curl(curl_text)
    url_path, _server_hint, query_params = _split_url(parsed.url)
    content_type = _infer_content_type(parsed.headers, parsed.body_text)

    req_json = _json_loads_maybe(parsed.body_text)
    resp_json = None
    if args.response_file:
        resp_path = Path(args.response_file).expanduser().resolve()
        resp_json = json.loads(_read_text_file(resp_path))

    title = args.title
    if not title:
        title = f"{parsed.method} {url_path}"

    slug = args.name or _slugify(title.replace("/", " "))
    api_filename = f"{slug}.md"
    api_path = out_dir / api_filename

    md = _render_api_ref(
        title=title,
        description=args.description,
        method=parsed.method,
        url_path=url_path,
        content_type=content_type,
        execute_at_client=args.execute_at_client == "yes",
        encryption_required=args.encryption_required == "yes",
        public_key=args.public_key,
        headers=parsed.headers,
        query_params=query_params,
        request_json=req_json,
        response_json=resp_json,
    )

    if api_path.exists() and not args.force:
        print(f"ERROR: {api_path} already exists. Use --force to overwrite.", file=sys.stderr)
        return 1

    api_path.write_text(md, encoding="utf-8")

    index_path = repo_root / "refs/apis/_index.md"
    _update_api_index(
        index_path=index_path,
        api_title=title,
        api_file=api_filename,
        description=args.description,
        client_side=args.execute_at_client == "yes",
        encrypted=args.encryption_required == "yes",
    )

    print(f"Wrote: {api_path}")
    print(f"Updated: {index_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

