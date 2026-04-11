"""Validation utilities for CCT."""

from pathlib import Path
from typing import List, Tuple
from .exceptions import DirectoryError, ValidationError


# List of valid base types
VALID_BASE_TYPES = [
    'button',
    'checkbox',
    'checkbox-group',
    'date-input',
    'drop-down',
    'email',
    'file-input',
    'image',
    'number-input',
    'panel',
    'radio-group',
    'telephone-input',
    'text',
    'text-input',
]


def validate_base_type(base_type: str) -> None:
    """Validate that the base_type is valid.
    
    Args:
        base_type: The base component type
        
    Raises:
        ValidationError: If base_type is invalid
    """
    if base_type not in VALID_BASE_TYPES:
        raise ValidationError(
            f"Invalid base_type '{base_type}'. Must be one of: {', '.join(VALID_BASE_TYPES)}"
        )


def validate_view_type(view_type: str) -> None:
    """Validate that the view_type follows naming conventions.
    
    Args:
        view_type: The custom view type (fd:viewType)
        
    Raises:
        ValidationError: If view_type is invalid
    """
    if not view_type:
        raise ValidationError("view_type cannot be empty")
    
    # Check for lowercase and hyphens
    if not all(c.islower() or c == '-' for c in view_type):
        raise ValidationError(
            f"view_type '{view_type}' must be lowercase with hyphens as separators"
        )
    
    # Check it doesn't start or end with hyphen
    if view_type.startswith('-') or view_type.endswith('-'):
        raise ValidationError(
            f"view_type '{view_type}' cannot start or end with a hyphen"
        )


def validate_directories(base_path: Path) -> Tuple[Path, Path]:
    """Validate that required directories exist and are not empty.
    
    Args:
        base_path: Base directory to check (usually current working directory)
        
    Returns:
        Tuple of (components_dir, authoring_dir)
        
    Raises:
        DirectoryError: If directories don't exist or are empty
    """
    # Check if we're in a sandbox directory with code/ subdirectory
    code_dir = base_path / "code"
    if code_dir.exists() and code_dir.is_dir():
        # We're in sandbox root, use code/ as base
        actual_base = code_dir
    else:
        # We're in code/ directory or other location
        actual_base = base_path
    
    # Check for components directory
    components_dir = actual_base / "components"
    if not components_dir.exists():
        raise DirectoryError(
            f"Components directory not found: {components_dir}\n"
            f"Please ensure you're running this command from a sandbox directory."
        )
    
    if not components_dir.is_dir():
        raise DirectoryError(
            f"'components' exists but is not a directory: {components_dir}"
        )
    
    # Check if components directory is empty
    if not any(components_dir.iterdir()):
        raise DirectoryError(
            f"Components directory is empty: {components_dir}\n"
            f"Please add at least one component before running this command."
        )
    
    # Check for authoring directory
    authoring_dir = actual_base / "authoring"
    if not authoring_dir.exists():
        raise DirectoryError(
            f"Authoring directory not found: {authoring_dir}\n"
            f"Please ensure you're running this command from a sandbox directory."
        )
    
    if not authoring_dir.is_dir():
        raise DirectoryError(
            f"'authoring' exists but is not a directory: {authoring_dir}"
        )
    
    # Check if authoring directory is empty
    if not any(authoring_dir.iterdir()):
        raise DirectoryError(
            f"Authoring directory is empty: {authoring_dir}\n"
            f"Please add authoring configuration files before running this command."
        )
    
    return components_dir, authoring_dir


def validate_authoring_files(authoring_dir: Path) -> None:
    """Validate that required authoring JSON files exist.
    
    Args:
        authoring_dir: Path to authoring directory
        
    Raises:
        DirectoryError: If required files are missing
    """
    required_files = [
        "_form.json",
        "_component-definition.json",
    ]
    
    missing_files = []
    for filename in required_files:
        file_path = authoring_dir / filename
        if not file_path.exists():
            missing_files.append(filename)
    
    if missing_files:
        files_list = "\n  - ".join(missing_files)
        raise DirectoryError(
            f"Required authoring files not found in {authoring_dir}:\n"
            f"  - {files_list}\n\n"
            f"These files are required for component registration."
        )


def get_component_files(components_dir: Path, view_type: str) -> Tuple[Path, Path, Path, Path]:
    """Get component file paths for a given view_type.
    
    Args:
        components_dir: Path to components directory
        view_type: The custom view type
        
    Returns:
        Tuple of (component_dir, js_file, css_file, json_file)
    """
    component_dir = components_dir / view_type
    js_file = component_dir / f"{view_type}.js"
    css_file = component_dir / f"{view_type}.css"
    json_file = component_dir / f"_{view_type}.json"
    
    return component_dir, js_file, css_file, json_file

