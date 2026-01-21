from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./widgets.db"
    encryption_key: str = ""  # Will be auto-generated if not provided

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
