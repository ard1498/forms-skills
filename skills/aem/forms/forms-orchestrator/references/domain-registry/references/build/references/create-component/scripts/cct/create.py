"""Create command implementation."""

from pathlib import Path
from typing import Optional, Callable
from .exceptions import ComponentError
from .validator import (
    validate_base_type,
    validate_view_type,
    validate_directories,
    validate_authoring_files,
    get_component_files,
)
from .templates import (
    get_component_js_template,
    get_component_css_template,
    get_component_authoring_json,
    format_json,
)
from .json_updater import (
    update_form_json,
    update_component_definition_json,
)


def create_component(
    base_type: str,
    view_type: str,
    base_path: Optional[Path] = None,
    on_progress: Optional[Callable[[str], None]] = None,
) -> Path:
    """Create a new custom component.
    
    Args:
        base_type: The base component type to extend
        view_type: The custom view type (fd:viewType)
        base_path: Base directory (defaults to current working directory)
        on_progress: Optional callback for progress messages
        
    Returns:
        Path to the created component directory
        
    Raises:
        ValidationError: If input is invalid
        DirectoryError: If required directories don't exist
        ComponentError: If component creation fails
    """
    def log(message: str) -> None:
        if on_progress:
            on_progress(message)
    
    # Validate inputs
    log("Validating inputs...")
    validate_base_type(base_type)
    validate_view_type(view_type)
    
    # Use current directory if no base_path provided
    if base_path is None:
        base_path = Path.cwd()
    
    # Validate directories exist
    log("Checking directories...")
    components_dir, authoring_dir = validate_directories(base_path)
    log(f"✓ Components directory: {components_dir}")
    log(f"✓ Authoring directory: {authoring_dir}")
    
    # Validate required authoring files exist
    log("Checking required authoring files...")
    validate_authoring_files(authoring_dir)
    log("✓ Required authoring files found")
    
    # Get component file paths
    component_dir, js_file, css_file, json_file = get_component_files(
        components_dir, view_type
    )
    
    # Check if component already exists
    if component_dir.exists():
        raise ComponentError(
            f"Component '{view_type}' already exists at: {component_dir}\n"
            f"Please choose a different name or remove the existing component."
        )
    
    # Create component directory
    log(f"Creating component directory: {component_dir}")
    try:
        component_dir.mkdir(parents=True, exist_ok=False)
    except Exception as e:
        raise ComponentError(f"Failed to create component directory: {e}")
    
    # Create JS file
    log(f"Creating {js_file.name}...")
    try:
        js_content = get_component_js_template(view_type, base_type)
        js_file.write_text(js_content, encoding='utf-8')
    except Exception as e:
        raise ComponentError(f"Failed to create JS file: {e}")
    
    # Create CSS file
    log(f"Creating {css_file.name}...")
    try:
        css_content = get_component_css_template(view_type)
        css_file.write_text(css_content, encoding='utf-8')
    except Exception as e:
        raise ComponentError(f"Failed to create CSS file: {e}")
    
    # Create authoring JSON file
    log(f"Creating {json_file.name}...")
    try:
        json_data = get_component_authoring_json(view_type, base_type, base_path)
        json_content = format_json(json_data)
        json_file.write_text(json_content, encoding='utf-8')
    except FileNotFoundError as e:
        raise ComponentError(f"Base type JSON file not found: {e}")
    except Exception as e:
        raise ComponentError(f"Failed to create authoring JSON file: {e}")
    
    log("Component files created successfully!")
    
    # Update authoring configuration files
    log("Updating authoring configuration files...")
    
    # Update _form.json
    try:
        update_form_json(authoring_dir, view_type, on_progress)
    except Exception as e:
        # Clean up created component directory on failure
        import shutil
        shutil.rmtree(component_dir, ignore_errors=True)
        raise ComponentError(f"Failed to update _form.json: {e}")
    
    # Update _component-definition.json
    try:
        update_component_definition_json(authoring_dir, view_type, on_progress)
    except Exception as e:
        # Clean up created component directory on failure
        import shutil
        shutil.rmtree(component_dir, ignore_errors=True)
        raise ComponentError(f"Failed to update _component-definition.json: {e}")
    
    log("All configuration files updated successfully!")
    
    return component_dir

