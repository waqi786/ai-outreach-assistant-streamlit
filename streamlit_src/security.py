from __future__ import annotations

import base64
import hashlib
import os
import unicodedata

import bcrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def normalize_master_key(raw_key: str) -> bytes:
    try:
        decoded = base64.b64decode(raw_key)
        if len(decoded) == 32:
            return decoded
    except Exception:
        pass

    return hashlib.sha256(raw_key.encode("utf-8")).digest()


def sanitize_api_key(raw_key: str) -> str:
    normalized = unicodedata.normalize("NFKC", raw_key)
    compact = "".join(normalized.split())

    try:
        compact.encode("ascii")
    except UnicodeEncodeError as error:
        raise ValueError(
            "API key contains unsupported non-ASCII characters. Please paste the exact key again."
        ) from error

    return compact


def encrypt_api_key(plain_text: str, master_key: str) -> str:
    key = normalize_master_key(master_key)
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    encrypted = aesgcm.encrypt(nonce, sanitize_api_key(plain_text).encode("utf-8"), None)
    return base64.b64encode(nonce + encrypted).decode("utf-8")


def decrypt_api_key(cipher_text: str, master_key: str) -> str:
    raw = base64.b64decode(cipher_text)
    nonce = raw[:12]
    encrypted = raw[12:]
    aesgcm = AESGCM(normalize_master_key(master_key))
    return aesgcm.decrypt(nonce, encrypted, None).decode("utf-8")
