"""Custom exceptions for AEM Form Sync."""


class FormSyncError(Exception):
    """Base exception for all form-sync errors."""

    pass


class ConfigurationError(FormSyncError):
    """Raised when required configuration is missing or invalid."""

    pass


class AuthenticationError(FormSyncError):
    """Raised when authentication with AEM fails."""

    pass


class FormNotFoundError(FormSyncError):
    """Raised when a form cannot be found at the specified path."""

    pass


class FormCreationError(FormSyncError):
    """Raised when form creation on AEM fails."""

    pass


class ComponentAddError(FormSyncError):
    """Raised when adding a component to a form fails."""

    def __init__(self, message: str, component_name: str = None, form_path: str = None):
        super().__init__(message)
        self.component_name = component_name
        self.form_path = form_path


class TokenError(FormSyncError):
    """Raised when cloud token retrieval fails."""

    pass


class VersionFileError(FormSyncError):
    """Raised when there's an issue with the version file."""

    pass


class PathNotAllowedError(FormSyncError):
    """Raised when a path is not in the push allowlist."""

    pass


class NodeExistsError(FormSyncError):
    """Raised when a node already exists in AEM (HTTP 409)."""

    pass

