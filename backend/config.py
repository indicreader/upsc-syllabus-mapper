"""
UPSC Clipper Backend — Configuration
Reads all settings from .env via pydantic-settings.
"""

from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Auth
    app_local_token: str = "change-me-to-a-strong-secret"

    # Notion
    notion_token: str = ""

    # Per-paper Notion database or page IDs
    notion_db_gs1: str = ""
    notion_db_gs2: str = ""
    notion_db_gs3: str = ""
    notion_db_gs4: str = ""
    notion_db_ethics: str = ""
    notion_db_optional: str = ""

    notion_page_gs1: str = ""
    notion_page_gs2: str = ""
    notion_page_gs3: str = ""
    notion_page_gs4: str = ""
    notion_page_ethics: str = ""
    notion_page_optional: str = ""

    # Optional subject label
    optional_subject_name: str = ""

    # Database
    db_path: str = "./data/clipper.db"
    use_sqlcipher: bool = False
    sqlcipher_key: str = ""

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    def get_notion_db_for_paper(self, paper: str) -> str | None:
        """Resolve a paper identifier to its Notion parent ID (Database or Page ID)."""
        mapping = {
            "GS1": self.notion_page_gs1 or self.notion_db_gs1,
            "GS2": self.notion_page_gs2 or self.notion_db_gs2,
            "GS3": self.notion_page_gs3 or self.notion_db_gs3,
            "GS4": self.notion_page_gs4 or self.notion_db_gs4,
            "Ethics": self.notion_page_ethics or self.notion_db_ethics,
            "Optional": self.notion_page_optional or self.notion_db_optional,
        }
        parent_id = mapping.get(paper, "")
        return parent_id if parent_id else None


@lru_cache
def get_settings() -> Settings:
    return Settings()
