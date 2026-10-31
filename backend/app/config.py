from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "College Print Station"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    SECRET_KEY: str = "c0ll3ge_pr1nt_st4t10n_s3cur1ty_k3y_s3cr3t_2026_x99"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/print_station"
    SYNC_DATABASE_URL: str = "postgresql://postgres:postgrespassword@localhost:5432/print_station"

    # Admin Login Source (argon2 hashed on startup)
    ADMIN_EMAIL: str = "admin@printstation.local"
    ADMIN_PASSWORD: str = "AdminSecurePassword2026!"

    # Manual UPI Payment Details
    UPI_ID: str = "printstation@okaxis"
    PAYEE_NAME: str = "College Print Station"
    COLLECTION_INSTRUCTIONS: str = (
        "Collect your printed report from the Project Lab (Room 302, Main Building) "
        "on weekdays between 3:00 PM and 5:00 PM. Present your Order ID or digital receipt at the counter."
    )

    # Business Logic
    MAX_FILE_SIZE_MB: int = 50
    UNIQUE_PAISE_AMOUNT: bool = False
    FILE_RETENTION_DAYS: int = 90
    STORAGE_DIR: str = "storage"

    # Rate limiting
    DEFAULT_RATE_LIMIT: str = "60/minute"
    SUBMISSION_RATE_LIMIT: str = "10/minute"
    ADMIN_LOGIN_RATE_LIMIT: str = "5/minute"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def uploads_path(self) -> Path:
        p = BASE_DIR / self.STORAGE_DIR / "uploads"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def screenshots_path(self) -> Path:
        p = BASE_DIR / self.STORAGE_DIR / "screenshots"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def receipts_path(self) -> Path:
        p = BASE_DIR / self.STORAGE_DIR / "receipts"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def batches_path(self) -> Path:
        p = BASE_DIR / self.STORAGE_DIR / "batches"
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
