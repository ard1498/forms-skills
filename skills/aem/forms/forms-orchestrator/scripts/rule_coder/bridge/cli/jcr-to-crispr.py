#!/usr/bin/env python3
"""
Convert JCR form JSON to CRISPR (CoreComponent) format.

Usage:
    python jcr-to-crispr.py <form.json>
    python jcr-to-crispr.py --stdin

Output:
    JSON object with the converted CRISPR form structure to stdout
"""

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


def convert_jcr_to_crispr(jcr_json: dict) -> dict:
    """
    Convert JCR form JSON to CRISPR (CoreComponent) format.

    Args:
        jcr_json: JCR form JSON (Infinity format)

    Returns:
        CRISPR form JSON (CoreComponent format)
    """
    # Use InfinityJsonForm to parse the JCR JSON
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
                    "error": "Usage: python jcr-to-crispr.py <form.json> or --stdin",
                }
            ),
            file=sys.stderr,
        )
        sys.exit(1)

    jcr_json = None

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
    else:
        # Read from file
        file_path = Path(args[0]).resolve()
        if not file_path.exists():
            print(
                json.dumps({"success": False, "error": f"File not found: {file_path}"}),
                file=sys.stderr,
            )
            sys.exit(1)

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
        crispr_json = convert_jcr_to_crispr(jcr_json)
        print(json.dumps({"success": True, "crispr": crispr_json, "converted": True}))
    except Exception as e:
        print(
            json.dumps({"success": False, "error": f"Conversion error: {e}"}),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
