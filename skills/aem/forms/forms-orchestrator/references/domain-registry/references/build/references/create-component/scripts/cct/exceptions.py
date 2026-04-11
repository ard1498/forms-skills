"""Custom exceptions for CCT."""


class CCTError(Exception):
    """Base exception for all CCT errors."""
    pass


class ConfigurationError(CCTError):
    """Raised when configuration is invalid or missing."""
    pass


class DirectoryError(CCTError):
    """Raised when required directories are missing or invalid."""
    pass


class ComponentError(CCTError):
    """Raised when component operations fail."""
    pass


class ValidationError(CCTError):
    """Raised when validation fails."""
    pass

