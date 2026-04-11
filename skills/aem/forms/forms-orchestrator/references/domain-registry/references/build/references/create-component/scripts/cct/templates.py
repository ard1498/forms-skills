"""Template generators for component files."""

import json
from pathlib import Path
from typing import Dict, Any


def get_component_js_template(view_type: str, base_type: str) -> str:
    """Generate JavaScript template for custom component.
    
    Args:
        view_type: The custom view type
        base_type: The base component type
        
    Returns:
        JavaScript code as string
    """
    return f"""/**
 * Custom component: {view_type}
 * Base type: {base_type}
 */

export default async function decorate(fieldDiv, fieldJson) {{
  // fieldDiv: HTML of the base component ({base_type})
  // fieldJson: Field properties (enabled, visible, placeholder, etc.)
  
  // Add your custom logic here to extend the {base_type} component
  console.log('Decorating {view_type}', fieldJson);
  
  // Example: Add a custom class
  fieldDiv.classList.add('{view_type}');
  
  // Example: Access field properties
  // const placeholder = fieldJson.placeholder;
  // const label = fieldJson.label;
  
  // Your customization logic goes here...
}}
"""


def get_component_css_template(view_type: str) -> str:
    """Generate CSS template for custom component.
    
    Args:
        view_type: The custom view type
        
    Returns:
        CSS code as string
    """
    return f"""/* Custom component styles: {view_type} */
"""


def transform_paths(obj: Any) -> Any:
    """Transform JSON reference paths from base type location to component location.
    
    Transforms paths like:
      "../form-common/_basic-input-fields.json#/fields"
    to:
      "../../models/form-common/_basic-input-fields.json#/fields"
    
    Args:
        obj: Any JSON-serializable object (dict, list, str, etc.)
        
    Returns:
        Transformed object with updated paths
    """
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            # Check if this is a JSON reference key ("...")
            if key == "..." and isinstance(value, str):
                # Transform the path
                if value.startswith("../form-common/"):
                    # Replace ../form-common/ with ../../models/form-common/
                    result[key] = value.replace("../form-common/", "../../models/form-common/")
                else:
                    result[key] = value
            else:
                # Recursively transform nested objects
                result[key] = transform_paths(value)
        return result
    elif isinstance(obj, list):
        # Recursively transform list items
        return [transform_paths(item) for item in obj]
    else:
        # Return primitive values as-is
        return obj


def get_base_json_path(base_type: str, base_path: Path) -> Path:
    """Get the path to the base type JSON file.
    
    Args:
        base_type: The base component type
        base_path: Base directory (current working directory or sandbox root)
        
    Returns:
        Path to the base type JSON file
    """
    # Check if we're in a sandbox directory with code/ subdirectory
    code_dir = base_path / "code"
    if code_dir.exists() and code_dir.is_dir():
        # We're in sandbox root, use code/ as base
        actual_base = code_dir
    else:
        # We're in code/ directory or other location
        actual_base = base_path
    
    # Construct path to base type JSON
    base_json_path = actual_base / "authoring" / "models" / "form-components" / f"_{base_type}.json"
    
    return base_json_path


def load_base_json(base_type: str, base_path: Path) -> Dict[str, Any]:
    """Load the base type JSON file.
    
    Args:
        base_type: The base component type
        base_path: Base directory (current working directory or sandbox root)
        
    Returns:
        Dictionary containing the base JSON data
        
    Raises:
        FileNotFoundError: If the base type JSON file doesn't exist
        json.JSONDecodeError: If the JSON file is invalid
    """
    base_json_path = get_base_json_path(base_type, base_path)
    
    if not base_json_path.exists():
        raise FileNotFoundError(
            f"Base type JSON not found: {base_json_path}\n"
            f"Expected location: authoring/models/form-components/_{base_type}.json"
        )
    
    with open(base_json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def format_component_name(component_name: str) -> str:
    """Format component name from kebab-case to Title Case.
    
    Args:
        component_name: Component name in kebab-case (e.g., "countdown-timer")
        
    Returns:
        Formatted title (e.g., "Countdown Timer")
    """
    # Capitalize first character and replace hyphens with spaces
    return component_name[0].upper() + component_name[1:].replace('-', ' ')


def get_component_authoring_json(view_type: str, base_type: str, base_path: Path) -> Dict[str, Any]:
    """Generate authoring JSON configuration for custom component.
    
    This function loads the base type JSON and transforms it for the custom component:
    1. Loads the base JSON from authoring/models/form-components/_<base_type>.json
    2. Updates the title, id, and fd:viewType with the custom component name
    3. Transforms JSON reference paths from base location to component location
    
    Args:
        view_type: The custom view type (component name)
        base_type: The base component type
        base_path: Base directory (current working directory or sandbox root)
        
    Returns:
        Dictionary representing the authoring JSON
        
    Raises:
        FileNotFoundError: If the base type JSON file doesn't exist
        json.JSONDecodeError: If the JSON file is invalid
    """
    # Load the base JSON
    base_json = load_base_json(base_type, base_path)
    
    # Format the component name for display
    formatted_title = format_component_name(view_type)
    
    # Transform definitions
    custom_definitions = []
    for definition in base_json.get("definitions", []):
        custom_def = {
            **definition,
            "title": formatted_title,
            "id": view_type,
        }
        
        # Update plugins.xwalk.page.template with custom values
        if "plugins" in definition:
            custom_def["plugins"] = {
                **definition["plugins"],
                "xwalk": {
                    **definition["plugins"].get("xwalk", {}),
                    "page": {
                        **definition["plugins"].get("xwalk", {}).get("page", {}),
                        "template": {
                            **definition["plugins"].get("xwalk", {}).get("page", {}).get("template", {}),
                            "jcr:title": formatted_title,
                            "fd:viewType": view_type,
                        }
                    }
                }
            }
        
        custom_definitions.append(custom_def)
    
    # Transform models with path updates
    custom_models = []
    for model in base_json.get("models", []):
        custom_model = transform_paths({
            **model,
            "id": view_type,
        })
        custom_models.append(custom_model)
    
    return {
        **base_json,
        "definitions": custom_definitions,
        "models": custom_models,
    }


def format_json(data: Dict[str, Any]) -> str:
    """Format dictionary as pretty JSON string.
    
    Args:
        data: Dictionary to format
        
    Returns:
        Pretty-printed JSON string
    """
    return json.dumps(data, indent=2)
