"""JSON file updater for authoring configuration files."""

import json
from pathlib import Path
from typing import Optional, Callable
from .exceptions import ComponentError


def update_form_json(
    authoring_dir: Path,
    view_type: str,
    on_progress: Optional[Callable[[str], None]] = None,
) -> None:
    """Update _form.json to include the new component.
    
    Adds the component to the filters section.
    
    Args:
        authoring_dir: Path to authoring directory
        view_type: The custom view type
        on_progress: Optional callback for progress messages
        
    Raises:
        ComponentError: If file doesn't exist or update fails
    """
    def log(message: str) -> None:
        if on_progress:
            on_progress(message)
    
    form_json_path = authoring_dir / "_form.json"
    
    if not form_json_path.exists():
        raise ComponentError(
            f"_form.json not found at: {form_json_path}\n"
            f"This file is required for component registration."
        )
    
    log(f"Updating {form_json_path.name}...")
    
    try:
        # Read current _form.json
        with open(form_json_path, 'r', encoding='utf-8') as f:
            form_data = json.load(f)
        
        # Add to filters section
        if 'filters' not in form_data:
            form_data['filters'] = []
        
        # Find the form filter
        form_filter = None
        for filter_item in form_data['filters']:
            if filter_item.get('id') == 'form':
                form_filter = filter_item
                break
        
        if form_filter is None:
            # Create form filter if it doesn't exist
            form_filter = {
                "id": "form",
                "components": []
            }
            form_data['filters'].append(form_filter)
        
        # Add component to filter if not present
        if 'components' not in form_filter:
            form_filter['components'] = []
        
        if view_type not in form_filter['components']:
            # Insert in alphabetical order
            form_filter['components'].append(view_type)
            form_filter['components'].sort()
            log(f"  Added {view_type} to filters")
        else:
            log(f"  {view_type} already in filters")
        
        # Write back to file
        with open(form_json_path, 'w', encoding='utf-8') as f:
            json.dump(form_data, f, indent=2, ensure_ascii=False)
            f.write('\n')  # Add trailing newline
        
        log("  ✓ _form.json updated")
        
    except json.JSONDecodeError as e:
        raise ComponentError(f"Invalid JSON in _form.json: {e}")
    except Exception as e:
        raise ComponentError(f"Failed to update _form.json: {e}")


def update_component_definition_json(
    authoring_dir: Path,
    view_type: str,
    on_progress: Optional[Callable[[str], None]] = None,
) -> None:
    """Update _component-definition.json to include the new component.
    
    Adds the component to the custom-components group.
    
    Args:
        authoring_dir: Path to authoring directory
        view_type: The custom view type
        on_progress: Optional callback for progress messages
        
    Raises:
        ComponentError: If file doesn't exist or update fails
    """
    def log(message: str) -> None:
        if on_progress:
            on_progress(message)
    
    comp_def_path = authoring_dir / "_component-definition.json"
    
    if not comp_def_path.exists():
        raise ComponentError(
            f"_component-definition.json not found at: {comp_def_path}\n"
            f"This file is required for component registration."
        )
    
    log(f"Updating {comp_def_path.name}...")
    
    try:
        # Read current _component-definition.json
        with open(comp_def_path, 'r', encoding='utf-8') as f:
            comp_def_data = json.load(f)
        
        # Find the custom-components group
        if 'groups' not in comp_def_data:
            comp_def_data['groups'] = []
        
        custom_group = None
        for group in comp_def_data['groups']:
            if group.get('id') == 'custom-components':
                custom_group = group
                break
        
        # Create custom-components group if it doesn't exist
        if custom_group is None:
            custom_group = {
                "title": "Custom Form Components",
                "id": "custom-components",
                "components": []
            }
            comp_def_data['groups'].append(custom_group)
            log("  Created custom-components group")
        
        # Ensure components array exists
        if 'components' not in custom_group:
            custom_group['components'] = []
        
        # Create the component reference
        component_ref = {
            "...": f"../blocks/form/components/{view_type}/_{view_type}.json#/definitions"
        }
        
        # Check if it already exists
        component_exists = any(
            isinstance(item, dict) and 
            item.get("...") == component_ref["..."]
            for item in custom_group['components']
        )
        
        if not component_exists:
            custom_group['components'].append(component_ref)
            log(f"  Added {view_type} to custom-components")
        else:
            log(f"  {view_type} already in custom-components")
        
        # Write back to file
        with open(comp_def_path, 'w', encoding='utf-8') as f:
            json.dump(comp_def_data, f, indent=2, ensure_ascii=False)
            f.write('\n')  # Add trailing newline
        
        log("  ✓ _component-definition.json updated")
        
    except json.JSONDecodeError as e:
        raise ComponentError(f"Invalid JSON in _component-definition.json: {e}")
    except Exception as e:
        raise ComponentError(f"Failed to update _component-definition.json: {e}")

