from __future__ import annotations
import base64
import os
from typing import NamedTuple

import streamlit as st
from dotenv import load_dotenv

load_dotenv()


def read_setting(name: str, default: str | None = None) -> str:
    try:
        if name in st.secrets:
            return str(st.secrets[name])
    except Exception:
        pass

    value = os.getenv(name)
    if value is not None:
        return value

    if default is None:
        raise RuntimeError(f"Missing required setting: {name}")

    return default


class Settings(NamedTuple):
    database_path: str
    jwt_secret: str
    encryption_master_key: str
    perplexity_model: str
    anthropic_model: str


def get_settings() -> Settings:
    master_key = read_setting(
        "ENCRYPTION_MASTER_KEY",
        base64.b64encode(b"0123456789abcdef0123456789abcdef").decode("utf-8"),
    )

    return Settings(
        database_path=read_setting("DATABASE_PATH", "ai_outreach.db"),
        jwt_secret=read_setting(
            "JWT_SECRET",
            "development-jwt-secret-change-me-before-deploy",
        ),
        encryption_master_key=master_key,
        perplexity_model=read_setting("PERPLEXITY_MODEL", "sonar"),
        anthropic_model=read_setting("ANTHROPIC_MODEL", "claude-3-sonnet-20240229"),
    )
