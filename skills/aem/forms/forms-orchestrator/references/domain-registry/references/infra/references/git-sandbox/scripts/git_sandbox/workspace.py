"""Workspace operations for git-sandbox."""

import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .config import Config
from .exceptions import WorkspaceError
from .validator import validate_branch, validate_paths


@dataclass
class WorkspaceStatus:
    """Status of the workspace."""

    changed_files: List[str]
    allowed_files: List[str]
    denied_files: List[str]
    can_commit: bool
    current_branch: str
    base_commit: str
    ahead_by: int


@dataclass
class CommitResult:
    """Result of a commit operation."""

    success: bool
    message: str
    commit_hash: Optional[str] = None
    files_committed: int = 0


@dataclass
class PushResult:
    """Result of a push operation."""

    success: bool
    message: str
    branch: Optional[str] = None


class Workspace:
    """Manages a sandboxed git workspace."""

    def __init__(self, config: Config):
        """
        Initialize workspace manager.

        Args:
            config: Configuration object
        """
        self.config = config
        self.root = config.workspace.resolve()

    def _git(self, *args, check: bool = True) -> subprocess.CompletedProcess:
        """
        Run a git command in the workspace.

        Args:
            *args: Git command arguments
            check: Raise exception on non-zero exit

        Returns:
            CompletedProcess result
        """
        result = subprocess.run(
            ["git", *args],
            cwd=self.root,
            capture_output=True,
            text=True,
        )

        if check and result.returncode != 0:
            raise WorkspaceError(f"Git command failed: git {' '.join(args)}\n{result.stderr}")

        return result

    def exists(self) -> bool:
        """Check if workspace exists and is a git repo."""
        return self.root.exists() and (self.root / ".git").exists()

    def init(self) -> str:
        """
        Initialize workspace by cloning only the allowed paths (sparse checkout).

        Returns:
            Base commit hash

        Raises:
            WorkspaceError: If workspace already exists or clone fails
        """
        if self.root.exists():
            raise WorkspaceError(f"Workspace already exists: {self.root}")

        # Create workspace directory
        self.root.mkdir(parents=True, exist_ok=True)

        try:
            # Initialize empty git repo
            subprocess.run(
                ["git", "init"],
                cwd=self.root,
                capture_output=True,
                text=True,
                check=True,
            )

            # Add remote
            subprocess.run(
                ["git", "remote", "add", "origin", self.config.repo],
                cwd=self.root,
                capture_output=True,
                text=True,
                check=True,
            )

            # Enable sparse checkout
            subprocess.run(
                ["git", "config", "core.sparseCheckout", "true"],
                cwd=self.root,
                capture_output=True,
                text=True,
                check=True,
            )

            # Write allowed paths to sparse-checkout file
            sparse_checkout_dir = self.root / ".git" / "info"
            sparse_checkout_dir.mkdir(parents=True, exist_ok=True)
            sparse_checkout_file = sparse_checkout_dir / "sparse-checkout"
            sparse_checkout_file.write_text("\n".join(self.config.allowed_paths) + "\n")

            # Fetch the branch
            subprocess.run(
                ["git", "fetch", "--depth=1", "origin", self.config.branch],
                cwd=self.root,
                capture_output=True,
                text=True,
                check=True,
            )

            # Checkout the branch
            subprocess.run(
                ["git", "checkout", self.config.branch],
                cwd=self.root,
                capture_output=True,
                text=True,
                check=True,
            )

        except subprocess.CalledProcessError as e:
            # Cleanup on failure
            import shutil
            if self.root.exists():
                shutil.rmtree(self.root)
            raise WorkspaceError(f"Failed to initialize workspace:\n{e.stderr}")

        return self._get_current_commit()

    def _get_current_commit(self) -> str:
        """Get current commit hash."""
        result = self._git("rev-parse", "HEAD")
        return result.stdout.strip()

    def _get_current_branch(self) -> str:
        """Get current branch name."""
        result = self._git("rev-parse", "--abbrev-ref", "HEAD")
        return result.stdout.strip()

    def _get_base_ref(self) -> str:
        """Get the origin branch ref as the base."""
        return f"origin/{self.config.branch}"

    def _get_changed_files(self) -> List[str]:
        """Get list of all changed files (staged and unstaged)."""
        # Get unstaged changes
        unstaged = self._git("diff", "--name-only", check=False)
        # Get staged changes
        staged = self._git("diff", "--name-only", "--cached", check=False)
        # Get untracked files
        untracked = self._git("ls-files", "--others", "--exclude-standard", check=False)

        files = set()
        for output in [unstaged.stdout, staged.stdout, untracked.stdout]:
            for line in output.strip().split("\n"):
                if line:
                    files.add(line)

        return sorted(files)

    def _get_commits_ahead(self) -> int:
        """Get number of commits ahead of origin branch."""
        base = self._get_base_ref()
        result = self._git("rev-list", "--count", f"{base}..HEAD", check=False)
        try:
            return int(result.stdout.strip())
        except ValueError:
            return 0

    def status(self) -> WorkspaceStatus:
        """
        Get workspace status with validation information.

        Returns:
            WorkspaceStatus with change details
        """
        if not self.exists():
            raise WorkspaceError(f"Workspace not found: {self.root}")

        changed = self._get_changed_files()
        allowed, denied = validate_paths(changed, self.config.allowed_paths)

        return WorkspaceStatus(
            changed_files=changed,
            allowed_files=allowed,
            denied_files=denied,
            can_commit=len(denied) == 0 and len(changed) > 0,
            current_branch=self._get_current_branch(),
            base_commit=self._get_base_ref(),
            ahead_by=self._get_commits_ahead(),
        )

    def commit(self, message: str) -> CommitResult:
        """
        Validate paths and commit changes.

        Args:
            message: Commit message

        Returns:
            CommitResult with operation details
        """
        if not self.exists():
            raise WorkspaceError(f"Workspace not found: {self.root}")

        changed = self._get_changed_files()

        if not changed:
            return CommitResult(
                success=False,
                message="Nothing to commit",
            )

        # Validate paths
        allowed, denied = validate_paths(changed, self.config.allowed_paths)

        if denied:
            return CommitResult(
                success=False,
                message=f"Cannot commit: {len(denied)} file(s) outside allowed paths",
            )

        # Stage all changes
        self._git("add", "-A")

        # Commit
        self._git("commit", "-m", message)
        commit_hash = self._get_current_commit()

        return CommitResult(
            success=True,
            message="Changes committed successfully",
            commit_hash=commit_hash,
            files_committed=len(allowed),
        )

    def rebase(self) -> str:
        """
        Fetch latest changes from origin and rebase local commits on top.

        Returns:
            Message describing the rebase result

        Raises:
            WorkspaceError: If workspace not found or rebase fails with conflicts
        """
        if not self.exists():
            raise WorkspaceError(f"Workspace not found: {self.root}")

        current = self._get_current_branch()

        # Fetch latest from origin
        self._git("fetch", "origin", self.config.branch)

        # Check if there are local commits to rebase
        ahead = self._get_commits_ahead()
        if ahead == 0:
            return "Already up to date — nothing to rebase"

        # Rebase onto the updated origin branch
        base = self._get_base_ref()
        result = self._git("rebase", base, check=False)

        if result.returncode != 0:
            # Abort the failed rebase to restore clean state
            self._git("rebase", "--abort", check=False)
            raise WorkspaceError(
                f"Rebase failed due to conflicts. Aborted to preserve clean state.\n"
                f"{result.stderr}"
            )

        return f"Rebased {ahead} commit(s) onto {base}"

    def push(self, branch: str, rebase: bool = True) -> PushResult:
        """
        Validate branch name, optionally rebase, and push changes.

        Args:
            branch: Branch name to push to
            rebase: If True, fetch and rebase before pushing (default: True)

        Returns:
            PushResult with operation details
        """
        if not self.exists():
            raise WorkspaceError(f"Workspace not found: {self.root}")

        # Validate branch name
        if not validate_branch(branch, self.config.allowed_branches):
            patterns = ", ".join(self.config.allowed_branches)
            return PushResult(
                success=False,
                message=f"Branch '{branch}' not allowed. Must match: {patterns}",
            )

        # Create/checkout branch
        current = self._get_current_branch()
        if current != branch:
            self._git("checkout", "-B", branch)

        # Rebase onto latest origin before pushing
        rebase_msg = None
        if rebase:
            rebase_msg = self.rebase()

        # Push
        self._git("push", "-u", "origin", branch)

        msg = f"Pushed to {branch}"
        if rebase_msg:
            msg = f"{rebase_msg}. {msg}"

        return PushResult(
            success=True,
            message=msg,
            branch=branch,
        )

    def reset(self, hard: bool = False) -> str:
        """
        Reset workspace by removing and re-initializing from current config.

        Args:
            hard: If True, removes workspace and re-initializes. If False, just resets to origin branch.

        Returns:
            Base commit hash after reset
        """
        if not self.exists():
            raise WorkspaceError(f"Workspace not found: {self.root}")

        if hard:
            # Remove workspace and re-initialize
            import shutil
            shutil.rmtree(self.root)
            return self.init()
        else:
            # Soft reset: just reset to origin branch
            base = self._get_base_ref()
            self._git("reset", base)
            return base
