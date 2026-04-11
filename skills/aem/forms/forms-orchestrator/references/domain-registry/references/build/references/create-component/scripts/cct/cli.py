"""CLI entry point for Custom Component Tool (CCT)."""

import sys
from pathlib import Path
import click
from . import __version__
from .exceptions import CCTError
from .create import create_component


@click.group()
@click.version_option(version=__version__, prog_name="cct")
def cli():
    """Custom Component Tool (CCT) - Manage form custom components.
    
    \b
    This tool helps you create and manage custom form components for Edge Delivery.
    It ensures proper file structure and authoring configuration.
    
    \b
    Examples:
        cct create text-input countdown-timer
    """
    pass


@cli.command()
@click.argument('base_type')
@click.argument('view_type')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
def create(base_type: str, view_type: str, verbose: bool):
    """Create a new custom component.
    
    \b
    Arguments:
        BASE_TYPE: OOTB form field type to extend (e.g., text-input, radio-group)
        VIEW_TYPE: Custom view type identifier (e.g., countdown-timer, card-choice)
    
    \b
    Valid base types:
        button, checkbox, checkbox-group, date-input, drop-down, email,
        file-input, image, number-input, panel, radio-group, telephone-input,
        text, text-input
    
    \b
    This command will:
        • Create component directory: components/<view_type>/
        • Generate <view_type>.js with default implementation
        • Generate <view_type>.css with basic styles
        • Generate _<view_type>.json with authoring properties
    
    \b
    Examples:
        # Create a countdown timer extending number-input
        cct create number-input countdown-timer
        
        # Create a card choice extending radio-group
        cct create radio-group card-choice
        
        # Create a password field extending text-input
        cct create text-input password
    """
    try:
        # Create progress callback
        def on_progress(message: str) -> None:
            if verbose:
                click.echo(f"  {message}")
        
        click.echo(f"Creating custom component: {view_type}")
        click.echo(f"  Base type: {base_type}")
        
        # Create the component
        component_dir = create_component(
            base_type=base_type,
            view_type=view_type,
            base_path=Path.cwd(),
            on_progress=on_progress if verbose else None,
        )
        
        # Success output
        click.echo(f"\n✓ Component created at: {component_dir}")
        click.echo(f"✓ Files generated:")
        click.echo(f"    - {view_type}.js")
        click.echo(f"    - {view_type}.css")
        click.echo(f"    - _{view_type}.json")
        
        click.echo(f"\n✓ Configuration files updated:")
        click.echo(f"    - authoring/_form.json")
        click.echo(f"    - authoring/_component-definition.json")
        
        click.echo("\nNext steps:")
        click.echo(f"  1. Edit {view_type}.js to add your custom logic")
        click.echo(f"  2. Edit {view_type}.css to add custom styles")
        click.echo(f"  3. Update _{view_type}.json to add authoring properties")
        
        click.secho("\nSUCCESS: Component created and registered", fg="green")
        
    except CCTError as e:
        click.secho(f"ERROR: {e}", fg="red", err=True)
        sys.exit(1)
    except Exception as e:
        if verbose:
            import traceback
            click.secho(
                f"UNEXPECTED ERROR: {e}\n{traceback.format_exc()}",
                fg="red",
                err=True,
            )
        else:
            click.secho(f"UNEXPECTED ERROR: {e}", fg="red", err=True)
        sys.exit(1)


if __name__ == "__main__":
    cli()

