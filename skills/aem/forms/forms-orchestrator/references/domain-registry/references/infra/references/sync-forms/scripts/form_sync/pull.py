"""Pull operation for AEM Form Sync."""

import json
import uuid
from pathlib import Path
from typing import Optional

from .client import AEMClient
from .config import Config, get_working_dir
from .metadata import (
    FormMetadata,
    MetadataManager,
    determine_local_filename,
    extract_folder_path,
    extract_form_name,
    get_form_key_from_filename,
)


def parse_fd_json_strings(data: dict) -> dict:
    """
    Parse JSON strings in values where keys start with 'fd:'.
    
    Args:
        data: Dictionary potentially containing JSON strings in fd: keys.
        
    Returns:
        New dictionary with JSON strings parsed into objects.
    """
    result = {}
    for key, value in data.items():
        if key.startswith("fd:"):
            # Parse JSON strings in arrays or single values
            if isinstance(value, list):
                parsed_list = []
                for item in value:
                    if isinstance(item, str):
                        try:
                            parsed_list.append(json.loads(item))
                        except json.JSONDecodeError:
                            # Keep as string if not valid JSON
                            parsed_list.append(item)
                    else:
                        parsed_list.append(item)
                result[key] = parsed_list
            elif isinstance(value, str):
                try:
                    result[key] = json.loads(value)
                except json.JSONDecodeError:
                    # Keep as string if not valid JSON
                    result[key] = value
            else:
                result[key] = value
        else:
            result[key] = value
    return result


def extract_rules_from_component(
    component: dict,
    rules_store: dict,
    component_path: str = ""
) -> None:
    """
    Recursively traverse component and extract fd:rules and fd:events.
    
    Modifies the component in-place, replacing fd:rules and fd:events
    with {"ref": uuid} references.
    
    Args:
        component: The component dictionary to process.
        rules_store: Dictionary to store extracted rules, keyed by UUID.
        component_path: The path to the current component (for debugging).
    """
    if not isinstance(component, dict):
        return
    
    # Check if this component has fd:rules
    if "fd:rules" in component:
        rule_uuid = str(uuid.uuid4())
        
        # Extract and parse fd:rules (parse JSON strings in fd: keys)
        fd_rules = component["fd:rules"]
        if isinstance(fd_rules, dict):
            fd_rules = parse_fd_json_strings(fd_rules)
        
        # Extract both fd:rules and fd:events (if present)
        extracted = {
            "componentPath": component_path,
            "componentName": component.get("name", ""),
            "fd:rules": fd_rules
        }
        
        if "fd:events" in component:
            fd_events = component["fd:events"]
            if isinstance(fd_events, dict):
                fd_events = parse_fd_json_strings(fd_events)
            extracted["fd:events"] = fd_events
            # Replace fd:events with ref
            component["fd:events"] = {"ref": rule_uuid}
        
        # Store in rules_store
        rules_store[rule_uuid] = extracted
        
        # Replace fd:rules with ref
        component["fd:rules"] = {"ref": rule_uuid}
    
    # Recursively process nested components
    for key, value in component.items():
        if isinstance(value, dict):
            # Build component path for nested components
            nested_path = f"{component_path}/{key}" if component_path else key
            extract_rules_from_component(value, rules_store, nested_path)


def extract_all_rules(form_data: dict) -> dict:
    """
    Extract all rules from the form data.
    
    Args:
        form_data: The full form JSON data.
        
    Returns:
        Dictionary of extracted rules keyed by UUID.
    """
    rules_store = {}
    extract_rules_from_component(form_data, rules_store)
    return rules_store


def save_rules_file(
    rules_store: dict,
    form_key: str,
    working_dir: Path
) -> Path:
    """
    Save extracted rules to a separate JSON file.
    
    Always creates the file, even if no rules were extracted (empty JSON object).
    
    Args:
        rules_store: Dictionary of extracted rules keyed by UUID.
        form_key: The form key (used for filename).
        working_dir: Directory to save the rules file.
        
    Returns:
        Path to the saved rules file.
    """
    rules_filename = f"{form_key}.rule.json"
    rules_path = working_dir / rules_filename
    
    with open(rules_path, "w", encoding="utf-8") as f:
        json.dump(rules_store, f, indent=2)
    
    return rules_path


def is_fragment(form_data: dict) -> bool:
    """
    Check if the form data represents a fragment.

    Fragments have 'fd:type' set to 'fragment' at the top level.

    Args:
        form_data: The form JSON data from AEM.

    Returns:
        True if this is a fragment, False otherwise.
    """
    return form_data.get("fd:type") == "fragment"


def _collect_fragment_paths(data, paths: list) -> None:
    """Recursively collect fragmentPath values from form data."""
    if isinstance(data, dict):
        if "fragmentPath" in data:
            path = data["fragmentPath"]
            # Normalize DAM path to forms path
            if path.startswith("/content/dam/formsanddocuments/"):
                path = path.replace("/content/dam/formsanddocuments/", "/content/forms/af/")
            paths.append(path)
        for value in data.values():
            _collect_fragment_paths(value, paths)
    elif isinstance(data, list):
        for item in data:
            _collect_fragment_paths(item, paths)


def extract_fragment_paths(data: dict) -> list:
    """
    Recursively extract all fragmentPath values from form data.

    Normalizes /content/dam/formsanddocuments/ paths to /content/forms/af/.
    Returns a deduplicated list preserving first-seen order.

    Args:
        data: Form JSON data.

    Returns:
        List of unique AEM fragment paths.
    """
    paths = []
    _collect_fragment_paths(data, paths)
    seen = set()
    unique = []
    for p in paths:
        if p not in seen:
            seen.add(p)
            unique.append(p)
    return unique


def pull_with_fragments(
    form_path: str,
    config: Config,
    extract_rules: bool = True,
    output_dir: Path = None,
    no_edit: bool = False,
    _visited: set = None,
) -> list:
    """
    Pull a form/fragment and recursively pull all referenced fragments.

    Traverses the full dependency tree: form → fragment → nested fragment, etc.
    Already-visited paths are skipped to prevent infinite loops.

    Args:
        form_path: Full AEM path to the form/fragment.
        config: Configuration object with AEM credentials.
        extract_rules: If True (default), extract rules.
        output_dir: Optional custom output directory for the top-level pull.
                    Fragment dependencies are always saved under repo/refs natural paths.
        no_edit: If True, sync to refs directory (read-only reference).
        _visited: Internal set of already-pulled paths (used for recursion).

    Returns:
        List of (output_path, form_key) tuples for every pulled item.
    """
    if _visited is None:
        _visited = set()

    if form_path in _visited:
        return []
    _visited.add(form_path)

    # Pull this form/fragment
    output_path, form_key = pull_form(
        form_path, config,
        extract_rules=extract_rules,
        output_dir=output_dir,
        no_edit=no_edit,
    )
    results = [(output_path, form_key)]

    # Read the saved file to discover fragment references
    with open(output_path, "r", encoding="utf-8") as f:
        form_data = json.load(f)

    fragment_paths = extract_fragment_paths(form_data)

    if fragment_paths:
        print(f"Found {len(fragment_paths)} fragment reference(s) in {form_path}")

    for frag_path in fragment_paths:
        if frag_path in _visited:
            print(f"  Skipping already-pulled fragment: {frag_path}")
            continue
        print(f"  Pulling fragment: {frag_path}")
        try:
            # Fragments always use natural path structure (no custom output_dir)
            sub_results = pull_with_fragments(
                frag_path, config,
                extract_rules=extract_rules,
                output_dir=None,
                no_edit=no_edit,
                _visited=_visited,
            )
            results.extend(sub_results)
        except Exception as e:
            print(f"  WARNING: Failed to pull fragment {frag_path}: {e}")

    return results


def pull_form(
    form_path: str,
    config: Config,
    extract_rules: bool = True,
    output_dir: Path = None,
    override_form_key: str = None,
    no_edit: bool = False,
) -> tuple[Path, str]:
    """
    Pull a form or fragment from AEM and save it locally.

    Args:
        form_path: Full AEM path to the form/fragment (e.g., /content/forms/af/acroform).
        config: Configuration object with AEM credentials.
        extract_rules: If True (default), extract rules and create formabstract file.
                      If False, skip rules extraction and formabstract creation.
        output_dir: Optional custom output directory. If not provided, uses content
                   path structure under repo/ or refs/ directory.
        override_form_key: Optional form key to use instead of auto-generated one.
        no_edit: If True, sync to refs directory (read-only reference).
                If False (default), sync to repo directory (editable).

    Returns:
        Tuple of (path to saved file, form key).

    Raises:
        FormNotFoundError: If form/fragment doesn't exist on AEM.
        AuthenticationError: If authentication fails.
    """
    # Initialize client
    client = AEMClient(config)

    # Determine working directory based on no_edit flag and output_dir
    if output_dir:
        # Custom output directory takes precedence
        working_dir = Path(output_dir)
    else:
        # Use content path structure under repo/ or refs/
        working_dir = config.get_form_dir(form_path, no_edit=no_edit)

    # Create directory if it doesn't exist
    working_dir.mkdir(parents=True, exist_ok=True)

    # Determine base directory for relative path calculation
    base_dir = config.refs_dir if no_edit else config.repo_dir

    # Check if form already exists in metadata BY ORIGINAL PATH
    # Use global metadata (from cwd, not output_dir)
    metadata_manager = MetadataManager()
    
    # Search metadata for this form by originalPath or currentPath
    existing_metadata = None
    form_key = None
    for key, data in metadata_manager._data.items():
        # Skip non-form entries (must be a dict with form metadata fields)
        if not isinstance(data, dict) or "originalPath" not in data:
            continue
        
        form_meta = FormMetadata.from_dict(data)
        if form_meta.original_path == form_path or form_meta.current_path == form_path:
            existing_metadata = form_meta
            form_key = key
            break
    
    # Determine which path to fetch from and what filename to use
    # use_base_dir flag indicates local_filename is a full relative path from base_dir
    use_base_dir = False
    if existing_metadata:
        # Form exists in metadata - use existing settings
        # local_file in metadata is relative to base_dir (repo/ or refs/)
        local_filename = existing_metadata.local_file
        use_base_dir = True
        if existing_metadata.current_path:
            fetch_path = existing_metadata.current_path
            print(f"Found existing form in metadata, fetching from: {fetch_path}")
        else:
            fetch_path = form_path
            print(f"Found existing form in metadata, fetching from: {fetch_path}")
    else:
        # New form - determine filename and use original path
        fetch_path = form_path
        if override_form_key:
            # Use the provided form key
            form_key = override_form_key
            local_filename = f"{form_key}.form.json"
        else:
            local_filename = determine_local_filename(form_path)
            form_key = get_form_key_from_filename(local_filename)
    
    # Fetch form content (form node inside the page structure)
    fetch_url = f"{fetch_path}/jcr:content/root/section/form.-1.json"
    response = client.get(fetch_url)
    form_data = response.json()
    rules_filename = None

    # Determine output path based on whether we're using existing metadata
    if use_base_dir:
        # local_filename is a full relative path from base_dir
        output_path = base_dir / local_filename
        rules_dir = output_path.parent
    else:
        # local_filename is just the filename, combine with working_dir
        output_path = working_dir / local_filename
        rules_dir = working_dir

    if extract_rules:
        # Extract rules from form data (modifies form_data in place)
        rules_store = extract_all_rules(form_data)

        # Save form JSON (now with fd:rules/fd:events replaced by refs)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(form_data, f, indent=2)

        # Save rules file (always created, even if empty)
        rules_path = save_rules_file(rules_store, form_key, rules_dir)
        rules_filename = f"{form_key}.rule.json"
        print(f"Extracted {len(rules_store)} rule(s) to {rules_path}")
    else:
        # Save form JSON as-is (no rules extraction)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(form_data, f, indent=2)

    # Update metadata
    folder_path = extract_folder_path(form_path)

    # Determine location for metadata
    location = "refs" if no_edit else "repo"

    # Detect if this is a fragment
    is_fragment_flag = is_fragment(form_data)
    if is_fragment_flag:
        print(f"Detected as fragment (fd:type=fragment)")

    # Calculate relative paths from base directory
    if output_dir:
        # Custom output: store just the filename
        relative_local_file = local_filename
        relative_rule_file = rules_filename
    else:
        # Standard repo/refs: store path relative to base_dir
        try:
            relative_local_file = str(output_path.relative_to(base_dir))
            if rules_filename:
                rules_path_full = working_dir / rules_filename
                relative_rule_file = str(rules_path_full.relative_to(base_dir))
            else:
                relative_rule_file = None
        except ValueError:
            # Fallback if paths don't share base
            relative_local_file = local_filename
            relative_rule_file = rules_filename

    form_metadata = FormMetadata(
        folder_path=folder_path,
        original_path=form_path,
        local_file=relative_local_file,
        local_rule_file=relative_rule_file,
        location=location,
        fragment=is_fragment_flag,
    )

    # Preserve current_path from existing entry if it exists
    if existing_metadata and existing_metadata.current_path:
        form_metadata.current_path = existing_metadata.current_path

    metadata_manager.set_form(form_key, form_metadata)

    return output_path, form_key

