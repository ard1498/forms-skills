"""Grammar loader for the annotated subset grammar."""

import json
from pathlib import Path
from typing import Dict, Any, List, Set, Optional

# Path to the annotated subset grammar
GRAMMAR_PATH = Path(__file__).parent.parent / 'grammar' / 'annotated_subset_grammar.json'

# Cached grammar
_grammar_cache: Optional[Dict[str, Any]] = None


def load_grammar() -> Dict[str, Any]:
    """
    Load the annotated subset grammar from JSON file.

    Returns:
        The grammar dictionary.

    Raises:
        FileNotFoundError: If the grammar file doesn't exist.
    """
    global _grammar_cache

    if _grammar_cache is not None:
        return _grammar_cache

    if not GRAMMAR_PATH.exists():
        raise FileNotFoundError(f"Grammar file not found: {GRAMMAR_PATH}")

    with open(GRAMMAR_PATH, 'r') as f:
        _grammar_cache = json.load(f)

    return _grammar_cache


def get_supported_actions() -> List[str]:
    """
    Get list of supported action types from grammar.

    Returns:
        List of supported action node names.
    """
    grammar = load_grammar()
    instructions = grammar.get('_INSTRUCTIONS', {})
    return instructions.get('supported_actions', [])


def get_not_supported_actions() -> List[str]:
    """
    Get list of actions that are NOT supported.

    Returns:
        List of unsupported action node names.
    """
    grammar = load_grammar()
    instructions = grammar.get('_INSTRUCTIONS', {})
    not_supported = instructions.get('not_supported', {})
    return not_supported.get('actions', [])


def get_not_supported_expressions() -> List[str]:
    """
    Get list of expression types that are NOT supported.

    Returns:
        List of unsupported expression node names.
    """
    grammar = load_grammar()
    instructions = grammar.get('_INSTRUCTIONS', {})
    not_supported = instructions.get('not_supported', {})
    return not_supported.get('expressions', [])


def get_supported_node_names() -> Set[str]:
    """
    Get all node names defined in the grammar (excluding instructions/metadata).

    Returns:
        Set of valid node names.
    """
    grammar = load_grammar()

    # Exclude special keys that start with underscore
    node_names = {key for key in grammar.keys() if not key.startswith('_')}

    return node_names


def get_node_definition(node_name: str) -> Optional[Dict[str, Any]]:
    """
    Get the definition for a specific node.

    Args:
        node_name: Name of the node.

    Returns:
        Node definition dictionary or None if not found.
    """
    grammar = load_grammar()
    return grammar.get(node_name)


def get_node_type(node_name: str) -> Optional[str]:
    """
    Get the type of a node (SEQUENCE, CHOICE, ARRAY, TERMINAL, LITERAL_TOKEN).

    Args:
        node_name: Name of the node.

    Returns:
        Node type string or None if not found.
    """
    definition = get_node_definition(node_name)
    if definition:
        return definition.get('node_type')
    return None


def get_choice_options(node_name: str) -> List[str]:
    """
    Get the valid choice options for a CHOICE node.

    Args:
        node_name: Name of the choice node.

    Returns:
        List of valid choice option names.
    """
    definition = get_node_definition(node_name)
    if definition:
        # Check for explicit choice_options
        if 'choice_options' in definition:
            return definition['choice_options']

        # Parse from rule string (format: "OPTION1 | OPTION2 | OPTION3")
        rule = definition.get('rule', '')
        if '|' in rule:
            options = [opt.strip() for opt in rule.split('|')]
            return options

        # Check how_to_choose keys
        how_to_choose = definition.get('how_to_choose', {})
        if how_to_choose:
            return list(how_to_choose.keys())

    return []


def get_sequence_items(node_name: str) -> List[str]:
    """
    Get the expected items for a SEQUENCE node.

    Args:
        node_name: Name of the sequence node.

    Returns:
        List of item descriptions/names.
    """
    definition = get_node_definition(node_name)
    if definition:
        return definition.get('items_order', [])
    return []


def is_valid_operator(operator_name: str) -> bool:
    """
    Check if an operator name is valid.

    Args:
        operator_name: The operator name to check.

    Returns:
        True if valid, False otherwise.
    """
    grammar = load_grammar()
    operator_def = grammar.get('OPERATOR', {})

    # Get valid operators from rule string
    rule = operator_def.get('rule', '')
    valid_operators = [opt.strip() for opt in rule.split('|')]

    return operator_name in valid_operators


def get_operator_mappings() -> Dict[str, str]:
    """
    Get mapping of natural language to operator names.

    Returns:
        Dictionary mapping NL phrases to operator node names.
    """
    grammar = load_grammar()
    operator_def = grammar.get('OPERATOR', {})
    return operator_def.get('common_mappings', {})


def is_unary_operator(operator_name: str) -> bool:
    """
    Check if an operator is unary (doesn't need right operand).

    Args:
        operator_name: The operator name.

    Returns:
        True if unary, False otherwise.
    """
    unary_operators = {
        'IS_EMPTY', 'IS_NOT_EMPTY', 'IS_TRUE', 'IS_FALSE',
        'IS_VALID', 'IS_NOT_VALID'
    }
    return operator_name in unary_operators
