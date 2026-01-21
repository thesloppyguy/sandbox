"""Custom exceptions."""


class CoreException(Exception):
    """Base exception for core service."""

    pass


class NotFoundError(CoreException):
    """Resource not found exception."""

    pass


class ValidationError(CoreException):
    """Validation error exception."""

    pass
