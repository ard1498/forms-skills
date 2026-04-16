"""CLI entry point for git-sandbox."""

import sys
from pathlib import Path

import click

from . import __version__
from .config import Config
from .exceptions import ConfigurationError, GitSandboxError
from .workspace import Workspace


@click.group()
@click.version_option(version=__version__, prog_name="git-sandbox")
def cli():
    """Git Sandbox - Restricted git workspace for AI agents.

    \b
    A simple tool that provides controlled git access:
    - Validates file paths before commits
    - Validates branch names before pushes
    - Can reset workspace to clean state

    \b
    Quick start:
        1. Create sandbox.json with your config
        2. Run: git-sandbox init
        3. Make changes in workspace/
        4. Run: git-sandbox commit -m "message"
        5. Run: git-sandbox push <branch-name>
    """
    pass


def _load_config(config_path: Path = None) -> Config:
    """Load configuration with error handling."""
    try:
        return Config.load(path=config_path)
    except ConfigurationError as e:
        click.secho(f"Configuration error: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True, path_type=Path),
    help="Path to config file (default: sandbox.json)",
)
def init(config: Path):
    """Initialize workspace by cloning the repository.

    \b
    This command:
    - Clones the configured repository
    - Checks out the specified branch
    - Sets up sparse checkout for allowed paths

    \b
    Example:
        git-sandbox init
        git-sandbox init --config ./my-config.json
    """
    cfg = _load_config(config)
    ws = Workspace(cfg)

    if ws.exists():
        click.secho(f"Workspace already exists: {ws.root}", fg="yellow")
        click.echo("Use 'git-sandbox reset --hard' to re-initialize from current config.")
        return

    click.echo(f"Initializing workspace from {cfg.repo}...")
    click.echo(f"Branch: {cfg.branch}")

    try:
        base_commit = ws.init()
        click.secho(f"Workspace initialized at {ws.root}", fg="green")
        click.echo(f"Base commit: {base_commit[:8]}")
        click.echo()
        click.echo("Allowed paths:")
        for p in cfg.allowed_paths:
            click.echo(f"  {p}")
        click.echo()
        click.echo("Allowed branches:")
        for p in cfg.allowed_branches:
            click.echo(f"  {p}")
    except GitSandboxError as e:
        click.secho(f"Error: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True, path_type=Path),
    help="Path to config file (default: sandbox.json)",
)
def status(config: Path):
    """Show workspace status with path validation.

    \b
    Displays:
    - Changed files (allowed vs denied)
    - Current branch and base commit
    - Whether changes can be committed

    \b
    Example:
        git-sandbox status
    """
    cfg = _load_config(config)
    ws = Workspace(cfg)

    if not ws.exists():
        click.secho(f"Workspace not found: {ws.root}", fg="red", err=True)
        click.echo("Run 'git-sandbox init' first.")
        sys.exit(1)

    try:
        st = ws.status()

        click.echo(f"Branch: {st.current_branch}")
        click.echo(f"Base: {st.base_commit} ({st.ahead_by} commits ahead)")
        click.echo()

        if not st.changed_files:
            click.echo("No changes")
            return

        click.echo("Changed files:")
        for f in st.allowed_files:
            click.secho(f"  + {f}", fg="green")
        for f in st.denied_files:
            click.secho(f"  - {f} (outside allowed paths)", fg="red")

        click.echo()
        if st.can_commit:
            click.secho("Ready to commit", fg="green")
        else:
            if st.denied_files:
                click.secho("Cannot commit: files outside allowed paths", fg="red")
                click.echo("Revert denied files or update allowed_paths in config.")

    except GitSandboxError as e:
        click.secho(f"Error: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.option("-m", "--message", required=True, help="Commit message")
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True, path_type=Path),
    help="Path to config file (default: sandbox.json)",
)
def commit(message: str, config: Path):
    """Validate paths and commit changes.

    \b
    This command:
    - Checks all changed files against allowed_paths
    - Commits only if all files are allowed
    - Fails if any file is outside allowed paths

    \b
    Example:
        git-sandbox commit -m "Update wizard component"
    """
    cfg = _load_config(config)
    ws = Workspace(cfg)

    if not ws.exists():
        click.secho(f"Workspace not found: {ws.root}", fg="red", err=True)
        click.echo("Run 'git-sandbox init' first.")
        sys.exit(1)

    try:
        result = ws.commit(message)

        if result.success:
            click.secho(f"Committed {result.files_committed} file(s)", fg="green")
            click.echo(f"Commit: {result.commit_hash[:8]}")
        else:
            click.secho(result.message, fg="red", err=True)

            # Show denied files if any
            st = ws.status()
            if st.denied_files:
                click.echo()
                click.echo("Files outside allowed paths:")
                for f in st.denied_files:
                    click.echo(f"  {f}")
                click.echo()
                click.echo("Allowed paths:")
                for p in cfg.allowed_paths:
                    click.echo(f"  {p}")

            sys.exit(1)

    except GitSandboxError as e:
        click.secho(f"Error: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.argument("branch")
@click.option(
    "--no-rebase",
    is_flag=True,
    default=False,
    help="Skip rebase before pushing (default: rebase is on)",
)
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True, path_type=Path),
    help="Path to config file (default: sandbox.json)",
)
def push(branch: str, no_rebase: bool, config: Path):
    """Validate branch name, rebase, and push to remote.

    \b
    This command:
    - Validates branch name against allowed_branches
    - Creates the branch if needed
    - Fetches latest changes and rebases local commits (unless --no-rebase)
    - Pushes to origin

    \b
    Example:
        git-sandbox push session-123
        git-sandbox push claude-feature-x
        git-sandbox push session-123 --no-rebase
    """
    cfg = _load_config(config)
    ws = Workspace(cfg)

    if not ws.exists():
        click.secho(f"Workspace not found: {ws.root}", fg="red", err=True)
        click.echo("Run 'git-sandbox init' first.")
        sys.exit(1)

    try:
        result = ws.push(branch, rebase=not no_rebase)

        if result.success:
            click.secho(result.message, fg="green")
        else:
            click.secho(result.message, fg="red", err=True)
            click.echo()
            click.echo("Allowed branch patterns:")
            for p in cfg.allowed_branches:
                click.echo(f"  {p}")
            sys.exit(1)

    except GitSandboxError as e:
        click.secho(f"Error: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True, path_type=Path),
    help="Path to config file (default: sandbox.json)",
)
def rebase(config: Path):
    """Fetch latest changes and rebase local commits on top.

    \b
    This command:
    - Fetches latest changes from the configured origin branch
    - Rebases local commits on top
    - Aborts and preserves clean state if conflicts occur

    \b
    Example:
        git-sandbox rebase
    """
    cfg = _load_config(config)
    ws = Workspace(cfg)

    if not ws.exists():
        click.secho(f"Workspace not found: {ws.root}", fg="red", err=True)
        click.echo("Run 'git-sandbox init' first.")
        sys.exit(1)

    try:
        msg = ws.rebase()
        click.secho(msg, fg="green")

    except GitSandboxError as e:
        click.secho(f"Error: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.option("--hard", is_flag=True, help="Remove workspace and re-initialize from config")
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True, path_type=Path),
    help="Path to config file (default: sandbox.json)",
)
def reset(hard: bool, config: Path):
    """Reset workspace to clean state.

    \b
    Without --hard: Resets to origin branch, keeps changes unstaged
    With --hard: Removes workspace and re-initializes from current sandbox.json

    \b
    Example:
        git-sandbox reset          # Soft reset to origin branch
        git-sandbox reset --hard   # Complete re-initialization
    """
    cfg = _load_config(config)
    ws = Workspace(cfg)

    if not ws.exists():
        click.secho(f"Workspace not found: {ws.root}", fg="red", err=True)
        click.echo("Run 'git-sandbox init' first.")
        sys.exit(1)

    try:
        base = ws.reset(hard=hard)

        if hard:
            click.secho(f"Workspace re-initialized at {base[:8]}", fg="green")
            click.echo("All changes discarded. Clean state restored from sandbox.json")
        else:
            click.secho(f"Soft reset to {base[:8]}", fg="green")
            click.echo("Changes preserved as unstaged.")

    except GitSandboxError as e:
        click.secho(f"Error: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True, path_type=Path),
    help="Path to config file (default: sandbox.json)",
)
def branch(config: Path):
    """Show current branch and whether it can be pushed.

    \b
    Displays:
    - Current branch name
    - Whether it matches allowed_branches patterns
    - Allowed branch patterns for reference

    \b
    Example:
        git-sandbox branch
    """
    cfg = _load_config(config)
    ws = Workspace(cfg)

    if not ws.exists():
        click.secho(f"Workspace not found: {ws.root}", fg="red", err=True)
        click.echo("Run 'git-sandbox init' first.")
        sys.exit(1)

    try:
        st = ws.status()
        current = st.current_branch

        click.echo(f"Current branch: {current}")

        from .validator import validate_branch
        is_allowed = validate_branch(current, cfg.allowed_branches)

        if is_allowed:
            click.secho(f"Branch '{current}' matches allowed patterns — ready to push", fg="green")
        else:
            click.secho(f"Branch '{current}' does not match allowed patterns", fg="yellow")
            click.echo()
            click.echo("Allowed branch patterns:")
            for p in cfg.allowed_branches:
                click.echo(f"  {p}")

    except GitSandboxError as e:
        click.secho(f"Error: {e}", fg="red", err=True)
        sys.exit(1)


@cli.command()
def example_config():
    """Print an example sandbox.json configuration."""
    example = """{
  "repo": "https://${GITHUB_TOKEN}@github.com/owner/repo.git",
  "branch": "main",
  "workspace": "./workspace",
  "allowed_paths": [
    "blocks/form/**",
    "scripts/**"
  ],
  "allowed_branches": [
    "session-*",
    "claude-*"
  ]
}"""
    click.echo(example)


if __name__ == "__main__":
    cli()
