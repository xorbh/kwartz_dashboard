import os
from pathlib import Path
from cryptography.fernet import Fernet
from app.config import get_settings

_fernet: Fernet | None = None


def get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet

    settings = get_settings()
    key = settings.encryption_key

    if not key:
        # Check for key file
        key_file = Path(".encryption_key")
        if key_file.exists():
            key = key_file.read_text().strip()
        else:
            # Generate new key and save
            key = Fernet.generate_key().decode()
            key_file.write_text(key)

    _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_api_key(api_key: str) -> str:
    if not api_key:
        return ""
    fernet = get_fernet()
    return fernet.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    if not encrypted_key:
        return ""
    fernet = get_fernet()
    return fernet.decrypt(encrypted_key.encode()).decode()


def mask_api_key(api_key: str) -> str:
    """Return masked version for display (e.g., 'sk-****1234')"""
    if not api_key or len(api_key) < 8:
        return "****"
    return f"{api_key[:3]}****{api_key[-4:]}"
