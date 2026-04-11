"""Push operation for EDS Code Sync (git-based)."""

import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from .config import Config
from .exceptions import GitHubError
from .git_ops import GitOperations
from .github_client import GitHubClient
from .mapper import FileMapper


def _run_npm_command(
    command: list, cwd: Path, on_progress: Optional[Callable[[str], None]] = None
) -> None:
    """
    Run an npm command in the specified directory.

    Args:
        command: Command and arguments as list (e.g., ["npm", "install"]).
        cwd: Working directory for the command.
        on_progress: Optional progress callback.

    Raises:
        GitHubError: If command fails.
    """
    try:
        if on_progress:
            on_progress(f"Running: {' '.join(command)}")

        result = subprocess.run(
            command, cwd=cwd, capture_output=True, text=True, check=True
        )

        if on_progress and result.stdout:
            on_progress(result.stdout.strip())

    except subprocess.CalledProcessError as e:
        error_msg = f"Command failed: {' '.join(command)}\n"
        if e.stderr:
            error_msg += f"Error: {e.stderr}"
        raise GitHubError(error_msg)


def push_code(
    config: Config,
    source_dir: Path,
    branch_name: str,
    mapper: FileMapper = None,
    commit_message: Optional[str] = None,
    create_pr: bool = False,
    on_progress: Optional[Callable[[str], None]] = None,
) -> Tuple[str, int, Optional[str]]:
    """
    Push local code changes to a new GitHub branch using git.

    Args:
        config: Configuration object.
        source_dir: Local directory containing files to push.
        branch_name: Name for the new branch.
        mapper: Optional file mapper for reverse mapping.
        commit_message: Optional custom commit message.
        create_pr: Whether to create a pull request.
        on_progress: Optional progress callback.

    Returns:
        Tuple of (branch_name, files_pushed, pr_url).

    Raises:
        GitHubError: If push operation fails.
    """

    def log(message: str) -> None:
        if on_progress:
            on_progress(message)

    # Initialize
    git_ops = GitOperations(config)
    mapper = mapper or FileMapper()

    # Create temp directory for clone
    temp_dir = Path(tempfile.mkdtemp(prefix="eds-push-"))

    try:
        # Clone repository
        log(f"Cloning {config.github_repo} (branch: {config.github_branch})")
        repo_dir = git_ops.clone_repo(
            target_dir=temp_dir / "repo", branch=config.github_branch, on_progress=log
        )

        # Install dependencies (npm ci never modifies package-lock.json)
        log("Installing npm dependencies...")
        _run_npm_command(["npm", "ci"], repo_dir, on_progress=log)
        log("✓ Dependencies installed")

        # Create new branch
        log(f"Creating branch '{branch_name}'...")
        git_ops.create_branch(repo_dir, branch_name)
        log(f"✓ Branch created")

        # Get local files to push
        log(f"Scanning local directory: {source_dir}")
        local_files = _scan_local_files(source_dir)
        log(f"Found {len(local_files)} local files")

        # Create reverse mapping (local -> repo)
        push_plan = _create_push_plan(local_files, source_dir, mapper)
        log(f"Planning to push {len(push_plan)} files")

        if not push_plan:
            raise GitHubError("No files to push. Check that files match mapping rules.")

        # Copy files to repository
        pushed = 0
        for local_path, repo_path in push_plan.items():
            log(f"Copying {local_path.name} -> {repo_path}")

            # Destination in repo
            dest_file = repo_dir / repo_path
            dest_file.parent.mkdir(parents=True, exist_ok=True)

            # Copy file
            shutil.copy2(local_path, dest_file)
            pushed += 1

        # Lint validation
        log("Running npm lint...")
        _run_npm_command(["npm", "run", "lint"], repo_dir, on_progress=log)
        log("✓ Lint passed")

        # Build JSON files
        log("Running npm build:json...")
        _run_npm_command(["npm", "run", "build:json"], repo_dir, on_progress=log)
        log("✓ JSON build complete")

        # Default commit message
        if not commit_message:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            commit_message = f"Update EDS Forms code - {timestamp}"

        # Commit changes
        log("Committing changes...")
        has_changes = git_ops.commit_changes(
            repo_dir=repo_dir, commit_message=commit_message, on_progress=log
        )

        if not has_changes:
            log("⚠ No changes to commit - branch is up to date")
            log("Pushing branch to ensure it exists on GitHub...")
            # Still push the branch even without changes to ensure it exists remotely
            git_ops.push_branch(
                repo_dir=repo_dir, branch_name=branch_name, on_progress=log
            )
            log(f"✓ Branch '{branch_name}' created on GitHub")
            return branch_name, 0, None

        # Push branch
        git_ops.push_branch(repo_dir=repo_dir, branch_name=branch_name, on_progress=log)

        log(f"✓ Pushed {pushed} files to branch '{branch_name}'")

        # Create PR if requested
        pr_url = None
        if create_pr:
            log("Creating pull request...")
            client = GitHubClient(config)

            pr_title = f"EDS Forms Update - {branch_name}"

            # Build the AEM EDS preview URL.
            # config.github_repo is "owner/repo"; the URL pattern is
            # https://<branch>--<repo>--<owner>.aem.page/
            _owner, _repo = config.github_repo.split("/", 1)
            safe_branch = branch_name.replace("/", "--")
            preview_url = f"https://{safe_branch}--{_repo}--{_owner}.aem.page/"

            pr_body = f"""Automated push from local development.

Files updated: {pushed}
Branch: {branch_name}
Base: {config.github_branch}

URL for testing:

- {preview_url}
"""
            pr_url = client.create_pull_request(
                head_branch=branch_name,
                base_branch=config.github_branch,
                title=pr_title,
                body=pr_body,
            )
            log(f"✓ Pull request created: {pr_url}")

        return branch_name, pushed, pr_url

    finally:
        # Clean up temp directory
        log("Cleaning up...")
        git_ops.cleanup(temp_dir)


def _scan_local_files(source_dir: Path) -> List[Path]:
    """Recursively scan local directory for files."""
    files = []
    for item in source_dir.rglob("*"):
        if item.is_file() and not _should_ignore(item):
            files.append(item)
    return files


def _should_ignore(file_path: Path) -> bool:
    """Check if file should be ignored."""
    ignore_patterns = {
        ".DS_Store",
        ".git",
        "__pycache__",
        "node_modules",
        ".env",
        ".env.local",
        "*.pyc",
        "*.log",
    }

    name = file_path.name
    for pattern in ignore_patterns:
        if pattern.startswith("*.") and name.endswith(pattern[1:]):
            return True
        if pattern == name:
            return True
        if pattern in str(file_path):
            return True

    return False


def _create_push_plan(
    local_files: List[Path], source_dir: Path, mapper: FileMapper
) -> dict:
    """
    Create push plan by reverse mapping local files to repo paths.

    Args:
        local_files: List of local file paths.
        source_dir: Base source directory.
        mapper: File mapper with mapping rules.

    Returns:
        Dict mapping local_path -> repo_path.
    """
    push_plan = {}

    for local_file in local_files:
        # Get relative path from source_dir
        relative = local_file.relative_to(source_dir)
        local_path_str = str(relative)

        # Reverse map: local -> repo
        repo_path = _reverse_map(local_path_str, mapper)
        if repo_path:
            push_plan[local_file] = repo_path

    return push_plan


def _reverse_map(local_path: str, mapper: FileMapper) -> Optional[str]:
    """
    Reverse map: convert local path to repository path.

    Examples:
        "forms.js" -> "blocks/form/form.js"
        "components/text-input.js" -> "blocks/form/components/text-input.js"
    """
    # Check exact matches first
    for repo_pattern, local_pattern in mapper.mapping.items():
        if local_pattern == local_path:
            return repo_pattern

    # Check directory mappings
    for repo_pattern, local_pattern in mapper.mapping.items():
        if local_pattern.endswith("/") and local_path.startswith(local_pattern):
            # Remove local prefix, add repo prefix
            relative = local_path[len(local_pattern) :]
            return f"{repo_pattern}{relative}"

    return None
