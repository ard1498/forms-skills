"""Configuration management for API Manager."""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from dotenv import find_dotenv, load_dotenv

from .exceptions import ConfigurationError


@dataclass
class Config:
    """API Manager configuration."""

    aem_host: str
    auth_header: str
    refs_dir: Path
    api_clients_dir: Path

    @classmethod
    def from_env(cls, env_file: Optional[Path] = None) -> "Config":
        """Load configuration from environment variables.

        Args:
            env_file: Optional path to .env file

        Returns:
            Config instance

        Raises:
            ConfigurationError: If required variables are missing
        """
        # Load .env file if it exists
        if env_file:
            load_dotenv(env_file)
        else:
            # Look for .env in the user's current working directory
            cwd_env_path = Path.cwd() / ".env"
            if cwd_env_path.exists():
                load_dotenv(cwd_env_path)
            else:
                # Fallback: let python-dotenv search upward from cwd
                load_dotenv(dotenv_path=find_dotenv(usecwd=True))

        # Get AEM host
        aem_host = os.getenv("AEM_HOST")
        if not aem_host:
            raise ConfigurationError("AEM_HOST not configured")

        # Get auth header (support both AEM_TOKEN and AEM_AUTH_HEADER)
        token = os.getenv("AEM_TOKEN")
        auth_header = os.getenv("AEM_AUTH_HEADER")

        if token:
            auth_header = f"Bearer {token}"
        elif not auth_header:
            raise ConfigurationError("AEM_TOKEN or AEM_AUTH_HEADER not configured")

        # Get paths relative to user's current working directory
        project_root = Path.cwd()
        refs_dir = project_root / "refs" / "apis"
        api_clients_dir = refs_dir / "generated" / "api-clients"

        return cls(
            aem_host=aem_host,
            auth_header=auth_header,
            refs_dir=refs_dir,
            api_clients_dir=api_clients_dir,
        )


def get_project_paths() -> tuple[Path, Path, Path]:
    """Get project paths without requiring AEM configuration.

    Returns:
        Tuple of (spec_dir, api_clients_dir, generated_dir)
    """
    project_root = Path.cwd()
    generated_dir = project_root / "refs" / "apis" / "generated"
    spec_dir = generated_dir / "spec"
    api_clients_dir = generated_dir / "api-clients"
    return spec_dir, api_clients_dir, generated_dir
