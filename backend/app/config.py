from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    gemini_api_key: str
    anthropic_api_key: str = ""
    secret_key: str = "dev-secret-change-in-prod"
    debug: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
