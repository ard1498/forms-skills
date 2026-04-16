"""HTTP client wrapper for AEM APIs."""

from typing import Any

import requests

from .config import Config
from .exceptions import (
    AuthenticationError,
    FormNotFoundError,
    FormSyncError,
    NodeExistsError,
    PathNotAllowedError,
)


class AEMClient:
    """HTTP client for making requests to AEM."""

    def __init__(self, config: Config):
        """
        Initialize the AEM client.

        Args:
            config: Configuration object with AEM credentials.
        """
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": config.basic_auth_header,
                "X-Adobe-Accept-Unsupported-API": "1",
            }
        )

    def get(self, path: str, **kwargs) -> requests.Response:
        """
        Make a GET request to AEM.

        Args:
            path: URL path (will be appended to AEM host).
            **kwargs: Additional arguments passed to requests.get().

        Returns:
            Response object.

        Raises:
            AuthenticationError: If authentication fails (401/403).
            FormNotFoundError: If resource not found (404).
            FormSyncError: For other HTTP errors.
        """
        url = f"{self.config.aem_host}{path}"
        response = self.session.get(url, **kwargs)
        self._handle_response_errors(response, path)
        return response

    def post(self, path: str, json: dict = None, **kwargs) -> requests.Response:
        """
        Make a POST request to AEM.

        Args:
            path: URL path (will be appended to AEM host).
            json: JSON payload to send.
            **kwargs: Additional arguments passed to requests.post().

        Returns:
            Response object.

        Raises:
            AuthenticationError: If authentication fails (401/403).
            FormSyncError: For other HTTP errors.
        """
        url = f"{self.config.aem_host}{path}"
        response = self.session.post(url, json=json, **kwargs)
        self._handle_response_errors(response, path)
        return response

    def check_path_allowed(self, form_path: str) -> None:
        """
        Check if a form path is in the push allowlist.

        Args:
            form_path: The AEM form path to check.

        Raises:
            PathNotAllowedError: If path is not allowed.
        """
        if not self.config.push_allowlist:
            raise PathNotAllowedError(
                f"Push not allowed: AEM_WRITE_PATHS is empty.\n"
                f"Please configure allowed paths in your .env file."
            )
        if not self.config.is_path_allowed(form_path):
            raise PathNotAllowedError(
                f"Path '{form_path}' is not in the push allowlist.\n"
                f"Allowed paths: {', '.join(self.config.push_allowlist)}"
            )

    def post_external(
        self, url: str, json: dict = None, headers: dict = None, **kwargs
    ) -> requests.Response:
        """
        Make a POST request to an external URL (e.g., Universal Editor).

        Args:
            url: Full URL to post to.
            json: JSON payload to send.
            headers: Custom headers (replaces session headers).
            **kwargs: Additional arguments passed to requests.post().

        Returns:
            Response object.

        Raises:
            FormSyncError: For HTTP errors.
        """
        response = requests.post(url, json=json, headers=headers, **kwargs)
        self._handle_response_errors(response, url)
        return response

    def _handle_response_errors(self, response: requests.Response, path: str) -> None:
        """
        Handle HTTP response errors.

        Args:
            response: The HTTP response to check.
            path: The path/URL that was requested (for error messages).

        Raises:
            AuthenticationError: If authentication fails (401/403).
            FormNotFoundError: If resource not found (404).
            FormSyncError: For other HTTP errors.
        """
        if response.status_code == 409:
            raise NodeExistsError(
                f"Node already exists at {path}"
            )
        elif response.status_code == 401:
            raise AuthenticationError(
                "Authentication failed. Your token may be expired or invalid.\n"
                "Run 'form-sync login' to get a fresh token."
            )
        elif response.status_code == 403:
            raise AuthenticationError(
                "Access forbidden. Your token may be expired or you lack permissions.\n"
                "Run 'form-sync login' to get a fresh token."
            )
        elif response.status_code == 404:
            raise FormNotFoundError(f"Resource not found: {path}")
        elif not response.ok:
            raise FormSyncError(
                f"HTTP {response.status_code} error for {path}: {response.text[:200]}"
            )
