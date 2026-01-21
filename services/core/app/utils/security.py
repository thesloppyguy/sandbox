"""Security utilities."""

import hashlib
import hmac
import secrets

from app.config import settings


def generate_password_hash(password: str) -> str:
    """Generate a password hash.

    Args:
        password: Plain text password

    Returns:
        str: Hashed password
    """
    # Using HMAC with secret key for password hashing
    # In production, use bcrypt or argon2
    return hmac.new(
        settings.SECRET_KEY.encode(),
        password.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password

    Returns:
        bool: True if password matches
    """
    return hmac.compare_digest(
        generate_password_hash(plain_password),
        hashed_password,
    )


def generate_token(length: int = 32) -> str:
    """Generate a random token.

    Args:
        length: Token length in bytes

    Returns:
        str: Random token
    """
    return secrets.token_urlsafe(length)
