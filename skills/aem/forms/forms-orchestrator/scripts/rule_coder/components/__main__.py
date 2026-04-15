#!/usr/bin/env python3
"""CLI tool for discovering form components.

Usage:
    python -m rule_coder.components <form.json> [options]

Examples:
    python -m rule_coder.components form.json
    python -m rule_coder.components form.json -s "account"
    python -m rule_coder.components form.json -t panel
    python -m rule_coder.components form.json --tree
    python -m rule_coder.components form.json --json | jq '.[].name'
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

from ..context.form_context import FormContext


def truncate_id(component_id, max_len=50):
    """Truncate long IDs with ... in the middle."""
    if len(component_id) <= max_len:
        return component_id
    prefix = component_id[:15]
    suffix = component_id[-(max_len - 18):]
    return f"{prefix}...{suffix}"


def print_table(components):
    """Print components as a formatted table."""
    if not components:
        print("No components found.", file=sys.stderr)
        return

    col_name = max(max(len(c["name"]) for c in components), 4)
    col_display = max(max(len(c.get("displayName", "")) for c in components), 12)
    col_type = max(max(len(c.get("fieldType", "")) for c in components), 10)

    col_name = min(col_name, 30)
    col_display = min(col_display, 30)
    col_type = min(col_type, 15)

    header = f"{'NAME':<{col_name}}  {'DISPLAY NAME':<{col_display}}  {'FIELD TYPE':<{col_type}}  ID"
    print(header)
    print("\u2500" * len(header))

    for component in components:
        name = component["name"][:col_name]
        display = component.get("displayName", "")[:col_display]
        field_type = component.get("fieldType", "")[:col_type]
        component_id = truncate_id(component.get("id", ""))
        print(f"{name:<{col_name}}  {display:<{col_display}}  {field_type:<{col_type}}  {component_id}")

    print(f"\nFound {len(components)} components")


def print_tree(node, indent=0, is_last=True, prefix=""):
    """Print components as an indented tree."""
    name = node.get("name", node.get("id", "?"))
    field_type = node.get("fieldType", "")
    display_name = node.get("displayName", "")

    if indent == 0:
        connector = ""
        child_prefix = ""
    else:
        connector = "\\- " if is_last else "|- "
        child_prefix = prefix + ("   " if is_last else "|  ")

    label = f"{name} [{field_type}]"
    if display_name and display_name != name:
        label += f'  "{display_name}"'

    print(f"{prefix}{connector}{label}")

    items = node.get("items", [])
    for index, item in enumerate(items):
        print_tree(item, indent + 1, index == len(items) - 1, child_prefix)


def deduplicate(components):
    """Remove duplicate entries stored by both id and name."""
    seen = set()
    unique = []
    for component in components:
        component_id = component.get("id", "")
        if component_id and component_id not in seen:
            seen.add(component_id)
            unique.append(component)
    return unique


def render(context, args):
    """Render output for a loaded FormContext."""
    if args.tree:
        print_tree(context.tree_json)
        return

    if args.search:
        components = context.search_components(args.search)
    else:
        components = context.list_all_components()

    components = deduplicate(components)

    if args.field_type:
        components = [
            component for component in components
            if component.get("fieldType") == args.field_type
        ]

    if args.json:
        print(json.dumps(components, indent=2))
    else:
        print_table(components)


def render_once(form_path, args):
    """Load form and render output once."""
    try:
        context = FormContext.load_from_form_file(str(form_path))
    except Exception as exc:
        print(f"Error loading form: {exc}", file=sys.stderr)
        sys.exit(1)

    render(context, args)


def watch_loop(form_path, args):
    """Watch form.json for changes and re-render on modification."""
    last_mtime = 0
    print(f"Watching {form_path} for changes... (Ctrl+C to stop)\n")

    try:
        while True:
            try:
                mtime = os.path.getmtime(form_path)
            except OSError:
                time.sleep(1)
                continue

            if mtime != last_mtime:
                last_mtime = mtime
                print("\033[2J\033[H", end="")
                print(f"\033[2m{form_path.name} — updated {time.strftime('%H:%M:%S')}\033[0m\n")
                try:
                    context = FormContext.load_from_form_file(str(form_path))
                    render(context, args)
                except Exception as exc:
                    print(f"Error: {exc}", file=sys.stderr)

            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopped watching.")


def main():
    parser = argparse.ArgumentParser(
        description="Discover fields and panels in an AEM form",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("form_json", help="Path to form.json file")
    parser.add_argument("-s", "--search", help="Search by name (partial match)")
    parser.add_argument(
        "-t",
        "--type",
        dest="field_type",
        help="Filter by fieldType (panel, text-input, drop-down, etc.)",
    )
    parser.add_argument("--tree", action="store_true", help="Show hierarchical tree view")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("-w", "--watch", action="store_true", help="Watch for changes and auto-refresh")

    args = parser.parse_args()
    form_path = Path(args.form_json)
    if not form_path.exists():
        print(f"Error: File not found: {args.form_json}", file=sys.stderr)
        sys.exit(1)

    if args.watch:
        watch_loop(form_path, args)
    else:
        render_once(form_path, args)


if __name__ == "__main__":
    main()
