"""
UPSC Clipper Backend — Database Layer
SQLite (or SQLCipher) connection manager with parameterized queries.
All SQL uses positional placeholders (?) — zero string interpolation.
"""

import sqlite3
import uuid
import logging
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, timezone

from config import get_settings

logger = logging.getLogger(__name__)

_DB_INIT_SQL = """
CREATE TABLE IF NOT EXISTS clippings (
    id TEXT PRIMARY KEY,
    source_url TEXT NOT NULL,
    page_title TEXT DEFAULT '',
    clipped_text TEXT NOT NULL,
    primary_paper TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    destination TEXT DEFAULT 'local',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clipping_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clipping_id TEXT NOT NULL REFERENCES clippings(id) ON DELETE CASCADE,
    paper TEXT NOT NULL,
    topic TEXT NOT NULL,
    keyword TEXT NOT NULL,
    is_custom INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_clipping_tags_clipping
    ON clipping_tags(clipping_id);

CREATE INDEX IF NOT EXISTS idx_clippings_paper
    ON clippings(primary_paper);

CREATE INDEX IF NOT EXISTS idx_clippings_created
    ON clippings(created_at);
"""


def _get_connection() -> sqlite3.Connection:
    """
    Create a new SQLite/SQLCipher connection.
    If USE_SQLCIPHER is true, applies the PRAGMA key immediately.
    """
    settings = get_settings()
    db_path = Path(settings.db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    if settings.use_sqlcipher:
        try:
            from pysqlcipher3 import dbapi2 as sqlcipher  # type: ignore
            conn = sqlcipher.connect(str(db_path))
            cursor = conn.cursor()
            cursor.execute("PRAGMA key = ?;", (settings.sqlcipher_key,))
            cursor.close()
            logger.info("Connected with SQLCipher encryption")
        except ImportError:
            logger.warning(
                "pysqlcipher3 not installed — falling back to plain SQLite. "
                "Install pysqlcipher3 and native sqlcipher libs for encryption."
            )
            conn = sqlite3.connect(str(db_path))
    else:
        conn = sqlite3.connect(str(db_path))

    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db():
    """Context manager yielding a database connection with auto-commit/rollback."""
    conn = _get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create tables and indexes if they don't exist."""
    with get_db() as conn:
        conn.executescript(_DB_INIT_SQL)
    logger.info("Database initialized at %s", get_settings().db_path)


def insert_clipping(
    *,
    source_url: str,
    page_title: str,
    clipped_text: str,
    primary_paper: str,
    notes: str,
    tags: list[dict],
    custom_tags: list[str],
) -> str:
    """
    Insert a clipping and its tags in a single transaction.
    Returns the generated clip_id.
    All queries use parameterized placeholders — injection-proof.
    """
    clip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        # Insert main clipping row
        conn.execute(
            """
            INSERT INTO clippings (id, source_url, page_title, clipped_text, primary_paper, notes, destination, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (clip_id, source_url, page_title, clipped_text, primary_paper, notes, "local", now),
        )

        # Insert auto-detected tags
        for tag in tags:
            conn.execute(
                """
                INSERT INTO clipping_tags (clipping_id, paper, topic, keyword, is_custom)
                VALUES (?, ?, ?, ?, 0)
                """,
                (clip_id, tag.get("paper", ""), tag.get("topic", ""), tag.get("keyword", "")),
            )

        # Insert custom tags
        for custom in custom_tags:
            conn.execute(
                """
                INSERT INTO clipping_tags (clipping_id, paper, topic, keyword, is_custom)
                VALUES (?, ?, ?, ?, 1)
                """,
                (clip_id, "Custom", "Custom", custom),
            )

    logger.info("Inserted clipping %s with %d tags", clip_id, len(tags) + len(custom_tags))
    return clip_id
