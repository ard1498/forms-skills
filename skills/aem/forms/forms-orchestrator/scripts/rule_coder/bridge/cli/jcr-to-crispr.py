#!/usr/bin/env python3
"""
Convert JCR form JSON to CRISPR (CoreComponent) format.

Usage:
    python jcr-to-crispr.py <form.json>
    python jcr-to-crispr.py --stdin
    python jcr-to-crispr.py --stdin --base-dir /path/to/workspace

Output:
    JSON object with the converted CRISPR form structure to stdout

Fragment resolution:
    When the input form references fragment paths (fragmentPath), the script
    resolves them by loading the corresponding .form.json files from disk.
    For stdin mode, pass --base-dir to enable fragment resolution.
"""

import copy
import json
import sys
from pathlib import Path

# Add vendored packages to Python path
_vendor_dir = str(Path(__file__).resolve().parent.parent / "vendor")
if _vendor_dir not in sys.path:
    sys.path.insert(0, _vendor_dir)

from formsgenailib.core.form import (
    InfinityJsonForm,
    jcr_to_core_component,
)


def _resolve_repo_dir(base_dir: Path) -> Path:
    """Return the repo directory for a workspace or repo path."""
    if (base_dir / "repo").exists():
        return base_dir / "repo"
    if base_dir.name == "repo":
        return base_dir
    return base_dir / "repo"


def make_fragment_loader(base_dir):
    """
    Return a fragment loader that resolves AEM fragmentPath values to local files.

    Mapping:
        fragmentPath: /content/forms/af/team/fragments/example
        -> {base_dir}/repo/content/forms/af/team/fragments/example.form.json

    Args:
        base_dir: Workspace root or repo directory.
    """
    repo_dir = _resolve_repo_dir(Path(base_dir))

    def loader(fragment_path):
        rel = fragment_path.lstrip("/")
        candidate = repo_dir / rel
        parent = candidate.parent
        stem = candidate.name
        for suffix in (".form.json", ".infinity.json"):
            path = parent / f"{stem}{suffix}"
            if path.exists():
                try:
                    return json.loads(path.read_text())
                except Exception:
                    return None
        return None

    return loader


def _find_workspace_root(start: Path) -> Path:
    """Walk up from a path to find the workspace root that owns `repo/`."""
    current = start if start.is_dir() else start.parent
    for _ in range(16):
        if (current / "repo").exists():
            return current
        if current.name == "repo":
            return current.parent
        parent = current.parent
        if parent == current:
            break
        current = parent
    return start if start.is_dir() else start.parent


def _inline_fragments(element_dict: dict, fragment_loader, resolving: set | None = None) -> dict:
    """Inline fragment children into the JCR dict before conversion."""
    if resolving is None:
        resolving = set()

    result = dict(element_dict)
    fragment_path = result.get("fragmentPath")
    if fragment_path and fragment_path not in resolving:
        resolving.add(fragment_path)
        fragment_json = fragment_loader(fragment_path)
        if fragment_json:
            suffix = [1]
            for key, value in fragment_json.items():
                if isinstance(value, dict) and "fieldType" in value:
                    new_key = key
                    while new_key in result:
                        new_key = f"{key}_{suffix[0]}"
                        suffix[0] += 1
                    result[new_key] = copy.deepcopy(value)
        resolving.discard(fragment_path)

    for key, value in list(result.items()):
        if isinstance(value, dict) and (
            "fieldType" in value or "sling:resourceType" in value
        ):
            result[key] = _inline_fragments(value, fragment_loader, resolving)

    return result


def convert_jcr_to_crispr(jcr_json: dict, fragment_loader=None) -> dict:
    """
    Convert JCR form JSON to CRISPR (CoreComponent) format.

    Args:
        jcr_json: JCR form JSON (Infinity format)
        fragment_loader: Optional callable used to resolve fragmentPath references.

    Returns:
        CRISPR form JSON (CoreComponent format)
    """
    if fragment_loader:
        jcr_json = _inline_fragments(jcr_json, fragment_loader)

    # The vendored formsgenailib in this repo does not expose fragment_loader
    # on InfinityJsonForm, so fragment resolution has to happen before parsing.
    infinity_form = InfinityJsonForm(jcr_json)

    # Convert to CoreComponent format
    core_form = jcr_to_core_component(infinity_form)

    # Export as JSON dict
    return core_form.model_dump(by_alias=True, exclude_none=True)


def main():
    args = sys.argv[1:]

    if len(args) == 0:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "Usage: python jcr-to-crispr.py <form.json> or --stdin [--base-dir <path>]",
                }
            ),
            file=sys.stderr,
        )
        sys.exit(1)

    base_dir = None
    filtered_args = []
    i = 0
    while i < len(args):
        if args[i] == "--base-dir" and i + 1 < len(args):
            base_dir = args[i + 1]
            i += 2
            continue
        filtered_args.append(args[i])
        i += 1
    args = filtered_args

    jcr_json = None
    fragment_loader = None

    if args[0] == "--stdin":
        # Read from stdin
        try:
            stdin_content = sys.stdin.read()
            jcr_json = json.loads(stdin_content)
        except json.JSONDecodeError as e:
            print(
                json.dumps({"success": False, "error": f"Invalid JSON input: {e}"}),
                file=sys.stderr,
            )
            sys.exit(1)
        if base_dir:
            fragment_loader = make_fragment_loader(base_dir)
    else:
        # Read from file
        file_path = Path(args[0]).resolve()
        if not file_path.exists():
            print(
                json.dumps({"success": False, "error": f"File not found: {file_path}"}),
                file=sys.stderr,
            )
            sys.exit(1)

        workspace_root = Path(base_dir) if base_dir else _find_workspace_root(file_path)
        fragment_loader = make_fragment_loader(workspace_root)

        try:
            jcr_json = json.loads(file_path.read_text())
        except json.JSONDecodeError as e:
            print(
                json.dumps({"success": False, "error": f"Error parsing file: {e}"}),
                file=sys.stderr,
            )
            sys.exit(1)

    # Check if this is actually JCR format
    if "jcr:primaryType" not in jcr_json and "sling:resourceType" not in jcr_json:
        # Already in CRISPR format or unknown format, pass through
        print(
            json.dumps(
                {
                    "success": True,
                    "crispr": jcr_json,
                    "converted": False,
                    "note": "Input does not appear to be JCR format, passing through unchanged",
                }
            )
        )
        return

    try:
        crispr_json = convert_jcr_to_crispr(jcr_json, fragment_loader=fragment_loader)
        print(json.dumps({"success": True, "crispr": crispr_json, "converted": True}))
    except Exception as e:
        print(
            json.dumps({"success": False, "error": f"Conversion error: {e}"}),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
