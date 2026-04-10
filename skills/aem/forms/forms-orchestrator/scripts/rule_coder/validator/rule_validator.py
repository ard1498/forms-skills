"""
Rule validation service for AI-generated rules.

Validates rule JSON against:
1. Structure - correct node hierarchy (ROOT → STATEMENT → TRIGGER_SCRIPTS → ...)
2. Grammar - all nodes exist in subset grammar
3. Subset - only allowed nodes used (no WSDL_STATEMENT, etc.)
4. References - component and function references exist in form context
"""

import logging
from typing import Dict, List, Any, Optional, Set

from .models import ValidationResult
from .grammar_loader import (
    get_supported_actions,
    get_supported_node_names,
    get_not_supported_actions,
    get_node_type,
    get_choice_options,
    is_unary_operator
)

logger = logging.getLogger(__name__)


# Nodes that are NOT allowed in the simplified subset
NOT_SUPPORTED_NODES = {
    'WSDL_STATEMENT',
    'ASYNC_FUNCTION_CALL',
    'BINARY_EXPRESSION',
    'STRING_BINARY_EXPRESSION',
    'ARITHMETIC_EXPRESSION',
    'MEMBER_ACCESS_EXPRESSION',
    'WSDL_OUTPUT_EXPRESSION'
}

# Literal token nodes (these don't need to be in the grammar as separate definitions)
LITERAL_TOKENS = {
    'When', 'Then', 'Else', 'to', 'of', 'in', 'on', 'key', 'value', 'from'
}

# Nodes that can have value property
VALUE_NODES = {
    'COMPONENT', 'AFCOMPONENT', 'VALUE_FIELD', 'PANEL', 'REPEATABLE_COMPONENT',
    'STRING_LITERAL', 'NUMERIC_LITERAL', 'BOOLEAN_LITERAL', 'DATE_LITERAL',
    'TRIGGER_EVENT', 'UTM_PARAMETER', 'QUERY_PARAMETER', 'BROWSER_DETAILS',
    'URL_DETAILS', 'URL_LITERAL', 'PROPERTY_LIST'
}


class RuleValidator:
    """Validates generated rule JSON against grammar and context."""

    def __init__(self, form_context: Optional[Any] = None):
        """
        Initialize validator.

        Args:
            form_context: Optional FormContext for reference validation.
        """
        self.form_context = form_context
        self._supported_actions = set(get_supported_actions())
        self._supported_nodes = get_supported_node_names()

    def validate(self, rule: Dict[str, Any]) -> ValidationResult:
        """
        Validate a rule JSON.

        Args:
            rule: The rule JSON to validate.

        Returns:
            ValidationResult with validation status and errors.
        """
        errors: List[str] = []
        warnings: List[str] = []

        # Basic structure validation
        if not isinstance(rule, dict):
            errors.append("Rule must be a JSON object")
            return ValidationResult(valid=False, errors=errors, warnings=warnings)

        # Validate ROOT structure
        errors.extend(self._validate_root(rule))

        # Validate against subset grammar (no unsupported nodes)
        errors.extend(self._validate_subset_compliance(rule))

        # Validate references if form context is available
        if self.form_context:
            ref_errors, ref_warnings = self._validate_references(rule)
            errors.extend(ref_errors)
            warnings.extend(ref_warnings)

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    def _validate_root(self, rule: Dict[str, Any]) -> List[str]:
        """Validate ROOT node structure."""
        errors = []

        # Check nodeName is ROOT
        if rule.get('nodeName') != 'ROOT':
            errors.append("Rule must have root node with nodeName='ROOT'")
            return errors

        # Check ROOT has items
        if 'items' not in rule or not isinstance(rule['items'], list):
            errors.append("ROOT node must have 'items' array")
            return errors

        if len(rule['items']) == 0:
            errors.append("ROOT node must have at least one item")
            return errors

        # Validate STATEMENT node
        statement = rule['items'][0]
        errors.extend(self._validate_statement(statement))

        return errors

    def _validate_statement(self, node: Dict[str, Any]) -> List[str]:
        """Validate STATEMENT node."""
        errors = []

        if not isinstance(node, dict):
            errors.append("STATEMENT must be a JSON object")
            return errors

        if node.get('nodeName') != 'STATEMENT':
            errors.append("First item in ROOT must be STATEMENT node")
            return errors

        if 'choice' not in node:
            errors.append("STATEMENT node must have 'choice' property")
            return errors

        choice = node['choice']
        if not isinstance(choice, dict):
            errors.append("STATEMENT.choice must be a JSON object")
            return errors

        if choice.get('nodeName') != 'TRIGGER_SCRIPTS':
            errors.append("STATEMENT choice must be TRIGGER_SCRIPTS for trigger event rules")
            return errors

        # Validate TRIGGER_SCRIPTS structure
        if 'items' in choice and isinstance(choice['items'], list) and len(choice['items']) > 0:
            trigger_scripts = choice['items'][0]
            if isinstance(trigger_scripts, dict) and trigger_scripts.get('nodeName') == 'SINGLE_TRIGGER_SCRIPTS':
                errors.extend(self._validate_single_trigger_scripts(trigger_scripts))

        return errors

    def _validate_single_trigger_scripts(self, node: Dict[str, Any]) -> List[str]:
        """Validate SINGLE_TRIGGER_SCRIPTS node."""
        errors = []

        if 'items' not in node or not isinstance(node['items'], list):
            errors.append("SINGLE_TRIGGER_SCRIPTS must have 'items' array")
            return errors

        items = node['items']

        # Should have at least 4 items: COMPONENT, TRIGGER_EVENT, "When" token, TRIGGER_EVENT_SCRIPTS
        if len(items) < 4:
            errors.append(f"SINGLE_TRIGGER_SCRIPTS must have at least 4 items, found {len(items)}")
            return errors

        # Check COMPONENT
        if not isinstance(items[0], dict) or items[0].get('nodeName') != 'COMPONENT':
            errors.append("First item in SINGLE_TRIGGER_SCRIPTS must be COMPONENT")
        elif 'value' not in items[0]:
            errors.append("COMPONENT node must have 'value' property")

        # Check TRIGGER_EVENT
        if not isinstance(items[1], dict) or items[1].get('nodeName') != 'TRIGGER_EVENT':
            errors.append("Second item in SINGLE_TRIGGER_SCRIPTS must be TRIGGER_EVENT")
        elif 'value' not in items[1]:
            errors.append("TRIGGER_EVENT node must have 'value' property")

        # Check "When" token
        if not isinstance(items[2], dict) or items[2].get('nodeName') != 'When':
            errors.append("Third item in SINGLE_TRIGGER_SCRIPTS must be 'When' literal token")

        # Check TRIGGER_EVENT_SCRIPTS
        if not isinstance(items[3], dict) or items[3].get('nodeName') != 'TRIGGER_EVENT_SCRIPTS':
            errors.append("Fourth item in SINGLE_TRIGGER_SCRIPTS must be TRIGGER_EVENT_SCRIPTS")
        else:
            errors.extend(self._validate_trigger_event_scripts(items[3]))

        return errors

    def _validate_trigger_event_scripts(self, node: Dict[str, Any]) -> List[str]:
        """Validate TRIGGER_EVENT_SCRIPTS node."""
        errors = []

        if 'items' not in node or not isinstance(node['items'], list):
            errors.append("TRIGGER_EVENT_SCRIPTS must have 'items' array")
            return errors

        items = node['items']

        # Must have at least 3 items: CONDITION, "Then" token, BLOCK_STATEMENTS
        if len(items) < 3:
            errors.append(f"TRIGGER_EVENT_SCRIPTS must have at least 3 items, found {len(items)}")
            return errors

        # Check CONDITION
        if not isinstance(items[0], dict) or items[0].get('nodeName') != 'CONDITION':
            errors.append("First item in TRIGGER_EVENT_SCRIPTS must be CONDITION")
        else:
            # Validate CONDITION has nested property
            if items[0].get('nested') is None:
                errors.append("CONDITION node must have 'nested' property (should be false)")

        # Check "Then" token
        if not isinstance(items[1], dict) or items[1].get('nodeName') != 'Then':
            errors.append("Second item in TRIGGER_EVENT_SCRIPTS must be 'Then' literal token")

        # Check BLOCK_STATEMENTS (then actions)
        if not isinstance(items[2], dict) or items[2].get('nodeName') != 'BLOCK_STATEMENTS':
            errors.append("Third item in TRIGGER_EVENT_SCRIPTS must be BLOCK_STATEMENTS")
        else:
            errors.extend(self._validate_block_statements(items[2]))

        # If there are more items, check for Else block
        if len(items) > 3:
            # Check "Else" token
            if not isinstance(items[3], dict) or items[3].get('nodeName') != 'Else':
                errors.append("Fourth item in TRIGGER_EVENT_SCRIPTS must be 'Else' literal token")

            # Check BLOCK_STATEMENTS (else actions)
            if len(items) > 4:
                if not isinstance(items[4], dict) or items[4].get('nodeName') != 'BLOCK_STATEMENTS':
                    errors.append("Fifth item in TRIGGER_EVENT_SCRIPTS must be BLOCK_STATEMENTS")
                else:
                    errors.extend(self._validate_block_statements(items[4]))

        return errors

    def _validate_block_statements(self, node: Dict[str, Any]) -> List[str]:
        """Validate BLOCK_STATEMENTS node."""
        errors = []

        if 'items' not in node or not isinstance(node['items'], list):
            errors.append("BLOCK_STATEMENTS must have 'items' array")
            return errors

        if len(node['items']) == 0:
            errors.append("BLOCK_STATEMENTS must have at least one action")
            return errors

        # Validate each BLOCK_STATEMENT
        for i, item in enumerate(node['items']):
            if not isinstance(item, dict):
                errors.append(f"BLOCK_STATEMENTS item {i} must be a JSON object")
                continue

            if item.get('nodeName') != 'BLOCK_STATEMENT':
                errors.append(f"BLOCK_STATEMENTS item {i} must have nodeName='BLOCK_STATEMENT'")
                continue

            if 'choice' not in item:
                errors.append(f"BLOCK_STATEMENT {i} must have 'choice' property")
                continue

            choice = item['choice']
            if not isinstance(choice, dict):
                errors.append(f"BLOCK_STATEMENT {i}.choice must be a JSON object")
                continue

            action_name = choice.get('nodeName')
            if not action_name:
                errors.append(f"BLOCK_STATEMENT {i}.choice must have 'nodeName'")
                continue

            # Check if action is in supported actions
            if action_name not in self._supported_actions:
                errors.append(f"Action '{action_name}' is not supported in simplified grammar")

        return errors

    def _validate_subset_compliance(self, node: Any) -> List[str]:
        """
        Recursively validate that no unsupported nodes are used.

        Args:
            node: The node to validate.

        Returns:
            List of errors for unsupported nodes.
        """
        errors = []

        if isinstance(node, dict):
            node_name = node.get('nodeName')

            if node_name:
                # Check if node is explicitly not supported
                if node_name in NOT_SUPPORTED_NODES:
                    errors.append(f"Node '{node_name}' is not supported in simplified grammar. Use FUNCTION_CALL instead.")

                # Check if node is a known node (or literal token)
                if node_name not in self._supported_nodes and node_name not in LITERAL_TOKENS:
                    # Reject unknown node names - NEVER allow invented nodeNames
                    if not self._is_known_pattern(node_name):
                        errors.append(f"Unknown node name '{node_name}' - not in grammar whitelist. Only use nodeNames from annotated_subset_grammar.json")

            # Recurse into child nodes
            for key, val in node.items():
                if key in ['items', 'choice', 'params']:
                    errors.extend(self._validate_subset_compliance(val))

        elif isinstance(node, list):
            for item in node:
                errors.extend(self._validate_subset_compliance(item))

        return errors

    def _is_known_pattern(self, node_name: str) -> bool:
        """Check if a node name matches a known pattern."""
        # Operator names
        operators = {
            'EQUALS_TO', 'NOT_EQUALS_TO', 'GREATER_THAN', 'LESS_THAN',
            'CONTAINS', 'DOES_NOT_CONTAIN', 'STARTS_WITH', 'ENDS_WITH',
            'AND', 'OR', 'IS_EMPTY', 'IS_NOT_EMPTY', 'IS_TRUE', 'IS_FALSE',
            'IS_BEFORE', 'IS_AFTER', 'HAS_SELECTED', 'IS_VALID', 'IS_NOT_VALID'
        }

        # Navigation options
        nav_options = {'NEW_WINDOW', 'NEW_TAB', 'SAME_TAB', 'NEXT_ITEM', 'PREVIOUS_ITEM', 'FIRST_ITEM'}

        # Boolean literal rules
        bool_rules = {'True', 'False'}

        return node_name in operators or node_name in nav_options or node_name in bool_rules

    def _validate_references(self, node: Any) -> tuple:
        """
        Recursively validate component and function references.

        Args:
            node: The node to validate.

        Returns:
            Tuple of (errors, warnings).
        """
        errors = []
        warnings = []

        if isinstance(node, dict):
            node_name = node.get('nodeName')

            # Check component references
            if node_name in ['COMPONENT', 'AFCOMPONENT', 'VALUE_FIELD', 'PANEL', 'REPEATABLE_COMPONENT']:
                value = node.get('value')
                if isinstance(value, dict):
                    comp_id = value.get('id')
                    if comp_id:
                        # CRITICAL: Check for $parent references - these cannot be validated
                        # at design time and won't appear in the Rule Editor Form Object dropdown
                        if '$parent' in comp_id:
                            errors.append(
                                f"$parent reference not allowed: {comp_id}. "
                                f"Child fragments cannot directly reference parent fields. "
                                f"Use events for cross-fragment communication instead."
                            )
                        elif self.form_context:
                            component = self.form_context.get_component(comp_id)
                            if component is None:
                                errors.append(f"Component not found: {comp_id}")

            # Check function references
            elif node_name == 'FUNCTION_CALL':
                func_name = node.get('functionName')
                if isinstance(func_name, dict):
                    func_id = func_name.get('id')
                    if func_id and self.form_context:
                        function = self.form_context.get_function_info(func_id)
                        if function is None:
                            warnings.append(f"Function not found in context: {func_id} (may be custom function)")

            # Recurse into child nodes
            for key, val in node.items():
                if key in ['items', 'choice', 'params']:
                    child_errors, child_warnings = self._validate_references(val)
                    errors.extend(child_errors)
                    warnings.extend(child_warnings)

        elif isinstance(node, list):
            for item in node:
                child_errors, child_warnings = self._validate_references(item)
                errors.extend(child_errors)
                warnings.extend(child_warnings)

        return errors, warnings


# Convenience function
def validate_rule(
    rule: Dict[str, Any],
    form_context: Optional[Any] = None
) -> ValidationResult:
    """
    Validate a rule JSON.

    Args:
        rule: The rule JSON to validate.
        form_context: Optional FormContext for reference validation.

    Returns:
        ValidationResult with validation status and errors.
    """
    validator = RuleValidator(form_context)
    return validator.validate(rule)
