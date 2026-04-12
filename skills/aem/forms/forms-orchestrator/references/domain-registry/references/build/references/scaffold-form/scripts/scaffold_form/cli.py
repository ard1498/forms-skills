"""CLI for scaffold_form — creates empty AEM Adaptive Form JSON from template.

Usage:
    python -m scaffold_form my-registration-form
    python -m scaffold_form my-form --title "My Custom Title" --output-dir out/ --with-submit
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def _name_to_title(form_name: str) -> str:
    """Convert a kebab-case or snake_case form name to a title-case string.

    Examples:
        my-registration-form  -> My Registration Form
        contact_us             -> Contact Us
        simpleform             -> Simpleform
    """
    return form_name.replace("-", " ").replace("_", " ").title()


def _build_form_json(title: str, *, with_submit: bool = False) -> dict:
    """Return the JCR-format AEM Adaptive Form structure."""
    form: dict = {
        "jcr:primaryType": "nt:unstructured",
        "sling:resourceType": "fd/franklin/components/form/v1/form",
        "fieldType": "form",
        "fd:version": "2.1",
        "title": title,
    }

    if with_submit:
        form["submit"] = {
            "jcr:primaryType": "nt:unstructured",
            "sling:resourceType": "core/fd/components/form/actions/submit/v1/submit",
            "fieldType": "form-submit-button",
            "name": "submit",
            "jcr:title": "Submit",
        }

    return form


def _build_rule_json() -> dict:
    """Return the default (empty) rule definition."""
    return {}


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="scaffold_form",
        description="Create an empty AEM Adaptive Form JSON from a template.",
    )
    parser.add_argument(
        "form_name",
        help="Name of the form (used as the file-name stem, e.g. 'my-form').",
    )
    parser.add_argument(
        "--title",
        default=None,
        help="Human-readable form title. Defaults to the form name in Title Case.",
    )
    parser.add_argument(
        "--output-dir",
        default="form",
        dest="output_dir",
        help="Directory where the generated files are written (default: form/).",
    )
    parser.add_argument(
        "--with-submit",
        action="store_true",
        default=False,
        dest="with_submit",
        help="Include a submit button in the generated form.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Entry point. Returns an integer exit code (0 = success)."""
    args = _parse_args(argv)

    form_name: str = args.form_name
    title: str = args.title if args.title else _name_to_title(form_name)
    output_dir = Path(args.output_dir)

    form_path = output_dir / f"{form_name}.form.json"
    rule_path = output_dir / f"{form_name}.rule.json"

    # ── Guard: refuse to overwrite existing form.json ────────────────
    if form_path.exists():
        print(
            f"Error: {form_path} already exists. "
            "Remove it first or choose a different form name / output directory.",
            file=sys.stderr,
        )
        return 1

    # ── Ensure output directory exists ───────────────────────────────
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        print(
            f"Error: could not create output directory '{output_dir}': {exc}",
            file=sys.stderr,
        )
        return 1

    # ── Build JSON payloads ──────────────────────────────────────────
    form_json = _build_form_json(title, with_submit=args.with_submit)
    rule_json = _build_rule_json()

    # ── Write files ──────────────────────────────────────────────────
    try:
        form_path.write_text(json.dumps(form_json, indent=2) + "\n", encoding="utf-8")
        rule_path.write_text(json.dumps(rule_json, indent=2) + "\n", encoding="utf-8")
    except OSError as exc:
        print(f"Error: failed to write output files: {exc}", file=sys.stderr)
        return 1

    # ── Print confirmation + JSON summary to stdout ──────────────────
    summary = {
        "form_name": form_name,
        "title": title,
        "with_submit": args.with_submit,
        "files_created": [
            str(form_path),
            str(rule_path),
        ],
    }

    print(f"✔ Created {form_path}")
    print(f"✔ Created {rule_path}")
    print()
    print(json.dumps(summary, indent=2))

    return 0
