"""CLI entry point for AEM Form Sync."""

import sys
from typing import Callable, Optional

import click

from . import __version__
from .config import Config
from .exceptions import FormSyncError

# Global verbose flag
_verbose = False


def log_verbose(message: str) -> None:
    """Print message only if verbose mode is enabled."""
    if _verbose:
        click.secho(f"  [DEBUG] {message}", fg="cyan")


@click.group()
@click.version_option(version=__version__, prog_name="form-sync")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output for debugging")
@click.pass_context
def cli(ctx, verbose):
    """AEM Form Sync - Pull and push forms to Adobe Experience Manager.

    \b
    Examples:
        form-sync pull /content/forms/af/myform
        form-sync push /content/forms/af/myform
    """
    global _verbose
    _verbose = verbose
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose


@cli.command()
@click.argument("form_path")
@click.option("--no-rules", is_flag=True, help="Skip rules extraction")
@click.option(
    "--output",
    "-o",
    default=None,
    help="Output directory (mutually exclusive with --no-edit)",
)
@click.option(
    "--no-edit", is_flag=True, help="Sync to refs directory (read-only reference)"
)
@click.option("--no-fragments", is_flag=True, help="Skip recursive fragment pull (pull top-level form only)")
@click.pass_context
def pull(ctx, form_path: str, no_rules: bool, output: str, no_edit: bool, no_fragments: bool):
    """Pull a form from AEM to local filesystem.

    \b
    FORM_PATH: Full AEM path to the form (e.g., /content/forms/af/myform)

    \b
    By default, all fragment dependencies are pulled recursively
    (form → frag-1 → frag-2, etc.). Use --no-fragments to pull the
    top-level form only.

    \b
    By default, forms are synced to repo/ directory (editable).
    Use --no-edit to sync to refs/ directory (read-only reference).

    \b
    Examples:
        form-sync pull /content/forms/af/acroform
        form-sync pull /content/forms/af/acroform --no-edit
        form-sync -v pull /content/forms/af/acroform
        form-sync pull /content/forms/af/acroform --no-rules
        form-sync pull /content/forms/af/acroform --output ./forms
        form-sync pull /content/forms/af/acroform --no-fragments
    """
    verbose = ctx.obj["verbose"]

    import json
    from pathlib import Path

    from .pull import pull_form, pull_with_fragments, extract_fragment_paths

    # Validate mutual exclusion
    if output and no_edit:
        raise click.UsageError(
            "Cannot use --output with --no-edit. Use one or the other."
        )

    try:
        # Load configuration
        click.echo("Loading configuration...")
        config = Config.from_env()
        log_verbose(f"AEM Host: {config.aem_host}")

        # Pull the form
        click.echo(f"Fetching form from AEM: {form_path}")
        log_verbose(
            f"API URL: {config.aem_host}{form_path}/jcr:content/root/section/form.-1.json"
        )
        if no_rules:
            log_verbose("Skipping rules extraction")
        if no_edit:
            log_verbose("Syncing to refs directory (read-only)")
        if output:
            log_verbose(f"Output directory: {output}")
        if no_fragments:
            log_verbose("Fragment pull skipped (--no-fragments)")

        output_dir = Path(output) if output else None

        if no_fragments:
            output_path, form_key = pull_form(
                form_path, config,
                extract_rules=not no_rules,
                output_dir=output_dir,
                no_edit=no_edit,
            )
            click.echo(f"✓ Saved to {output_path}")
            click.echo(f"✓ Updated metadata.json (key: {form_key})")

            # Hint if the form has fragment references
            with open(output_path, "r", encoding="utf-8") as f:
                form_data = json.load(f)
            fragment_paths = extract_fragment_paths(form_data)
            if fragment_paths:
                click.secho(
                    f"ℹ  Found {len(fragment_paths)} fragment reference(s). "
                    "Re-run without --no-fragments to pull them too.",
                    fg="yellow"
                )

            click.secho("SUCCESS: Form pulled successfully", fg="green")
        else:
            results = pull_with_fragments(
                form_path, config,
                extract_rules=not no_rules,
                output_dir=output_dir,
                no_edit=no_edit,
            )
            for out_path, form_key in results:
                click.echo(f"✓ Saved to {out_path} (key: {form_key})")
            click.echo(f"✓ Updated metadata.json ({len(results)} item(s) total)")
            click.secho(f"SUCCESS: Pulled {len(results)} form(s)/fragment(s)", fg="green")

    except FormSyncError as e:
        click.secho(f"ERROR: {e}", fg="red", err=True)
        sys.exit(1)
    except Exception as e:
        if verbose:
            import traceback

            click.secho(
                f"UNEXPECTED ERROR: {e}\n{traceback.format_exc()}", fg="red", err=True
            )
        else:
            click.secho(f"UNEXPECTED ERROR: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command("list")
@click.argument("dam_path")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.option("--pull", "do_pull", is_flag=True, help="Pull all listed forms")
@click.option("--no-rules", is_flag=True, help="Skip rules extraction when pulling")
@click.option(
    "--output",
    "-o",
    default=None,
    help="Output directory for pulled forms (mutually exclusive with --no-edit)",
)
@click.option(
    "--no-edit",
    is_flag=True,
    help="Sync pulled forms to refs directory (read-only reference)",
)
@click.pass_context
def list_forms(
    ctx,
    dam_path: str,
    as_json: bool,
    do_pull: bool,
    no_rules: bool,
    output: str,
    no_edit: bool,
):
    """List forms in an AEM DAM folder.

    \b
    DAM_PATH: AEM DAM path to list (e.g., /content/dam/formsanddocuments/myfolder)

    \b
    Examples:
        form-sync list /content/dam/formsanddocuments/form-coder/fragments
        form-sync list /content/dam/formsanddocuments/form-coder/fragments --json
        form-sync list /content/dam/formsanddocuments/form-coder/fragments --pull
        form-sync list /content/dam/formsanddocuments/form-coder/fragments --pull --no-edit
        form-sync list /content/dam/formsanddocuments/form-coder/fragments --pull --no-rules
        form-sync list /content/dam/formsanddocuments/form-coder/fragments --pull --output ./forms
    """
    verbose = ctx.obj["verbose"]

    import json
    from pathlib import Path

    from .client import AEMClient
    from .pull import pull_form

    # Validate mutual exclusion
    if output and no_edit:
        raise click.UsageError(
            "Cannot use --output with --no-edit. Use one or the other."
        )

    def dam_to_content_path(dam_path: str) -> str:
        """Convert DAM path to form content path."""
        if dam_path.startswith("/content/dam/formsanddocuments"):
            return dam_path.replace(
                "/content/dam/formsanddocuments", "/content/forms/af"
            )
        return dam_path

    try:
        # Load configuration
        click.echo("Loading configuration...")
        config = Config.from_env()
        log_verbose(f"AEM Host: {config.aem_host}")
        if no_edit:
            log_verbose("Syncing to refs directory (read-only)")
        if output:
            log_verbose(f"Output directory: {output}")

        # Create client and fetch listing
        client = AEMClient(config)
        click.echo(f"Fetching forms from: {dam_path}")
        log_verbose(f"API URL: {config.aem_host}{dam_path}.-1.json")

        response = client.get(f"{dam_path}.-1.json")
        data = response.json()

        # Parse forms from response
        forms = []
        for key, value in data.items():
            if key.startswith(("jcr:", "sling:", "rep:")):
                continue
            if isinstance(value, dict):
                form_info = {
                    "name": key,
                    "damPath": f"{dam_path}/{key}",
                    "contentPath": dam_to_content_path(f"{dam_path}/{key}"),
                }
                # Extract title if available
                if "jcr:content" in value and isinstance(value["jcr:content"], dict):
                    jcr_content = value["jcr:content"]
                    if "jcr:title" in jcr_content:
                        form_info["title"] = jcr_content["jcr:title"]
                elif "jcr:title" in value:
                    form_info["title"] = value["jcr:title"]
                forms.append(form_info)

        # Output results
        if as_json:
            click.echo(json.dumps(forms, indent=2))
        else:
            click.echo(f"\nFound {len(forms)} form(s):\n")
            for i, form in enumerate(forms, 1):
                title = form.get("title", form["name"])
                click.echo(f"  {i}. {title}")
                click.echo(f"     Content: {form['contentPath']}")
                log_verbose(f"DAM: {form['damPath']}")
                click.echo()

        # Pull forms if requested
        if do_pull and forms:
            output_dir = Path(output) if output else None
            if output_dir:
                click.echo(f"Pulling forms to: {output_dir}")
            elif no_edit:
                click.echo("Pulling forms to refs/ (read-only)...")
            else:
                click.echo("Pulling forms to repo/...")
            success_count = 0
            for form in forms:
                try:
                    output_path, form_key = pull_form(
                        form["contentPath"],
                        config,
                        extract_rules=not no_rules,
                        output_dir=output_dir,
                        no_edit=no_edit,
                    )
                    click.echo(f"  ✓ Pulled: {form['name']} → {output_path}")
                    success_count += 1
                except FormSyncError as e:
                    click.secho(f"  ✗ Failed: {form['name']} - {e}", fg="red")

            click.echo(f"\nPulled {success_count}/{len(forms)} forms successfully.")

        click.secho("SUCCESS: List complete", fg="green")

    except FormSyncError as e:
        click.secho(f"ERROR: {e}", fg="red", err=True)
        sys.exit(1)
    except Exception as e:
        if verbose:
            import traceback

            click.secho(
                f"UNEXPECTED ERROR: {e}\n{traceback.format_exc()}", fg="red", err=True
            )
        else:
            click.secho(f"UNEXPECTED ERROR: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.argument("form_path")
@click.option(
    "--source",
    "-s",
    default=None,
    help="Source JSON file (default: {form_name}.form.json in current directory)",
)
@click.option(
    "--suffix",
    "-x",
    default="-v1",
    help="Suffix to append to form name when creating new form (default: -v1)",
)
@click.option(
    "--new",
    "force_new",
    is_flag=True,
    help="Force creation of new form even if one already exists",
)
@click.option(
    "--preview",
    is_flag=True,
    help="Push to preview path defined by FORM_SYNC_PREVIEW_PATH env variable",
)
@click.option(
    "--to-original",
    "to_original",
    is_flag=True,
    help="Push directly to the original AEM path (originalPath in metadata)",
)
@click.option(
    "--no-fragments",
    is_flag=True,
    help="Skip recursive fragment push (push only the specified form/fragment)",
)
@click.pass_context
def push(
    ctx,
    form_path: str,
    source: str,
    suffix: str,
    force_new: bool,
    preview: bool,
    to_original: bool,
    no_fragments: bool,
):
    """Push a local form to AEM.

    \b
    FORM_PATH: Full AEM path for the form (e.g., /content/forms/af/myform)

    \b
    By default, pushes dependent fragments recursively (like pull does).
    Use --no-fragments to push only the specified form/fragment.

    \b
    Examples:
        form-sync push /content/forms/af/acroform
        form-sync push /content/forms/af/acroform --source ./acroform.form.json
        form-sync push /content/forms/af/acroform --suffix -v2
        form-sync push /content/forms/af/acroform --new
        form-sync push /content/forms/af/acroform --preview
        form-sync push /content/forms/af/acroform --to-original
        form-sync push /content/forms/af/acroform --no-fragments
        form-sync -v push /content/forms/af/acroform

    \b
    Note: First push creates a new form with suffix. Subsequent pushes
    update the existing form. Use --new to create a new form instead.
    Use --preview to push to a separate preview path (requires FORM_SYNC_PREVIEW_PATH env).
    Use --to-original to push directly to the original AEM path (skips versioning).
    Use --no-fragments to skip pushing dependent fragments.
    """
    verbose = ctx.obj["verbose"]

    from .push import push_form, push_with_fragments

    # Validate mutual exclusions
    if to_original and force_new:
        raise click.UsageError("Cannot use --to-original with --new.")
    if to_original and preview:
        raise click.UsageError("Cannot use --to-original with --preview.")

    # Validate mutual exclusions
    if to_original and force_new:
        raise click.UsageError("Cannot use --to-original with --new.")
    if to_original and preview:
        raise click.UsageError("Cannot use --to-original with --preview.")

    try:
        # Load configuration
        click.echo("Loading configuration...")
        config = Config.from_env()
        log_verbose(f"AEM Host: {config.aem_host}")

        # Handle preview flag
        preview_path = None
        if preview:
            if not config.preview_path:
                click.secho(
                    "WARNING: --preview flag used but FORM_SYNC_PREVIEW_PATH environment variable is not set.\n"
                    "Please set FORM_SYNC_PREVIEW_PATH in your .env file to use preview mode.",
                    fg="yellow",
                    err=True,
                )
                sys.exit(1)
            preview_path = config.preview_path
            # Normalize to DAM path format (accepts both forms and DAM paths)
            if preview_path.startswith("/content/forms/af/"):
                preview_path = preview_path.replace(
                    "/content/forms/af/", "/content/dam/formsanddocuments/"
                )
                log_verbose(f"Converted forms path to DAM path: {preview_path}")
            log_verbose(f"Preview path: {preview_path}")

        # Push the form
        click.echo(f"Pushing form to AEM: {form_path}")
        if source:
            click.echo(f"  Source file: {source}")
        if force_new:
            click.echo(f"  Creating new form with suffix: {suffix}")
        if preview_path:
            click.echo(f"  Preview mode: pushing to {preview_path}")

        # Create progress callback for verbose mode
        def on_progress(message: str) -> None:
            if verbose:
                click.echo(f"  {message}")

        if to_original:
            log_verbose("Pushing to original AEM path")
        if no_fragments:
            log_verbose("Fragment push skipped (--no-fragments)")

        progress_cb = on_progress if verbose else None

        if no_fragments:
            # Push only the specified form/fragment (original behavior)
            target_path, is_new_form = push_form(
                form_path, config, source, suffix, force_new, progress_cb,
                preview_path=preview_path,
                to_original=to_original,
            )
            results = [(target_path, is_new_form)]
        else:
            # Recursively push dependent fragments, then the form
            results = push_with_fragments(
                form_path, config, source, suffix, force_new, progress_cb,
                preview_path=preview_path,
                to_original=to_original,
            )

        # Success output
        for target_path, is_new_form in results:
            if is_new_form:
                click.echo(f"  Created new: {target_path}")
            else:
                click.echo(f"  Updated: {target_path}")

        main_target = results[0][0] if results else form_path
        click.echo(f"✓ Pushed {len(results)} form(s)/fragment(s)")
        if not preview and not to_original and any(is_new for _, is_new in results):
            click.echo(f"✓ Updated metadata.json")
        click.secho(
            f"SUCCESS: Form pushed to {main_target}",
            fg="green",
        )

    except FormSyncError as e:
        click.secho(f"ERROR: {e}", fg="red", err=True)
        sys.exit(1)
    except Exception as e:
        if verbose:
            import traceback

            click.secho(
                f"UNEXPECTED ERROR: {e}\n{traceback.format_exc()}", fg="red", err=True
            )
        else:
            click.secho(f"UNEXPECTED ERROR: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.argument("form_path")
@click.pass_context
def clear(ctx, form_path: str):
    """Clear a local form to empty state.

    \b
    FORM_PATH: Full AEM path to the form (e.g., /content/forms/af/forms-team/demo)

    \b
    This resets the form.json to a minimal empty form structure and
    clears the rule.json file. Useful for starting fresh with a form.

    \b
    Examples:
        form-sync clear /content/forms/af/forms-team/demo
        form-sync -v clear /content/forms/af/my-project/my-form
    """
    verbose = ctx.obj["verbose"]

    import json
    from pathlib import Path

    from .metadata import MetadataManager

    # Minimal form structure
    EMPTY_FORM = {
        "jcr:primaryType": "nt:unstructured",
        "fieldType": "form",
        "sling:resourceType": "fd/franklin/components/form/v1/form",
        "fd:version": "2.1",
        "dorType": "none",
        "thankYouOption": "message",
    }

    try:
        # Load metadata and find form by path
        click.echo("Loading metadata...")
        metadata_manager = MetadataManager()

        # Search for form by original_path or current_path
        form_key = None
        form_metadata = None
        for key in metadata_manager._data:
            data = metadata_manager._data[key]
            if isinstance(data, dict) and "originalPath" in data:
                if (
                    data.get("originalPath") == form_path
                    or data.get("currentPath") == form_path
                ):
                    form_key = key
                    form_metadata = metadata_manager.get_form(key)
                    break

        if not form_metadata:
            click.secho(
                f"ERROR: Form with path '{form_path}' not found in metadata.json",
                fg="red",
                err=True,
            )
            sys.exit(1)

        log_verbose(f"Form key: {form_key}")
        log_verbose(f"Form location: {form_metadata.location}")
        log_verbose(f"Local file: {form_metadata.local_file}")
        if form_metadata.local_rule_file:
            log_verbose(f"Rule file: {form_metadata.local_rule_file}")

        # Determine base directory
        if form_metadata.location == "refs":
            base_dir = Path("./refs")
        else:
            base_dir = Path("./repo")

        # Clear form.json (local_file already contains the relative path)
        form_file = base_dir / form_metadata.local_file
        if form_file.exists():
            click.echo(f"Clearing form: {form_file}")
            with open(form_file, "w", encoding="utf-8") as f:
                json.dump(EMPTY_FORM, f, indent=2)
            click.echo(f"✓ Cleared {form_metadata.local_file}")
        else:
            click.secho(f"WARNING: Form file not found: {form_file}", fg="yellow")

        # Clear rule.json (local_rule_file already contains the relative path)
        if form_metadata.local_rule_file:
            rule_file = base_dir / form_metadata.local_rule_file
            if rule_file.exists():
                click.echo(f"Clearing rules: {rule_file}")
                with open(rule_file, "w", encoding="utf-8") as f:
                    json.dump({}, f, indent=2)
                click.echo(f"✓ Cleared {form_metadata.local_rule_file}")
            else:
                log_verbose(f"Rule file not found: {rule_file}")

        click.secho(f"SUCCESS: Form '{form_path}' cleared", fg="green")

    except FormSyncError as e:
        click.secho(f"ERROR: {e}", fg="red", err=True)
        sys.exit(1)
    except Exception as e:
        if verbose:
            import traceback

            click.secho(
                f"UNEXPECTED ERROR: {e}\n{traceback.format_exc()}", fg="red", err=True
            )
        else:
            click.secho(f"UNEXPECTED ERROR: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.argument("folder_path")
@click.argument("form_name")
@click.pass_context
def create(ctx, folder_path: str, form_name: str):
    """Create a new empty form on AEM.

    \b
    FOLDER_PATH: AEM folder path where form will be created
                 (e.g., /content/forms/af/myproject)
    FORM_NAME:   Name for the new form (e.g., my-new-form)

    \b
    Examples:
        form-sync create /content/forms/af/forms-team my-form
        form-sync create /content/forms/af/forms-team/subfolder contact-form

    \b
    Note: The folder must be in your AEM_WRITE_PATHS.
    If a form with the same name exists, a suffix (-1, -2, etc.) will be added.
    """
    verbose = ctx.obj["verbose"]

    import time

    from .client import AEMClient
    from .metadata import MetadataManager
    from .pull import pull_form
    from .push import (
        create_empty_form,
        get_form_path_from_url,
        update_edge_delivery_config,
    )

    try:
        # Load configuration
        click.echo("Loading configuration...")
        config = Config.from_env()
        log_verbose(f"AEM Host: {config.aem_host}")

        # Create client
        client = AEMClient(config)

        # Validate folder path format
        if not folder_path.startswith("/content/forms/af/"):
            click.secho(
                f"ERROR: Folder path must start with /content/forms/af/\n"
                f"Got: {folder_path}",
                fg="red",
                err=True,
            )
            sys.exit(1)

        # Check allowlist
        click.echo(f"Checking allowlist for: {folder_path}")
        client.check_path_allowed(folder_path)
        log_verbose("Path is in allowlist")

        # Convert forms path to DAM path for listing
        dam_path = folder_path.replace(
            "/content/forms/af/", "/content/dam/formsanddocuments/"
        )
        log_verbose(f"DAM path: {dam_path}")

        # List existing forms in the folder
        click.echo(f"Checking existing forms in: {folder_path}")
        try:
            response = client.get(f"{dam_path}.-1.json")
            data = response.json()
            existing_forms = set()
            for key, value in data.items():
                if not key.startswith(("jcr:", "sling:", "rep:")) and isinstance(
                    value, dict
                ):
                    existing_forms.add(key)
            log_verbose(f"Found {len(existing_forms)} existing form(s)")
        except FormSyncError:
            # Folder might not exist or be empty
            existing_forms = set()
            log_verbose("No existing forms found or folder is empty")

        # Check if form name exists and add suffix if needed
        final_form_name = form_name
        suffix_counter = 1
        while final_form_name in existing_forms:
            final_form_name = f"{form_name}-{suffix_counter}"
            suffix_counter += 1
            log_verbose(f"Name conflict, trying: {final_form_name}")

        if final_form_name != form_name:
            click.echo(f"Form '{form_name}' already exists, using: {final_form_name}")

        # Create the form
        click.echo(f"Creating form: {final_form_name}")
        form_url = create_empty_form(
            client=client,
            config=config,
            form_title=final_form_name,
            folder_path=dam_path,
        )

        target_path = get_form_path_from_url(form_url)

        # Verify created form path is in allowlist
        client.check_path_allowed(target_path)
        click.echo(f"✓ Created new form: {target_path}")

        # Wait for form to be ready
        click.echo("Waiting for form to be ready...")
        time.sleep(3)

        # Pull the form to create local files and metadata
        click.echo(f"Pulling form to create local files...")
        output_path, form_key = pull_form(
            target_path, config, extract_rules=True, override_form_key=final_form_name
        )

        # Set currentPath to the target_path so push updates this form instead of creating a new version
        metadata_manager = MetadataManager()
        metadata_manager.set_current_path(form_key, target_path)

        # Update Edge Delivery configuration with branch
        def on_progress(message: str) -> None:
            if verbose:
                click.echo(f"  {message}")

        click.echo("Updating Edge Delivery configuration...")
        eds_result = update_edge_delivery_config(
            client, config, target_path, on_progress if verbose else None
        )
        if eds_result["success"]:
            click.echo("✓ Edge Delivery configuration updated")
        else:
            click.secho(
                f"⚠ Edge Delivery config update failed: {eds_result['message']}",
                fg="yellow",
                err=True,
            )
            if eds_result.get("remediation"):
                click.secho(
                    f"  Remediation: {eds_result['remediation']}", fg="yellow", err=True
                )
            click.secho(
                "  The form was created successfully, but its EDS cloud config needs to be fixed manually.",
                fg="yellow",
                err=True,
            )

        # Success output
        click.echo(f"✓ Saved to {output_path}")
        click.echo(f"✓ Updated metadata.json (key: {form_key})")
        click.secho(f"SUCCESS: Form created and pulled to {output_path}", fg="green")

    except FormSyncError as e:
        click.secho(f"ERROR: {e}", fg="red", err=True)
        sys.exit(1)
    except Exception as e:
        if verbose:
            import traceback

            click.secho(
                f"UNEXPECTED ERROR: {e}\n{traceback.format_exc()}", fg="red", err=True
            )
        else:
            click.secho(f"UNEXPECTED ERROR: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command("create-fragment")
@click.argument("folder_path")
@click.argument("fragment_name")
@click.pass_context
def create_fragment(ctx, folder_path: str, fragment_name: str):
    """Create a new empty fragment on AEM.

    \b
    FOLDER_PATH:   AEM folder path where fragment will be created
                   (e.g., /content/forms/af/myproject/fragments)
    FRAGMENT_NAME: Name for the new fragment (e.g., my-new-fragment)

    \b
    Examples:
        form-sync create-fragment /content/forms/af/forms-team/fragments my-fragment
        form-sync create-fragment /content/forms/af/forms-team/subfolder contact-panel

    \b
    Note: The folder must be in your AEM_WRITE_PATHS.
    If a fragment with the same name exists, a suffix (-1, -2, etc.) will be added.
    """
    verbose = ctx.obj["verbose"]

    import time

    from .client import AEMClient
    from .metadata import MetadataManager
    from .pull import pull_form
    from .push import create_empty_fragment, update_edge_delivery_config

    try:
        # Load configuration
        click.echo("Loading configuration...")
        config = Config.from_env()
        log_verbose(f"AEM Host: {config.aem_host}")

        # Create client
        client = AEMClient(config)

        # Validate folder path format
        if not folder_path.startswith("/content/forms/af/"):
            click.secho(
                f"ERROR: Folder path must start with /content/forms/af/\n"
                f"Got: {folder_path}",
                fg="red",
                err=True,
            )
            sys.exit(1)

        # Check allowlist
        click.echo(f"Checking allowlist for: {folder_path}")
        client.check_path_allowed(folder_path)
        log_verbose("Path is in allowlist")

        # Convert forms path to DAM path for listing
        dam_path = folder_path.replace(
            "/content/forms/af/", "/content/dam/formsanddocuments/"
        )
        log_verbose(f"DAM path: {dam_path}")

        # List existing fragments in the folder
        click.echo(f"Checking existing fragments in: {folder_path}")
        try:
            response = client.get(f"{dam_path}.-1.json")
            data = response.json()
            existing_items = set()
            # Handle both dict and list responses from AEM
            if isinstance(data, dict):
                for key, value in data.items():
                    if not key.startswith(("jcr:", "sling:", "rep:")) and isinstance(
                        value, dict
                    ):
                        existing_items.add(key)
            elif isinstance(data, list):
                # List response - extract names from items
                for item in data:
                    if isinstance(item, dict) and "name" in item:
                        existing_items.add(item["name"])
            log_verbose(f"Found {len(existing_items)} existing item(s)")
        except FormSyncError:
            # Folder might not exist or be empty
            existing_items = set()
            log_verbose("No existing items found or folder is empty")

        # Check if fragment name exists and add suffix if needed
        final_fragment_name = fragment_name
        suffix_counter = 1
        while final_fragment_name in existing_items:
            final_fragment_name = f"{fragment_name}-{suffix_counter}"
            suffix_counter += 1
            log_verbose(f"Name conflict, trying: {final_fragment_name}")

        if final_fragment_name != fragment_name:
            click.echo(
                f"Fragment '{fragment_name}' already exists, using: {final_fragment_name}"
            )

        # Create the fragment
        click.echo(f"Creating fragment: {final_fragment_name}")
        target_path = create_empty_fragment(
            client=client,
            config=config,
            fragment_title=final_fragment_name,
            fragment_name=final_fragment_name,
            folder_path=dam_path,
        )

        # Verify created fragment path is in allowlist
        client.check_path_allowed(target_path)
        click.echo(f"✓ Created new fragment: {target_path}")

        # Wait for fragment to be ready
        click.echo("Waiting for fragment to be ready...")
        time.sleep(3)

        # Pull the fragment to create local files and metadata
        click.echo(f"Pulling fragment to create local files...")
        output_path, fragment_key = pull_form(
            target_path,
            config,
            extract_rules=True,
            override_form_key=final_fragment_name,
        )

        # Set currentPath to the target_path so push updates this fragment instead of creating a new version
        metadata_manager = MetadataManager()
        metadata_manager.set_current_path(fragment_key, target_path)

        # Update Edge Delivery configuration with branch
        def on_progress(message: str) -> None:
            if verbose:
                click.echo(f"  {message}")

        click.echo("Updating Edge Delivery configuration...")
        eds_result = update_edge_delivery_config(
            client, config, target_path, on_progress if verbose else None
        )
        if eds_result["success"]:
            click.echo("✓ Edge Delivery configuration updated")
        else:
            click.secho(
                f"⚠ Edge Delivery config update failed: {eds_result['message']}",
                fg="yellow",
                err=True,
            )
            if eds_result.get("remediation"):
                click.secho(
                    f"  Remediation: {eds_result['remediation']}", fg="yellow", err=True
                )
            click.secho(
                "  The fragment was created successfully, but its EDS cloud config needs to be fixed manually.",
                fg="yellow",
                err=True,
            )

        # Success output
        click.echo(f"✓ Saved to {output_path}")
        click.echo(f"✓ Updated metadata.json (key: {fragment_key}, fragment: true)")
        click.secho(
            f"SUCCESS: Fragment created and pulled to {output_path}", fg="green"
        )

    except FormSyncError as e:
        click.secho(f"ERROR: {e}", fg="red", err=True)
        sys.exit(1)
    except Exception as e:
        if verbose:
            import traceback

            click.secho(
                f"UNEXPECTED ERROR: {e}\n{traceback.format_exc()}", fg="red", err=True
            )
        else:
            click.secho(f"UNEXPECTED ERROR: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.pass_context
def login(ctx):
    """Refresh your AEM authentication token.

    \b
    Guides you through getting a fresh token from Adobe Experience Cloud
    and saves it as AEM_TOKEN in your .env file.

    \b
    Steps (also shown interactively):
        1. Open https://experience.adobe.com/ and log in
        2. Press Ctrl+I to open the token inspector
        3. Copy the token and paste it here

    \b
    Examples:
        form-sync login
    """
    import webbrowser
    from dotenv import find_dotenv, set_key
    from pathlib import Path

    verbose = ctx.obj["verbose"]

    ADOBE_URL = "https://experience.adobe.com/"

    click.echo()
    click.secho("AEM Token Refresh", bold=True)
    click.echo("─" * 50)
    click.echo()
    click.echo("Follow these steps to get a fresh token:\n")
    click.secho(f"  1. Open:   {ADOBE_URL}", fg="cyan")
    click.echo( "  2. Log in with your Adobe credentials")
    click.secho("  3. Press   Ctrl+I  (opens the token inspector)", fg="cyan")
    click.echo( "  4. Copy the token from the inspector")
    click.echo()

    # Best-effort browser open
    try:
        click.echo("Opening browser...")
        webbrowser.open(ADOBE_URL)
    except Exception:
        pass

    click.echo()
    click.echo("A text editor will open — paste the token there, save, and close.")
    input("Press Enter to open the editor...")

    instructions = "# Paste your AEM token below (lines starting with # are ignored):\n\n"
    result = click.edit(instructions)

    if not result:
        click.secho("ERROR: No token provided (editor closed without saving).", fg="red", err=True)
        sys.exit(1)

    # Strip comment lines, join remaining content (token may wrap across lines in some editors)
    lines = [l for l in result.splitlines() if not l.startswith("#") and l.strip()]
    token = "".join(lines).strip()

    if not token:
        click.secho("ERROR: Token cannot be empty.", fg="red", err=True)
        sys.exit(1)

    # Find the .env file (search from CWD upwards)
    env_path = find_dotenv(usecwd=True)
    if not env_path:
        env_path = str(Path.cwd() / ".env")
        click.echo(f"No .env file found — creating: {env_path}")

    log_verbose(f".env path: {env_path}")

    try:
        set_key(env_path, "AEM_TOKEN", token)
        click.echo()
        click.secho(f"✓ AEM_TOKEN saved to {env_path}", fg="green")
        click.secho("SUCCESS: Token updated. You can now run form-sync commands.", fg="green")
    except Exception as e:
        click.secho(f"ERROR: Failed to write token to .env: {e}", fg="red", err=True)
        sys.exit(1)


if __name__ == "__main__":
    cli()
