"""Custom exceptions for API Manager."""


class ApiManagerError(Exception):
    """Base exception for API Manager errors."""
    pass


class ConfigurationError(ApiManagerError):
    """Configuration error."""
    pass


class AemConnectionError(ApiManagerError):
    """AEM connection error."""
    pass


class ParseError(ApiManagerError):
    """Parsing error."""
    pass
