"""
Rule diff utility for comparing rule JSONs.

This module provides tools to compare expected vs actual rule JSON
and identify structural differences for debugging.
"""

from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class Difference:
    """Represents a difference between two rule JSONs."""
    path: str
    expected: Any
    actual: Any
    diff_type: str  # 'missing', 'extra', 'value_mismatch', 'type_mismatch'

    def __str__(self) -> str:
        if self.diff_type == 'missing':
            return f"{self.path}: missing (expected: {self._format_value(self.expected)})"
        elif self.diff_type == 'extra':
            return f"{self.path}: unexpected key (actual: {self._format_value(self.actual)})"
        elif self.diff_type == 'type_mismatch':
            return f"{self.path}: type mismatch (expected: {type(self.expected).__name__}, actual: {type(self.actual).__name__})"
        else:
            return f"{self.path}: expected {self._format_value(self.expected)}, got {self._format_value(self.actual)}"

    def _format_value(self, value: Any) -> str:
        if value is None:
            return "null"
        if isinstance(value, str):
            return f"'{value}'"
        if isinstance(value, dict):
            return "{...}"
        if isinstance(value, list):
            return f"[{len(value)} items]"
        return str(value)


def diff_rules(
    expected: Dict[str, Any],
    actual: Dict[str, Any],
    ignore_keys: Optional[List[str]] = None
) -> List[Difference]:
    """
    Compare two rule JSONs and return list of differences.

    Args:
        expected: The expected rule JSON (correct structure)
        actual: The actual rule JSON (generated/to validate)
        ignore_keys: Optional list of keys to ignore (e.g., ['_description'])

    Returns:
        List of Difference objects describing each difference
    """
    ignore_keys = ignore_keys or ['_description', '_natural_language']
    differences: List[Difference] = []

    def compare(exp: Any, act: Any, path: str = ""):
        # Handle None cases
        if exp is None and act is None:
            return
        if exp is None:
            differences.append(Difference(path, exp, act, 'extra'))
            return
        if act is None:
            differences.append(Difference(path, exp, act, 'missing'))
            return

        # Type mismatch
        if type(exp) != type(act):
            differences.append(Difference(path, exp, act, 'type_mismatch'))
            return

        # Compare dictionaries
        if isinstance(exp, dict):
            all_keys = set(exp.keys()) | set(act.keys())
            for key in all_keys:
                if key in ignore_keys:
                    continue
                new_path = f"{path}.{key}" if path else key

                if key not in act:
                    differences.append(Difference(new_path, exp[key], None, 'missing'))
                elif key not in exp:
                    differences.append(Difference(new_path, None, act[key], 'extra'))
                else:
                    compare(exp[key], act[key], new_path)

        # Compare lists
        elif isinstance(exp, list):
            if len(exp) != len(act):
                differences.append(Difference(
                    f"{path}.length",
                    len(exp),
                    len(act),
                    'value_mismatch'
                ))
            # Compare items up to the shorter length
            for i in range(min(len(exp), len(act))):
                compare(exp[i], act[i], f"{path}[{i}]")
            # Note missing items
            for i in range(len(act), len(exp)):
                differences.append(Difference(
                    f"{path}[{i}]",
                    exp[i],
                    None,
                    'missing'
                ))
            # Note extra items
            for i in range(len(exp), len(act)):
                differences.append(Difference(
                    f"{path}[{i}]",
                    None,
                    act[i],
                    'extra'
                ))

        # Compare primitives
        else:
            if exp != act:
                differences.append(Difference(path, exp, act, 'value_mismatch'))

    compare(expected, actual)
    return differences


def format_diff_report(differences: List[Difference]) -> str:
    """
    Format a list of differences into a readable report.

    Args:
        differences: List of Difference objects

    Returns:
        Formatted string report
    """
    if not differences:
        return "No differences found."

    lines = [f"Found {len(differences)} difference(s):", ""]

    # Group by type
    missing = [d for d in differences if d.diff_type == 'missing']
    extra = [d for d in differences if d.diff_type == 'extra']
    type_mismatch = [d for d in differences if d.diff_type == 'type_mismatch']
    value_mismatch = [d for d in differences if d.diff_type == 'value_mismatch']

    if missing:
        lines.append("MISSING:")
        for d in missing:
            lines.append(f"  - {d}")
        lines.append("")

    if extra:
        lines.append("UNEXPECTED:")
        for d in extra:
            lines.append(f"  - {d}")
        lines.append("")

    if type_mismatch:
        lines.append("TYPE MISMATCH:")
        for d in type_mismatch:
            lines.append(f"  - {d}")
        lines.append("")

    if value_mismatch:
        lines.append("VALUE MISMATCH:")
        for d in value_mismatch:
            lines.append(f"  - {d}")
        lines.append("")

    return "\n".join(lines)


def check_structure(
    rule: Dict[str, Any],
    expected_structure: Optional[Dict[str, Any]] = None
) -> Tuple[bool, List[str]]:
    """
    Check if a rule has the expected basic structure.

    Args:
        rule: The rule JSON to check
        expected_structure: Optional custom structure (uses default if None)

    Returns:
        Tuple of (is_valid, list of errors)
    """
    errors = []

    # Check ROOT
    if rule.get('nodeName') != 'ROOT':
        errors.append("Root node must have nodeName='ROOT'")

    if 'items' not in rule:
        errors.append("ROOT must have 'items' array")
        return False, errors

    if not rule['items']:
        errors.append("ROOT.items must not be empty")
        return False, errors

    # Check STATEMENT
    statement = rule['items'][0]
    if not isinstance(statement, dict):
        errors.append("First item in ROOT must be a STATEMENT object")
        return False, errors

    if statement.get('nodeName') != 'STATEMENT':
        errors.append("First item must have nodeName='STATEMENT'")

    if 'choice' not in statement:
        errors.append("STATEMENT must have 'choice' property")
        return False, errors

    # Check TRIGGER_SCRIPTS
    choice = statement['choice']
    if not isinstance(choice, dict):
        errors.append("STATEMENT.choice must be an object")
        return False, errors

    if choice.get('nodeName') != 'TRIGGER_SCRIPTS':
        errors.append("STATEMENT.choice must be TRIGGER_SCRIPTS")

    if 'items' not in choice:
        errors.append("TRIGGER_SCRIPTS must have 'items' array")
        return False, errors

    # Check SINGLE_TRIGGER_SCRIPTS
    if not choice['items']:
        errors.append("TRIGGER_SCRIPTS.items must not be empty")
        return False, errors

    sts = choice['items'][0]
    if not isinstance(sts, dict):
        errors.append("First TRIGGER_SCRIPTS item must be object")
        return False, errors

    if sts.get('nodeName') != 'SINGLE_TRIGGER_SCRIPTS':
        errors.append("Expected SINGLE_TRIGGER_SCRIPTS")

    if 'items' not in sts:
        errors.append("SINGLE_TRIGGER_SCRIPTS must have 'items'")
        return False, errors

    sts_items = sts['items']
    if len(sts_items) < 4:
        errors.append(f"SINGLE_TRIGGER_SCRIPTS must have 4+ items, found {len(sts_items)}")

    # Check required items
    if len(sts_items) >= 1:
        if sts_items[0].get('nodeName') != 'COMPONENT':
            errors.append("Item 0 must be COMPONENT")

    if len(sts_items) >= 2:
        if sts_items[1].get('nodeName') != 'TRIGGER_EVENT':
            errors.append("Item 1 must be TRIGGER_EVENT")

    if len(sts_items) >= 3:
        if sts_items[2].get('nodeName') != 'When':
            errors.append("Item 2 must be 'When' literal token")

    if len(sts_items) >= 4:
        if sts_items[3].get('nodeName') != 'TRIGGER_EVENT_SCRIPTS':
            errors.append("Item 3 must be TRIGGER_EVENT_SCRIPTS")
        else:
            tes = sts_items[3]
            if 'items' not in tes:
                errors.append("TRIGGER_EVENT_SCRIPTS must have 'items'")
            elif len(tes['items']) < 3:
                errors.append("TRIGGER_EVENT_SCRIPTS must have 3+ items")
            else:
                if tes['items'][0].get('nodeName') != 'CONDITION':
                    errors.append("TRIGGER_EVENT_SCRIPTS[0] must be CONDITION")
                if tes['items'][1].get('nodeName') != 'Then':
                    errors.append("TRIGGER_EVENT_SCRIPTS[1] must be 'Then'")
                if tes['items'][2].get('nodeName') != 'BLOCK_STATEMENTS':
                    errors.append("TRIGGER_EVENT_SCRIPTS[2] must be BLOCK_STATEMENTS")

    return len(errors) == 0, errors


def diagnose_rule(rule: Dict[str, Any]) -> str:
    """
    Provide diagnostic information about a rule.

    Args:
        rule: The rule JSON to diagnose

    Returns:
        Diagnostic report string
    """
    lines = ["Rule Diagnostic Report", "=" * 40, ""]

    # Basic structure check
    is_valid, structure_errors = check_structure(rule)
    lines.append(f"Structure Valid: {'Yes' if is_valid else 'No'}")
    if structure_errors:
        lines.append("Structure Errors:")
        for err in structure_errors:
            lines.append(f"  - {err}")
    lines.append("")

    # Extract key information
    try:
        lines.append("Rule Summary:")
        lines.append(f"  Event Name: {rule.get('eventName', 'N/A')}")
        lines.append(f"  Enabled: {rule.get('enabled', 'N/A')}")

        # Get trigger info
        sts = rule['items'][0]['choice']['items'][0]
        trigger_comp = sts['items'][0].get('value', {})
        trigger_event = sts['items'][1].get('value', 'N/A')
        lines.append(f"  Trigger: {trigger_comp.get('displayName', 'N/A')} {trigger_event}")

        # Get condition info
        tes = sts['items'][3]
        condition = tes['items'][0]
        if condition.get('choice') is None:
            lines.append("  Condition: None (always execute)")
        else:
            cond_type = condition['choice'].get('nodeName', 'Unknown')
            lines.append(f"  Condition: {cond_type}")

        # Get action info
        then_block = tes['items'][2]
        action_count = len(then_block.get('items', []))
        lines.append(f"  Then Actions: {action_count}")
        for i, action in enumerate(then_block.get('items', [])):
            action_name = action.get('choice', {}).get('nodeName', 'Unknown')
            lines.append(f"    {i+1}. {action_name}")

        # Check for else block
        if len(tes['items']) > 4:
            else_block = tes['items'][4]
            else_count = len(else_block.get('items', []))
            lines.append(f"  Else Actions: {else_count}")
            for i, action in enumerate(else_block.get('items', [])):
                action_name = action.get('choice', {}).get('nodeName', 'Unknown')
                lines.append(f"    {i+1}. {action_name}")
        else:
            lines.append("  Else Actions: None")

    except (KeyError, IndexError, TypeError) as e:
        lines.append(f"  Error extracting summary: {e}")

    return "\n".join(lines)
