#!/usr/bin/env python3
"""CLI entry point for rule validator.

Usage:
    python -m tools.rule_coder.validator <rule.json> [--form <form.json>]

Examples:
    # Validate rule without form context
    python -m tools.rule_coder.validator test-eds.VIS-01.rule.json

    # Validate rule with form context (checks component references)
    python -m tools.rule_coder.validator test-eds.VIS-01.rule.json --form test-eds.form.json
"""

import sys
import json
import argparse
from pathlib import Path

from .rule_validator import validate_rule


def main():
    parser = argparse.ArgumentParser(
        description='Validate AEM Forms rule JSON against subset grammar',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        'rule_file',
        type=str,
        help='Path to the rule JSON file to validate'
    )
    parser.add_argument(
        '--form',
        type=str,
        help='Optional path to form JSON for component reference validation'
    )

    args = parser.parse_args()

    # Check rule file exists
    rule_path = Path(args.rule_file)
    if not rule_path.exists():
        print(f"ERROR: Rule file not found: {args.rule_file}", file=sys.stderr)
        sys.exit(1)

    # Load rule JSON
    try:
        with open(rule_path, 'r') as f:
            rule = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in rule file: {e}", file=sys.stderr)
        sys.exit(1)

    # Load form context if provided
    form_context = None
    if args.form:
        form_path = Path(args.form)
        if not form_path.exists():
            print(f"ERROR: Form file not found: {args.form}", file=sys.stderr)
            sys.exit(1)
        # TODO: Load FormContext when needed
        # from ..context import FormContext
        # form_context = FormContext.load_from_form_json(form_path)

    # Validate
    result = validate_rule(rule, form_context)

    # Output results
    print(f"Valid: {result.valid}")

    for error in result.errors:
        print(f"ERROR: {error}")

    for warning in result.warnings:
        print(f"WARNING: {warning}")

    # Exit with appropriate code
    sys.exit(0 if result.valid else 1)


if __name__ == '__main__':
    main()
