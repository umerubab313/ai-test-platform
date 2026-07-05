"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings, populated from environment variables."""

    database_url: str
    redis_url: str
    gemini_api_key: str
    anthropic_api_key: str
    secret_key: str
    debug: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance.

    Using lru_cache means the .env file is only read and parsed once,
    the first time this function is called. Every subsequent call
    across the whole app reuses the same object instead of re-reading
    the file from disk.
    """
    return Settings()