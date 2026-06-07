import os
from dataclasses import dataclass


def _to_int(value: str, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _split_csv(value: str) -> list[str]:
    if not value:
        return ["*"]
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "AcademIQ Backend")
    app_env: str = os.getenv("APP_ENV", "development")
    api_host: str = os.getenv("API_HOST", "127.0.0.1")
    api_port: int = _to_int(os.getenv("API_PORT", "8000"), 8000)

    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = _to_int(os.getenv("JWT_EXPIRE_MINUTES", "60"), 60)

    cors_allow_origins: list[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        origins = _split_csv(os.getenv("CORS_ALLOW_ORIGINS", "*"))
        object.__setattr__(self, "cors_allow_origins", origins)


settings = Settings()
