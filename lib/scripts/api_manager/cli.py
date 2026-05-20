"""CLI entry point for API Manager."""

import json
import sys
from pathlib import Path

import click

from . import __version__
from .config import Config, get_project_paths
from .exceptions import ApiManagerError

# Global verbose flag
_verbose = False


def log_verbose(message: str) -> None:
    """Print message only if verbose mode is enabled."""
    if _verbose:
        click.secho(f"  [DEBUG] {message}", fg="cyan")


@click.group()
@click.version_option(version=__version__, prog_name="api-manager")
def cli():
    """API Manager - Manage API integrations for AEM Forms.

    \b
    Directory Structure:
      refs/apis/generated/
      ├── spec/           OpenAPI YAML files
      ├── api-clients/    Generated JS clients (*.js + index.js)
      └── registry.json   API registry

    \b
    Data Flow:
      AEM FDM --[sync]--> refs/apis/generated/spec/*.yaml
                      --[build]--> refs/apis/generated/api-clients/
                               --> refs/apis/generated/registry.json

    \b
    Commands:
      list    - List all APIs from YAML specs
      show    - Show API details from YAML specs
      build   - Parse YAML -> generate api-clients + registry
      add     - Create new API YAML file (interactive)
      sync    - Fetch from AEM FDM -> create/update YAML files
      test    - Check for YAML spec changes

    \b
    Examples:
        api-manager list              # List all APIs
        api-manager show apiName      # Show API details
        api-manager sync --dry-run    # Preview changes from AEM
        api-manager sync              # Sync from AEM (with confirmation)
        api-manager build             # Build registry + api-clients from YAML
        api-manager test              # Check for differences
    """
    pass


@cli.command("list")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.option("-m", "--method", help="Filter by HTTP method")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
def list_apis(as_json: bool, method: str, verbose: bool):
    """List all APIs from YAML specs.

    \b
    Examples:
        api-manager list
        api-manager list --json
        api-manager list --method POST
    """
    global _verbose
    _verbose = verbose

    from .openapi_parser import build_registry

    registry = build_registry()

    # Filter by method if specified
    if method:
        method = method.upper()
        registry = {
            name: config
            for name, config in registry.items()
            if config.get("method", "POST").upper() == method
        }

    apis = list(registry.keys())

    if as_json:
        details = []
        for name in apis:
            config = registry[name]
            details.append(
                {
                    "name": config.get("name", name),
                    "description": config.get("description", ""),
                    "endpoint": config.get("endpoint", ""),
                    "method": config.get("method", "POST"),
                }
            )
        click.echo(json.dumps(details, indent=2))
    else:
        if not apis:
            click.echo("No APIs found.")
            return

        click.echo(f"\nFound {len(apis)} API(s):\n")
        click.echo(f"  {'Name':<28}{'Method':<10}Endpoint")
        click.echo("  " + "-" * 70)

        for name in apis:
            config = registry[name]
            api_method = config.get("method", "POST")
            endpoint = config.get("endpoint", "")
            click.echo(f"  {name:<28}{api_method:<10}{endpoint}")

        click.echo("")


@cli.command("show")
@click.argument("name")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
def show_api(name: str, as_json: bool, verbose: bool):
    """Show API details from YAML spec.

    \b
    NAME: API name (YAML filename without extension)

    \b
    Examples:
        api-manager show customerIdentification
        api-manager show customerIdentification --json
    """
    global _verbose
    _verbose = verbose

    from .openapi_parser import build_registry

    registry = build_registry()

    if name not in registry:
        click.secho(f"Error: API '{name}' not found.", fg="red", err=True)
        click.echo("\nAvailable APIs:")
        for api_name in sorted(registry.keys()):
            click.echo(f"  - {api_name}")
        sys.exit(1)

    config = registry[name]

    if as_json:
        click.echo(json.dumps(config, indent=2))
    else:
        api_name = config.get("name", name)
        click.echo(f"\n{api_name}")
        click.echo("=" * len(api_name))
        click.echo(f"\n{config.get('description', '')}\n")

        click.echo("Endpoint")
        click.echo("--------")
        click.echo(f"  {config.get('method', 'POST')} {config.get('endpoint', '')}\n")

        if config.get("bodyStructure"):
            click.echo(f"Body Structure: {config['bodyStructure']}\n")

        params = config.get("params", {})
        if params:
            # Find required params
            required_params = [name for name, p in params.items() if p.get("required")]

            click.echo("Parameters")
            click.echo("----------")
            for param_name, param_config in params.items():
                required = " [required]" if param_name in required_params else ""
                default = ""
                if param_config.get("default") is not None:
                    default = f" (default: {param_config['default']})"
                click.echo(
                    f"  {param_name}: {param_config.get('type', 'string')}{required}{default}"
                )
                click.echo(f"    {param_config.get('description', '')}")
            click.echo("")

        response = config.get("response", {})
        if response:
            click.echo("Response Fields")
            click.echo("---------------")
            for field_name, field_config in response.items():
                click.echo(f"  {field_name}: {field_config.get('type', 'string')}")
                click.echo(f"    {field_config.get('description', '')}")
            click.echo("")

        if config.get("successCondition"):
            click.echo("Success Condition")
            click.echo("-----------------")
            click.echo(f"  {config['successCondition']}\n")

        if config.get("notes"):
            click.echo("Notes")
            click.echo("-----")
            notes = config["notes"]
            if isinstance(notes, list):
                for note in notes:
                    click.echo(f"  - {note}")
            else:
                click.echo(f"  {notes}")
            click.echo("")


@cli.command("build")
@click.option(
    "--dry-run", is_flag=True, help="Preview what would be built (no files written)"
)
@click.option("--skip-clients", is_flag=True, help="Skip generating API client files")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
def build_registry(dry_run: bool, skip_clients: bool, verbose: bool):
    """Parse OpenAPI YAML files and generate api-clients.

    \b
    What it does:
      1. Reads all refs/apis/generated/spec/*.yaml files (OpenAPI 3.0 format)
      2. Generates refs/apis/generated/registry.json
      3. Generates refs/apis/generated/api-clients/*.js (client functions)
      4. Generates refs/apis/generated/api-clients/index.js (re-exports)

    \b
    Examples:
        api-manager build              # Build registry + api-clients
        api-manager build --dry-run    # Preview what would be built
        api-manager build --skip-clients  # Build registry only
    """
    global _verbose
    _verbose = verbose

    from .generator import generate_all_clients
    from .openapi_parser import build_registry as do_build
    from .openapi_parser import save_registry

    spec_dir, api_clients_dir, generated_dir = get_project_paths()

    click.echo(
        "Building registry from refs/apis/generated/spec/*.yaml (OpenAPI 3.0)...\n"
    )

    registry = do_build()
    count = len(registry)

    if dry_run:
        click.echo("\n[Dry Run] Would generate clients for:")
        for name, config in list(registry.items())[:20]:
            click.echo(f"  - {name}: {config.get('endpoint', '')}")
        if count > 20:
            click.echo(f"  ... and {count - 20} more")
        click.echo(f"\nTotal: {count} API(s)")
        return

    # Save registry.json at generated_dir level
    registry_path = save_registry(registry)
    click.secho(f"\nSaved registry.json with {count} API(s)", fg="green")
    click.echo(f"Location: {registry_path}")

    # Generate API client files + index.js
    if not skip_clients:
        click.echo("\nGenerating API clients...")
        gen_stats = generate_all_clients(registry, api_clients_dir)
        click.secho(
            f"Generated {gen_stats['files_generated']} API client files + index.js",
            fg="green",
        )
        click.echo(f"Location: {api_clients_dir}")
        if gen_stats.get("errors"):
            click.secho(f"Errors: {len(gen_stats['errors'])}", fg="yellow")
            for err in gen_stats["errors"][:3]:
                click.echo(f"  • {err}")


def _prompt_for_params() -> dict:
    """Interactively prompt for request parameters."""
    params = {}
    click.echo("\n--- Request Parameters ---")
    click.echo("(Press Enter with empty name to finish)")

    while True:
        click.echo("")
        param_name = click.prompt("Parameter name", default="", show_default=False)
        if not param_name:
            break

        param_type = click.prompt(
            "  Type",
            type=click.Choice(["string", "number", "boolean", "object", "array"]),
            default="string",
        )
        param_required = click.confirm("  Required?", default=False)
        param_location = click.prompt(
            "  Location",
            type=click.Choice(["body", "header", "query", "path"]),
            default="body",
        )
        param_default = click.prompt(
            "  Default value (optional)", default="", show_default=False
        )
        param_desc = click.prompt("  Description", default="", show_default=False)

        params[param_name] = {
            "type": param_type,
            "required": param_required,
            "in": param_location,
            "description": param_desc or f"{param_location} parameter",
        }
        if param_default:
            params[param_name]["default"] = param_default

        click.secho(f"  Added: {param_name}", fg="green")

    return params


def _prompt_for_response() -> dict:
    """Interactively prompt for response fields."""
    response = {}
    click.echo("\n--- Response Fields ---")
    click.echo("(Press Enter with empty name to finish)")

    while True:
        click.echo("")
        field_name = click.prompt("Field name", default="", show_default=False)
        if not field_name:
            break

        field_type = click.prompt(
            "  Type",
            type=click.Choice(["string", "number", "boolean", "object", "array"]),
            default="string",
        )
        field_desc = click.prompt("  Description", default="", show_default=False)

        response[field_name] = {
            "type": field_type,
            "description": field_desc,
        }

        click.secho(f"  Added: {field_name}", fg="green")

    return response


@cli.command("add")
@click.option("-f", "--file", "config_file", help="JSON file with API config")
@click.option("-n", "--name", "api_name", help="API name (skip interactive mode)")
@click.option("-e", "--endpoint", help="API endpoint")
@click.option("-d", "--description", help="API description")
@click.option("--no-build", is_flag=True, help="Skip rebuilding registry")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
def add_api(
    config_file: str,
    api_name: str,
    endpoint: str,
    description: str,
    no_build: bool,
    verbose: bool,
):
    """Add a new API interactively or from file.

    \b
    Without options: Interactive mode prompts for all details
    With -f: Load from JSON file
    With -n: Quick creation with minimal prompts

    \b
    Examples:
        api-manager add                           # Interactive mode
        api-manager add -f api-config.json        # From JSON file
        api-manager add -n myNewApi -e /api/test  # Quick mode
    """
    global _verbose
    _verbose = verbose

    from .openapi_parser import build_registry as do_build
    from .openapi_writer import generate_filename, write_api_to_openapi

    spec_dir, api_clients_dir, generated_dir = get_project_paths()

    api_config = None

    if config_file:
        # Load from JSON file
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                api_config = json.load(f)
        except Exception as e:
            click.secho(f"Error reading file: {e}", fg="red", err=True)
            sys.exit(1)
    elif api_name:
        # Quick creation from options
        api_config = {
            "name": api_name,
            "description": description or f"{api_name} API",
            "endpoint": endpoint or f"/api/{api_name.lower()}",
            "method": "POST",
            "params": {},
            "response": {},
        }
    else:
        # Interactive mode
        click.secho("\n=== Add New API Integration ===\n", fg="blue", bold=True)

        # Basic info
        click.echo("--- Basic Information ---")
        name = click.prompt("API Name")
        desc = click.prompt("Description", default=f"{name} API")
        endpoint_url = click.prompt("Endpoint URL")
        method = click.prompt(
            "HTTP Method",
            type=click.Choice(["POST", "GET", "PUT", "DELETE", "PATCH"]),
            default="POST",
        )
        content_type = click.prompt("Content-Type", default="application/json")

        # Execution info
        click.echo("\n--- Execution Info ---")
        execute_at_client = click.confirm("Execute at Client?", default=True)
        encryption_required = click.confirm("Encryption Required?", default=False)
        auth_type = click.prompt(
            "Authentication",
            type=click.Choice(["None", "Basic", "Bearer", "OAuth"]),
            default="None",
        )
        is_array = click.confirm("Response is Array?", default=False)

        # Parameters
        params = _prompt_for_params()

        # Response fields
        response = _prompt_for_response()

        # Add default response fields if none provided
        if not response:
            if click.confirm(
                "\nAdd default response fields (status.responseCode, status.errorCode)?",
                default=True,
            ):
                response = {
                    "status.responseCode": {
                        "type": "string",
                        "description": "0 for success",
                    },
                    "status.errorCode": {
                        "type": "string",
                        "description": "Error code if failed",
                    },
                    "status.errorMsg": {
                        "type": "string",
                        "description": "Error message if failed",
                    },
                }

        # Success condition
        click.echo("\n--- Success Condition ---")
        success_condition = click.prompt(
            "Success Condition (JS expression, Enter to skip — response.ok is used by default)",
            default="",
            show_default=False,
        )

        # Notes
        click.echo("\n--- Notes (optional) ---")
        notes = []
        while True:
            note = click.prompt(
                "Add note (Enter to skip)", default="", show_default=False
            )
            if not note:
                break
            notes.append(note)

        # Build config
        api_config = {
            "name": name,
            "description": desc,
            "endpoint": endpoint_url,
            "method": method,
            "contentType": content_type,
            "executeAtClient": execute_at_client,
            "encryptionRequired": encryption_required,
            "authType": auth_type,
            "isOutputAnArray": is_array,
            "params": params,
            "response": response,
        }
        if success_condition:
            api_config["successCondition"] = success_condition
        if notes:
            api_config["notes"] = notes

        # Show summary
        click.echo("\n" + "=" * 50)
        click.secho("API Configuration Summary:", fg="blue", bold=True)
        click.echo(f"  Name: {name}")
        click.echo(f"  Endpoint: {method} {endpoint_url}")
        click.echo(f"  Parameters: {len(params)}")
        click.echo(f"  Response Fields: {len(response)}")
        click.echo("=" * 50)

        if not click.confirm("\nCreate this API?", default=True):
            click.echo("Cancelled.")
            return

    # Generate YAML
    yaml_content = write_api_to_openapi(api_config)
    filename = generate_filename(api_config["name"])
    filepath = spec_dir / filename

    # Check if file exists
    if filepath.exists():
        click.secho(f"Error: File already exists: {filepath}", fg="red", err=True)
        click.echo("Use a different name or delete the existing file first.")
        sys.exit(1)

    # Write file
    filepath.write_text(yaml_content, encoding="utf-8")
    click.secho(f"\nCreated: {filepath}", fg="green")

    # Regenerate registry + API clients if requested
    if not no_build:
        from .generator import generate_all_clients
        from .openapi_parser import save_registry

        click.echo("\nRebuilding...")
        registry = do_build()
        save_registry(registry)
        gen_stats = generate_all_clients(registry, api_clients_dir)
        click.echo(
            f"Updated registry.json + {gen_stats['files_generated']} API clients + index.js"
        )


@cli.command("sync")
@click.option("--dry-run", is_flag=True, help="Preview changes without writing files")
@click.option("-y", "--yes", is_flag=True, help="Skip confirmation prompt")
@click.option("--host", help="AEM host URL (or set AEM_HOST env var)")
@click.option("--auth", help="Authorization header (or set AEM_AUTH_HEADER env var)")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
def sync_from_aem(dry_run: bool, yes: bool, host: str, auth: str, verbose: bool):
    """Fetch APIs from AEM FDM and sync to OpenAPI YAML files.

    \b
    What it does:
      1. Fetches all api-integration definitions from AEM FDM
      2. Writes to temporary folder (.sync-preview/)
      3. Compares with current YAML specs
      4. Shows what would change
      5. Asks for confirmation
      6. If confirmed: updates YAML files and generates api-clients

    \b
    Examples:
        api-manager sync --dry-run   # Preview changes only
        api-manager sync             # Sync with confirmation
        api-manager sync -y          # Sync without confirmation
    """
    global _verbose
    _verbose = verbose

    import json
    import os
    import shutil

    from dotenv import load_dotenv

    from .aem_client import AemFdmClient
    from .config import Config
    from .exceptions import AemConnectionError, ConfigurationError
    from .openapi_parser import load_registry
    from .openapi_writer import generate_filename, write_api_to_openapi

    spec_dir, api_clients_dir, generated_dir = get_project_paths()

    # Load .env from user's current working directory
    cwd_env_path = Path.cwd() / ".env"
    if cwd_env_path.exists():
        load_dotenv(cwd_env_path)
    else:
        from dotenv import find_dotenv

        load_dotenv(dotenv_path=find_dotenv(usecwd=True))

    # Override with CLI options
    if host:
        os.environ["AEM_HOST"] = host
    if auth:
        os.environ["AEM_AUTH_HEADER"] = auth

    # Initialize client
    try:
        config = Config.from_env()
        client = AemFdmClient(config)
    except ConfigurationError as e:
        click.secho(f"Configuration error: {e}", fg="red", err=True)
        click.echo("\nTo configure AEM connection:")
        click.echo("  1. Set environment variables in .env (project root):")
        click.echo("     AEM_HOST=https://author.aem.example.com")
        click.echo("     AEM_TOKEN=your-bearer-token")
        click.echo("  2. Or use --host and --auth options")
        sys.exit(1)

    click.echo("Fetching APIs from AEM FDM...\n")

    try:
        remote_apis = client.fetch_all_apis()
    except AemConnectionError as e:
        click.secho(f"Failed to fetch from AEM: {e}", fg="red", err=True)
        sys.exit(1)

    click.echo(f"Found {len(remote_apis)} API(s) in AEM FDM")

    # Load current registry for comparison
    current_registry = load_registry()

    # Create temp directory for preview
    temp_dir = spec_dir / ".sync-preview"

    try:
        # Clean up any previous preview
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        temp_dir.mkdir(parents=True)

        click.echo("Processing AEM APIs...")

        # Identify local-only markdown files (exist locally but not in AEM)
        remote_names = set()
        for api in remote_apis:
            filename = generate_filename(api.get("name", "unknown"))
            remote_names.add(filename.lower())

        local_only_files = []
        for yaml_file in spec_dir.glob("*.yaml"):
            if yaml_file.name.startswith("_"):
                continue
            if yaml_file.name.lower() not in remote_names:
                local_only_files.append(yaml_file.name)

        # Step 1: Write YAML files to temp folder (mark as aem-api-integration source)
        # Track filename collisions (case-insensitive)
        filename_map = {}
        collisions = []
        for api in remote_apis:
            api["source"] = "aem-api-integration"  # Mark as synced from AEM
            name = api.get("name", "unknown")
            filename = generate_filename(name)

            if filename in filename_map:
                collisions.append(
                    f"{name} → {filename} (overwrites {filename_map[filename]})"
                )
            filename_map[filename] = name

            yaml_content = write_api_to_openapi(api)
            filepath = temp_dir / filename
            filepath.write_text(yaml_content, encoding="utf-8")

        click.echo("Building registry...")

        # Step 2: Build registry.json by parsing temp YAML files
        from .openapi_parser import parse_openapi_file

        temp_registry = {}
        parse_failures = []
        for yaml_file in temp_dir.glob("*.yaml"):
            if yaml_file.name.startswith("_"):
                continue
            api_config = parse_openapi_file(yaml_file)
            if api_config:
                key = yaml_file.stem
                temp_registry[key] = api_config
            else:
                parse_failures.append(yaml_file.name)

        # Save temp registry.json
        temp_registry_path = temp_dir / "registry.json"
        with open(temp_registry_path, "w", encoding="utf-8") as f:
            json.dump(temp_registry, f, indent=2)

        click.echo("Running tests...")

        # Step 3: Run 100% coverage tests comparing current vs temp registry
        passed, failures = run_comparison_tests(current_registry, temp_registry)

        # Filter out local_only from failures (we show local separately)
        actual_changes = [f for f in failures if f["type"] != "local_only"]

        # Find local APIs in current registry (source != "aem-api-integration")
        local_apis = [
            key
            for key, api in current_registry.items()
            if api.get("source", "local") != "aem-api-integration"
        ]

        # Show summary
        click.secho("\n" + "=" * 60, fg="blue")
        click.secho("SYNC PREVIEW", fg="blue", bold=True)
        click.secho("=" * 60, fg="blue")

        # Show summary counts
        aem_fetched = len(remote_apis)
        aem_written = len(filename_map)  # Unique files written
        aem_parsed = len(temp_registry)
        collision_count = len(collisions)
        parse_fail_count = len(parse_failures)
        local_api_count = len(local_apis)
        local_file_count = len(local_only_files)

        click.echo(
            f"\n  From AEM: {aem_fetched} APIs → {aem_written} files → {aem_parsed} parsed"
        )
        if collision_count > 0:
            click.secho(
                f"  ⚠ AEM has {collision_count} case-variant duplicates (should be fixed in AEM):",
                fg="yellow",
            )
            for c in collisions[:3]:
                click.echo(f"    • {c}")
            if collision_count > 3:
                click.echo(f"    ... and {collision_count - 3} more")
        if parse_fail_count > 0:
            click.secho(f"  Parse failures: {parse_fail_count}", fg="red")
            for f in parse_failures[:3]:
                click.echo(f"    • {f}")
            if parse_fail_count > 3:
                click.echo(f"    ... and {parse_fail_count - 3} more")
        if local_api_count > 0:
            click.echo(f"  Local APIs: {local_api_count} (manually added)")
        if local_file_count > 0:
            click.echo(f"  Local files: {local_file_count} (not in AEM)")

        if not actual_changes:
            click.secho(
                "\n  ✓ All tests passed. Local registry is up to date with AEM.",
                fg="green",
            )
            if local_apis:
                click.secho(
                    f"\n  Local APIs ({len(local_apis)}) - manually added, will be preserved:",
                    fg="cyan",
                )
                for api in local_apis[:5]:
                    click.echo(f"    • {api}")
                if len(local_apis) > 5:
                    click.echo(f"    ... and {len(local_apis) - 5} more")
            if local_only_files:
                click.secho(
                    f"\n  Local files ({len(local_only_files)}) - not in AEM, will be preserved:",
                    fg="yellow",
                )
                for f in local_only_files[:5]:
                    click.echo(f"    • {f}")
                if len(local_only_files) > 5:
                    click.echo(f"    ... and {len(local_only_files) - 5} more")

                # Always regenerate clients for local-only YAMLs (template or spec may have changed)
                click.echo(
                    f"\n  Regenerating clients for {len(local_only_files)} local YAML file(s)..."
                )
                merged_registry = dict(temp_registry)
                for key, api in current_registry.items():
                    if api.get("source", "local") != "aem-api-integration":
                        merged_registry[key] = api
                for local_file in local_only_files:
                    local_path = spec_dir / local_file
                    local_key = local_path.stem
                    if local_key not in merged_registry:
                        local_config = parse_openapi_file(local_path)
                        if local_config:
                            local_config["source"] = "local"
                            merged_registry[local_key] = local_config

                # Save updated registry and regenerate all clients
                registry_path = generated_dir / "registry.json"
                generated_dir.mkdir(parents=True, exist_ok=True)
                with open(registry_path, "w", encoding="utf-8") as f:
                    json.dump(merged_registry, f, indent=2)

                api_clients_dir.mkdir(parents=True, exist_ok=True)
                from .generator import generate_all_clients

                gen_stats = generate_all_clients(merged_registry, api_clients_dir)
                click.secho(
                    f"  ✓ Regenerated {gen_stats['files_generated']} API clients",
                    fg="green",
                )

            return

        # Show changes from AEM
        click.echo(f"\n{format_test_results(actual_changes)}")

        if local_apis:
            click.secho(
                f"  Local APIs ({len(local_apis)}) - manually added, will be preserved:",
                fg="cyan",
            )
            for api in local_apis[:5]:
                click.echo(f"    • {api}")
            if len(local_apis) > 5:
                click.echo(f"    ... and {len(local_apis) - 5} more")
            click.echo("")

        if local_only_files:
            click.secho(
                f"  Local files ({len(local_only_files)}) - not in AEM, will be preserved:",
                fg="yellow",
            )
            for f in local_only_files[:5]:
                click.echo(f"    • {f}")
            if len(local_only_files) > 5:
                click.echo(f"    ... and {len(local_only_files) - 5} more")
            click.echo("")

        click.secho("=" * 60, fg="blue")
        click.echo(f"Total: {len(actual_changes)} change(s) from AEM")

        # Dry run - stop here
        if dry_run:
            click.secho("\n[Dry Run] No changes applied.", fg="cyan")
            return

        # Ask for confirmation
        if not yes:
            click.echo("")
            if not click.confirm(
                click.style("Apply these changes?", fg="yellow", bold=True),
                default=False,
            ):
                click.echo("Cancelled. No changes made.")
                return

        # Apply changes - copy from temp folder to actual locations
        click.echo("\nApplying changes...")

        # Delete YAML files that were removed from AEM (had source: aem-api-integration)
        for failure in actual_changes:
            if failure["type"] == "removed_from_aem":
                api_key = failure["api"]
                yaml_file = spec_dir / f"{api_key}.yaml"
                if yaml_file.exists():
                    yaml_file.unlink()
                    log_verbose(f"Deleted: {yaml_file.name}")

        # Copy YAML files from temp to refs/apis/
        for yaml_file in temp_dir.glob("*.yaml"):
            dest = spec_dir / yaml_file.name
            shutil.copy2(yaml_file, dest)

        # Merge registries: AEM APIs + local APIs (preserve manually added)
        merged_registry = dict(temp_registry)  # Start with AEM APIs
        for key, api in current_registry.items():
            if api.get("source", "local") != "aem-api-integration":
                # Preserve local APIs
                merged_registry[key] = api

        # Parse local-only YAML files into registry (not from AEM, added manually)
        for local_file in local_only_files:
            local_path = spec_dir / local_file
            local_key = local_path.stem
            if local_key not in merged_registry:
                local_config = parse_openapi_file(local_path)
                if local_config:
                    local_config["source"] = "local"
                    merged_registry[local_key] = local_config
                    log_verbose(f"Parsed local YAML: {local_file}")

        # Save registry.json at generated_dir level
        registry_path = generated_dir / "registry.json"
        generated_dir.mkdir(parents=True, exist_ok=True)
        with open(registry_path, "w", encoding="utf-8") as f:
            json.dump(merged_registry, f, indent=2)

        # Generate API clients + index.js
        click.echo("Generating API clients...")
        api_clients_dir.mkdir(parents=True, exist_ok=True)
        from .generator import generate_all_clients

        gen_stats = generate_all_clients(merged_registry, api_clients_dir)

        click.secho("\nSync complete!", fg="green")
        click.echo(
            f"  - Updated {aem_written} API YAML files in refs/apis/generated/spec/"
        )
        click.echo(
            f"  - Generated {gen_stats['files_generated']} API clients + index.js in refs/apis/generated/api-clients/"
        )
        click.echo(f"  - Saved registry.json in refs/apis/generated/")

    finally:
        # Clean up temp directory
        if temp_dir.exists():
            shutil.rmtree(temp_dir)


def run_comparison_tests(
    current_registry: dict, new_registry: dict
) -> tuple[bool, list[dict]]:
    """Run 100% coverage tests comparing two registries.

    Tests:
      - API added/removed (distinguishes AEM vs local by source property)
      - Endpoint URL changed
      - HTTP method changed
      - Parameters added/removed
      - Required params changed
      - Response fields added/removed

    Args:
        current_registry: Existing registry (from registry.json)
        new_registry: New registry (from parsed markdown or AEM)

    Returns:
        Tuple of (all_passed, list of failures)
    """
    failures = []

    # Check for APIs in current but not in new
    for api_key in current_registry:
        if api_key not in new_registry:
            current_api = current_registry[api_key]
            source = current_api.get("source", "local")
            if source == "aem-api-integration":
                # Was synced from AEM but no longer exists there
                failures.append(
                    {
                        "type": "removed_from_aem",
                        "api": api_key,
                        "message": f"'{api_key}' removed from AEM",
                    }
                )
            else:
                # Local-only API, not in AEM (this is informational, not a failure)
                failures.append(
                    {
                        "type": "local_only",
                        "api": api_key,
                        "message": f"'{api_key}' (local only, not in AEM)",
                    }
                )

    # Check for new APIs in AEM
    for api_key in new_registry:
        if api_key not in current_registry:
            failures.append(
                {
                    "type": "new_in_aem",
                    "api": api_key,
                    "message": f"'{api_key}' new in AEM",
                }
            )

    # Check for changes in existing APIs
    for api_key in new_registry:
        if api_key not in current_registry:
            continue

        current = current_registry[api_key]
        new = new_registry[api_key]

        # Check endpoint change
        if current.get("endpoint") != new.get("endpoint"):
            failures.append(
                {
                    "type": "endpoint_changed",
                    "api": api_key,
                    "old": current.get("endpoint"),
                    "new": new.get("endpoint"),
                    "message": f"API '{api_key}' endpoint: {current.get('endpoint')} → {new.get('endpoint')}",
                }
            )

        # Check method change
        if current.get("method", "POST") != new.get("method", "POST"):
            failures.append(
                {
                    "type": "method_changed",
                    "api": api_key,
                    "old": current.get("method", "POST"),
                    "new": new.get("method", "POST"),
                    "message": f"API '{api_key}' method: {current.get('method', 'POST')} → {new.get('method', 'POST')}",
                }
            )

        # Check param changes
        current_params = set(current.get("params", {}).keys())
        new_params = set(new.get("params", {}).keys())

        added_params = new_params - current_params
        removed_params = current_params - new_params

        if added_params:
            failures.append(
                {
                    "type": "params_added",
                    "api": api_key,
                    "params": list(added_params),
                    "message": f"API '{api_key}' new params: {', '.join(sorted(added_params))}",
                }
            )

        if removed_params:
            failures.append(
                {
                    "type": "params_removed",
                    "api": api_key,
                    "params": list(removed_params),
                    "message": f"API '{api_key}' removed params: {', '.join(sorted(removed_params))}",
                }
            )

        # Check required params changes
        current_required = {
            name
            for name, cfg in current.get("params", {}).items()
            if cfg.get("required")
        }
        new_required = {
            name for name, cfg in new.get("params", {}).items() if cfg.get("required")
        }

        added_required = new_required - current_required
        removed_required = current_required - new_required

        if added_required:
            failures.append(
                {
                    "type": "required_added",
                    "api": api_key,
                    "params": list(added_required),
                    "message": f"API '{api_key}' new required params: {', '.join(sorted(added_required))}",
                }
            )

        if removed_required:
            failures.append(
                {
                    "type": "required_removed",
                    "api": api_key,
                    "params": list(removed_required),
                    "message": f"API '{api_key}' no longer required: {', '.join(sorted(removed_required))}",
                }
            )

        # Check response field changes
        current_response = set(current.get("response", {}).keys())
        new_response = set(new.get("response", {}).keys())

        added_response = new_response - current_response
        removed_response = current_response - new_response

        if added_response:
            failures.append(
                {
                    "type": "response_added",
                    "api": api_key,
                    "fields": list(added_response),
                    "message": f"API '{api_key}' new response fields: {', '.join(sorted(added_response))}",
                }
            )

        if removed_response:
            failures.append(
                {
                    "type": "response_removed",
                    "api": api_key,
                    "fields": list(removed_response),
                    "message": f"API '{api_key}' removed response fields: {', '.join(sorted(removed_response))}",
                }
            )

    all_passed = len(failures) == 0
    return all_passed, failures


def format_test_results(failures: list[dict]) -> str:
    """Format test failures for display."""
    if not failures:
        return "All tests passed. No changes detected."

    lines = [f"Found {len(failures)} change(s):\n"]

    # Group failures by type
    by_type = {}
    for f in failures:
        t = f["type"]
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(f)

    type_labels = {
        "new_in_aem": "New in AEM",
        "removed_from_aem": "Removed from AEM",
        "local_only": "Local Only (will be preserved)",
        "endpoint_changed": "Endpoint Changed",
        "method_changed": "Method Changed",
        "params_added": "New Parameters",
        "params_removed": "Removed Parameters",
        "required_added": "New Required Params",
        "required_removed": "No Longer Required",
        "response_added": "New Response Fields",
        "response_removed": "Removed Response Fields",
    }

    for change_type, items in by_type.items():
        label = type_labels.get(change_type, change_type)
        lines.append(f"  {label}:")
        for item in items[:10]:
            lines.append(f"    - {item['message']}")
        if len(items) > 10:
            lines.append(f"    ... and {len(items) - 10} more")
        lines.append("")

    return "\n".join(lines)


@cli.command("test")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
def run_api_tests(verbose: bool):
    """Test for differences between markdown files and registry.json.

    \b
    What it tests (100% coverage):
      - API added/removed
      - Endpoint URL changed
      - HTTP method changed
      - Parameters added/removed
      - Required params changed
      - Response fields added/removed

    \b
    Compares:
      - Builds temp registry from refs/apis/*.md
      - Tests temp registry vs current registry.json

    \b
    Use Cases:
      - Check if markdown edits need a rebuild
      - Verify registry.json is up to date
      - CI/CD validation

    \b
    Examples:
        api-manager test    # Check for differences
    """
    global _verbose
    _verbose = verbose

    from .parser import build_registry as do_build
    from .parser import load_registry

    click.echo("Building registry from markdown...")
    new_registry = do_build()

    click.echo("Loading current registry.json...")
    current_registry = load_registry()

    if not current_registry:
        click.secho(
            "No registry.json found. Run 'api-manager build' first.", fg="yellow"
        )
        sys.exit(1)

    click.echo("Running tests...")

    # Run tests
    passed, failures = run_comparison_tests(current_registry, new_registry)

    if passed:
        click.secho("\nAll tests passed. Registry is up to date.", fg="green")
        return

    # Show failures
    click.echo(f"\n{format_test_results(failures)}")

    click.secho("Tests failed.", fg="red")
    click.echo("\nOptions:")
    click.echo("  - Run 'api-manager build' to update registry.json")
    click.echo("  - Or fix the markdown files if changes are unintended")
    sys.exit(1)


if __name__ == "__main__":
    cli()
