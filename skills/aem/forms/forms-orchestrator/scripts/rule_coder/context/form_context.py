"""
Form context module for managing form data and context.

This module provides the FormContext class which:
1. Loads and transforms form definition JSON to treeJson
2. Loads and merges OOTB + custom functions
3. Provides a unified interface for component and function lookup
"""

import json
import subprocess
import os
from typing import Dict, Any, Optional, List
from pathlib import Path
from dataclasses import dataclass, field

from .component_lookup import ComponentLookup


# Path to the bridge CLI
BRIDGE_CLI_PATH = Path(__file__).parent.parent / 'bridge' / 'cli'
FUNCTIONS_PATH = Path(__file__).parent.parent / 'functions'


@dataclass
class FormContext:
    """
    Complete form context for rule generation.

    Contains:
    - treeJson: Transformed form structure for component lookup
    - functions: List of all available functions (OOTB + custom)
    - component_lookup: ComponentLookup instance for searching
    """
    tree_json: Dict[str, Any]
    functions: List[Dict[str, Any]] = field(default_factory=list)
    _component_lookup: Optional[ComponentLookup] = field(default=None, repr=False)

    @property
    def component_lookup(self) -> ComponentLookup:
        """Get or create the ComponentLookup instance."""
        if self._component_lookup is None:
            self._component_lookup = ComponentLookup(self.tree_json, self.functions)
        return self._component_lookup

    @classmethod
    def load_from_form_json(
        cls,
        form_json: Dict[str, Any],
        custom_functions_path: Optional[str] = None
    ) -> 'FormContext':
        """
        Create FormContext from a form JSON object.

        Args:
            form_json: The form definition JSON (not yet transformed).
            custom_functions_path: Optional path to custom functions JS file.

        Returns:
            FormContext instance.
        """
        # Transform form JSON to treeJson
        tree_json = cls._transform_form_json(form_json)

        # Load functions
        functions = cls._load_all_functions(custom_functions_path)

        return cls(
            tree_json=tree_json,
            functions=functions
        )

    @classmethod
    def load_from_form_file(
        cls,
        form_json_path: str,
        custom_functions_path: Optional[str] = None
    ) -> 'FormContext':
        """
        Create FormContext from a form JSON file.

        Args:
            form_json_path: Path to the form definition JSON file.
            custom_functions_path: Optional path to custom functions JS file.

        Returns:
            FormContext instance.
        """
        with open(form_json_path, 'r') as f:
            form_json = json.load(f)

        return cls.load_from_form_json(form_json, custom_functions_path)

    @classmethod
    def load_from_tree_json(
        cls,
        tree_json: Dict[str, Any],
        custom_functions_path: Optional[str] = None
    ) -> 'FormContext':
        """
        Create FormContext from an already-transformed treeJson.

        Args:
            tree_json: The transformed form tree JSON.
            custom_functions_path: Optional path to custom functions JS file.

        Returns:
            FormContext instance.
        """
        # Load functions
        functions = cls._load_all_functions(custom_functions_path)

        return cls(
            tree_json=tree_json,
            functions=functions
        )

    @staticmethod
    def _transform_form_json(form_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform form definition JSON to treeJson using the bridge CLI.

        Args:
            form_json: The form definition JSON.

        Returns:
            The transformed treeJson.
        """
        transform_script = BRIDGE_CLI_PATH / 'transform-form.js'

        if not transform_script.exists():
            raise FileNotFoundError(f"Transform form CLI not found: {transform_script}")

        # Run the transform-form.js CLI with stdin input
        result = subprocess.run(
            ['node', str(transform_script), '--stdin'],
            input=json.dumps(form_json),
            capture_output=True,
            text=True,
            cwd=str(BRIDGE_CLI_PATH.parent)
        )

        if result.returncode != 0:
            error_output = result.stderr or result.stdout
            raise RuntimeError(f"Failed to transform form JSON: {error_output}")

        try:
            output = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Invalid JSON output from transformer: {e}")

        if not output.get('success', False):
            raise RuntimeError(f"Transform error: {output.get('error', 'Unknown error')}")

        return output.get('treeJson', {})

    @staticmethod
    def _load_all_functions(
        custom_functions_path: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Load all functions (OOTB + custom).

        Args:
            custom_functions_path: Optional path to custom functions JS file.

        Returns:
            List of all function definitions.
        """
        functions = []

        # Load OOTB functions
        ootb_path = FUNCTIONS_PATH / 'ootb-functions.json'
        if ootb_path.exists():
            with open(ootb_path, 'r') as f:
                ootb_data = json.load(f)
                functions.extend(ootb_data.get('functions', []))

        # Load custom functions if path provided
        if custom_functions_path and os.path.exists(custom_functions_path):
            parse_script = BRIDGE_CLI_PATH / 'parse-functions.js'

            if parse_script.exists():
                result = subprocess.run(
                    ['node', str(parse_script), custom_functions_path],
                    capture_output=True,
                    text=True,
                    cwd=str(BRIDGE_CLI_PATH.parent)
                )

                if result.returncode == 0:
                    try:
                        output = json.loads(result.stdout)
                        if output.get('success', False):
                            custom_funcs = output.get('customFunction', [])
                            functions.extend(custom_funcs)
                    except json.JSONDecodeError:
                        pass  # Ignore parse errors for custom functions

        return functions

    def get_component(self, identifier: str) -> Optional[Dict[str, Any]]:
        """
        Get component by ID or name.

        Args:
            identifier: Component ID or name.

        Returns:
            Component info dict or None.
        """
        return self.component_lookup.get_component(identifier)

    def get_component_for_action(self, identifier: str) -> Optional[Dict[str, Any]]:
        """
        Get component for use in actions (with AFCOMPONENT type).

        Args:
            identifier: Component ID or name.

        Returns:
            Component info dict with AFCOMPONENT type.
        """
        return self.component_lookup.get_component_for_action(identifier)

    def search_components(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for components by partial name.

        Args:
            query: Search query.

        Returns:
            List of matching components.
        """
        return self.component_lookup.search_components(query)

    def list_all_components(self) -> List[Dict[str, Any]]:
        """
        List all available components.

        Returns:
            List of all components.
        """
        return self.component_lookup.list_all_components()

    def get_function_info(self, function_identifier: str) -> Optional[Dict[str, Any]]:
        """
        Get function info by ID or name.

        Args:
            function_identifier: Function ID or displayName.

        Returns:
            Function info dict or None.
        """
        return self.component_lookup.get_function_info(function_identifier)

    def search_functions(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for functions by partial name or description.

        Args:
            query: Search query.

        Returns:
            List of matching functions.
        """
        return self.component_lookup.search_functions(query)

    def list_all_functions(self) -> List[Dict[str, Any]]:
        """
        List all available functions.

        Returns:
            List of all functions.
        """
        return self.component_lookup.list_all_functions()

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dictionary for serialization.

        Returns:
            Dictionary representation of the form context.
        """
        return {
            'treeJson': self.tree_json,
            'functions': self.functions
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FormContext':
        """
        Create FormContext from a dictionary.

        Args:
            data: Dictionary with 'treeJson' and optional 'functions'.

        Returns:
            FormContext instance.
        """
        return cls(
            tree_json=data.get('treeJson', {}),
            functions=data.get('functions', [])
        )
