"""
Rule Coder - AEM Forms Business Logic Tools

This package provides tools for generating, validating, and transforming
AEM Forms rules and custom functions.

Modules:
    context: Form context and component lookup
    validator: Rule JSON validation against grammar
    functions: OOTB and custom function management
    debug: Rule diff and diagnostic tools
    bridge: Node.js CLI tools for rule transformation

Usage:
    from rule_coder.context import FormContext, ComponentLookup
    from rule_coder.validator import validate_rule, RuleValidator
    from rule_coder.functions import load_ootb_functions, parse_custom_functions
    from rule_coder.debug import diff_rules, diagnose_rule
"""

__version__ = '1.0.0'

# Exports are available when imported as a package
# Individual submodules can still be imported directly:
#   from context import FormContext
#   from validator import validate_rule

__all__ = [
    'context',
    'validator',
    'functions',
    'debug',
]
