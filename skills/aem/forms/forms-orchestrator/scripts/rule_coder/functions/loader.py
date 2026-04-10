"""
Functions loader module for loading OOTB and custom functions.

This module provides functions to:
1. Load OOTB (out-of-the-box) functions from ootb-functions.json
2. Parse custom function scripts via the bridge CLI
3. Merge OOTB and custom functions, checking for duplicates
"""

import json
import subprocess
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class FunctionArg:
    """Represents a function argument."""
    type: str
    name: str
    description: str
    is_mandatory: bool = True


@dataclass
class FunctionDefinition:
    """Represents a function definition."""
    id: str
    display_name: str
    type: str
    description: str
    impl: str
    args: List[FunctionArg] = field(default_factory=list)
    is_error_handler: bool = False

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FunctionDefinition':
        """Create a FunctionDefinition from a dictionary."""
        args = [
            FunctionArg(
                type=arg.get('type', 'STRING'),
                name=arg.get('name', ''),
                description=arg.get('description', ''),
                is_mandatory=arg.get('isMandatory', True)
            )
            for arg in data.get('args', [])
        ]
        return cls(
            id=data.get('id', ''),
            display_name=data.get('displayName', data.get('id', '')),
            type=data.get('type', 'ANY'),
            description=data.get('description', ''),
            impl=data.get('impl', ''),
            args=args,
            is_error_handler=data.get('isErrorHandler', False)
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format for rule generation."""
        return {
            'id': self.id,
            'displayName': self.display_name,
            'type': self.type,
            'description': self.description,
            'impl': self.impl,
            'args': [
                {
                    'type': arg.type,
                    'name': arg.name,
                    'description': arg.description,
                    'isMandatory': arg.is_mandatory
                }
                for arg in self.args
            ],
            'isDuplicate': False,
            'displayPath': ''
        }


# Path to the ootb-functions.json file
OOTB_FUNCTIONS_PATH = Path(__file__).parent / 'ootb-functions.json'

# Path to the bridge CLI
BRIDGE_CLI_PATH = Path(__file__).parent.parent / 'bridge' / 'cli'


def load_ootb_functions() -> List[FunctionDefinition]:
    """
    Load OOTB functions from ootb-functions.json.

    Returns:
        List of FunctionDefinition objects for OOTB functions.
    """
    if not OOTB_FUNCTIONS_PATH.exists():
        raise FileNotFoundError(f"OOTB functions file not found: {OOTB_FUNCTIONS_PATH}")

    with open(OOTB_FUNCTIONS_PATH, 'r') as f:
        data = json.load(f)

    functions = data.get('functions', [])
    return [FunctionDefinition.from_dict(func) for func in functions]


def parse_custom_functions(script_path: str) -> Dict[str, Any]:
    """
    Parse a custom function script via the bridge CLI.

    Args:
        script_path: Path to the custom function JavaScript file.

    Returns:
        Dictionary with 'customFunction' and 'imports' keys.
    """
    parse_script = BRIDGE_CLI_PATH / 'parse-functions.js'

    if not parse_script.exists():
        raise FileNotFoundError(f"Parse functions CLI not found: {parse_script}")

    if not os.path.exists(script_path):
        raise FileNotFoundError(f"Custom function script not found: {script_path}")

    # Run the parse-functions.js CLI
    result = subprocess.run(
        ['node', str(parse_script), script_path],
        capture_output=True,
        text=True,
        cwd=str(BRIDGE_CLI_PATH.parent)
    )

    if result.returncode != 0:
        error_output = result.stderr or result.stdout
        raise RuntimeError(f"Failed to parse custom functions: {error_output}")

    try:
        output = json.loads(result.stdout)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Invalid JSON output from parser: {e}")

    if not output.get('success', False):
        raise RuntimeError(f"Parser error: {output.get('error', 'Unknown error')}")

    return {
        'customFunction': output.get('customFunction', []),
        'imports': output.get('imports', [])
    }


def parse_custom_functions_recursive(
    script_path: str,
    processed_scripts: Optional[set] = None
) -> List[Dict[str, Any]]:
    """
    Parse a custom function script and recursively parse imported scripts.

    Args:
        script_path: Path to the custom function JavaScript file.
        processed_scripts: Set of already processed script paths (to avoid cycles).

    Returns:
        List of all parsed function definitions.
    """
    if processed_scripts is None:
        processed_scripts = set()

    script_path = os.path.abspath(script_path)

    if script_path in processed_scripts:
        return []

    processed_scripts.add(script_path)

    result = parse_custom_functions(script_path)
    all_functions = result.get('customFunction', [])

    # Process imports recursively
    imports = result.get('imports', [])
    script_dir = os.path.dirname(script_path)

    for import_path in imports:
        # Resolve relative import paths
        if import_path.startswith('./') or import_path.startswith('../'):
            full_path = os.path.normpath(os.path.join(script_dir, import_path))
        else:
            full_path = import_path

        if os.path.exists(full_path):
            imported_functions = parse_custom_functions_recursive(full_path, processed_scripts)
            all_functions.extend(imported_functions)

    return all_functions


def get_all_functions(
    custom_script_path: Optional[str] = None,
    check_duplicates: bool = True
) -> List[FunctionDefinition]:
    """
    Get all functions (OOTB + custom), optionally checking for duplicates.

    Args:
        custom_script_path: Optional path to custom function script.
        check_duplicates: If True, warn about duplicate function IDs.

    Returns:
        List of all FunctionDefinition objects.
    """
    # Load OOTB functions
    all_functions = load_ootb_functions()
    ootb_ids = {func.id for func in all_functions}

    # Parse custom functions if provided
    if custom_script_path:
        custom_funcs = parse_custom_functions_recursive(custom_script_path)

        for func_data in custom_funcs:
            func = FunctionDefinition.from_dict(func_data)

            if check_duplicates and func.id in ootb_ids:
                print(f"Warning: Custom function '{func.id}' shadows OOTB function")

            all_functions.append(func)

    return all_functions


def search_functions(
    functions: List[FunctionDefinition],
    query: str
) -> List[FunctionDefinition]:
    """
    Search functions by name or description.

    Args:
        functions: List of functions to search.
        query: Search query string.

    Returns:
        List of matching functions.
    """
    query_lower = query.lower()
    return [
        func for func in functions
        if query_lower in func.id.lower() or
           query_lower in func.display_name.lower() or
           query_lower in func.description.lower()
    ]


def get_function_by_id(
    functions: List[FunctionDefinition],
    func_id: str
) -> Optional[FunctionDefinition]:
    """
    Get a function by its ID.

    Args:
        functions: List of functions to search.
        func_id: Function ID to find.

    Returns:
        FunctionDefinition if found, None otherwise.
    """
    for func in functions:
        if func.id == func_id:
            return func
    return None
