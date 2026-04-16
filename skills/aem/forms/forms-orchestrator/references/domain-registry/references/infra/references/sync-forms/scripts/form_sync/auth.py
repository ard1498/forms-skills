"""Authentication management for AEM Form Sync."""

from dataclasses import dataclass
from typing import Optional

from .client import AEMClient
from .config import Config
from .exceptions import TokenError


@dataclass
class CloudToken:
    """Container for cloud token data."""

    access_token: str
    client_id: str
    org_id: str


class AuthManager:
    """Manages authentication for AEM APIs."""

    def __init__(self, config: Config, client: AEMClient):
        """
        Initialize the auth manager.

        Args:
            config: Configuration object with credentials.
            client: AEM HTTP client.
        """
        self.config = config
        self.client = client
        self._cloud_token: Optional[CloudToken] = None

    def get_cloud_token(self) -> CloudToken:
        """
        Get cloud token for Universal Editor API.

        Resolution order:
        1. If UE_BEARER_TOKEN is set, use it with client_id from env profile.
        2. Otherwise fetch from AEM's genai/token endpoint (stage/prod only).

        Returns:
            CloudToken with access_token, client_id, and org_id.

        Raises:
            TokenError: If token retrieval fails.
        """
        if self._cloud_token is not None:
            return self._cloud_token

        # Static bearer token from config (UE_BEARER_TOKEN env var)
        if self.config.cloud_token_source == "static" or self.config.ue_bearer_token:
            if not self.config.ue_bearer_token:
                raise TokenError(
                    "Static cloud token source requires UE_BEARER_TOKEN.\n"
                    "Set UE_BEARER_TOKEN in your .env file."
                )
            self._cloud_token = CloudToken(
                access_token=self.config.ue_bearer_token,
                client_id=self.config.client_id,
                org_id="",
            )
            return self._cloud_token

        # Fetch from AEM genai/token endpoint (stage/prod)
        try:
            headers = {"X-Adobe-Accept-Unsupported-API": "1"}
            response = self.client.get("/adobe/forms/genai/token", headers=headers)
            data = response.json()

            # Use client_id from response, but allow config override
            fetched_client_id = data.get("clientId", "")
            effective_client_id = self.config.client_id or fetched_client_id

            self._cloud_token = CloudToken(
                access_token=data.get("accessToken", ""),
                client_id=effective_client_id,
                org_id=data.get("orgId", ""),
            )

            if not self._cloud_token.access_token:
                raise TokenError("Received empty access token from AEM.")

            return self._cloud_token

        except Exception as e:
            if isinstance(e, TokenError):
                raise
            raise TokenError(f"Failed to retrieve cloud token: {e}")

    def clear_token_cache(self) -> None:
        """Clear the cached cloud token."""
        self._cloud_token = None

