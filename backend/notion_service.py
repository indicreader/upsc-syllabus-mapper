"""
UPSC Clipper Backend — Notion Service
Async client wrapper for creating clipping pages in per-paper Notion databases.
"""

import logging
from typing import Any

from notion_client import AsyncClient
from notion_client.errors import APIResponseError

from config import Settings, get_settings

logger = logging.getLogger(__name__)


def _get_client(settings: Settings) -> AsyncClient:
    """Create an async Notion client from the configured token."""
    if not settings.notion_token:
        raise RuntimeError("NOTION_TOKEN is not configured in .env")
    return AsyncClient(auth=settings.notion_token)


def _build_page_properties(
    *,
    page_title: str,
    source_url: str,
    primary_paper: str,
    tags: list[dict],
    custom_tags: list[str],
    notes: str,
) -> dict[str, Any]:
    """
    Build the Notion page properties dict.
    Assumes the target database has these columns:
      - Title (title)
      - URL (url)
      - Paper (select)
      - Tags (multi_select)
      - Notes (rich_text)
    """
    # Merge all tag labels into multi-select options
    tag_labels = []
    for t in tags:
        label = f"{t.get('paper', '')}: {t.get('keyword', '')}"
        tag_labels.append({"name": label[:100]})  # Notion limit
    for ct in custom_tags:
        tag_labels.append({"name": ct[:100]})

    return {
        "Title": {
            "title": [{"text": {"content": page_title[:2000] or "Untitled Clipping"}}]
        },
        "URL": {
            "url": source_url or None
        },
        "Paper": {
            "select": {"name": primary_paper or "Unclassified"}
        },
        "Tags": {
            "multi_select": tag_labels[:100]  # Notion limit on multi-select
        },
        "Notes": {
            "rich_text": [{"text": {"content": notes[:2000]}}] if notes else []
        },
    }


def _build_body_blocks(clipped_text: str) -> list[dict]:
    """
    Convert clipped text into Notion block children.
    Splits into 2000-char chunks (Notion block text limit).
    """
    blocks = []
    text = clipped_text or ""

    # Split into chunks of 2000 chars
    for i in range(0, len(text), 2000):
        chunk = text[i:i + 2000]
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": chunk}}]
            }
        })

    return blocks or [{
        "object": "block",
        "type": "paragraph",
        "paragraph": {
            "rich_text": [{"type": "text", "text": {"content": "(No content)"}}]
        }
    }]


def _build_metadata_header_blocks(
    *,
    source_url: str,
    primary_paper: str,
    tags: list[dict],
    custom_tags: list[str],
    notes: str,
) -> list[dict]:
    """
    Format metadata directly as block content for standard Notion pages.
    Creates a Callout block with tags and a callout with notes, plus source link.
    """
    blocks = []

    # 1. Source Link Bookmark/Paragraph
    if source_url:
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": "🔗 Source: "}},
                    {
                        "type": "text",
                        "text": {
                            "content": source_url,
                            "link": {"url": source_url}
                        }
                    }
                ]
            }
        })

    # 2. Matched Tags list
    tag_labels = []
    for t in tags:
        tag_labels.append(f"{t.get('paper', '')}: {t.get('keyword', '')}")
    for ct in custom_tags:
        tag_labels.append(ct)

    tags_text = ", ".join(tag_labels) if tag_labels else "None"
    blocks.append({
        "object": "block",
        "type": "callout",
        "callout": {
            "rich_text": [
                {"type": "text", "text": {"content": f"🏷️ Syllabus Tags: {tags_text}"}}
            ],
            "icon": {"type": "emoji", "emoji": "🏷️"},
            "color": "blue_background"
        }
    })

    # 3. User Notes
    if notes:
        blocks.append({
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [
                    {"type": "text", "text": {"content": f"📝 Notes: {notes}"}}
                ],
                "icon": {"type": "emoji", "emoji": "📝"},
                "color": "yellow_background"
            }
        })

    # 4. Divider
    blocks.append({
        "object": "block",
        "type": "divider",
        "divider": {}
    })

    return blocks


async def create_clipping_page(
    *,
    source_url: str,
    page_title: str,
    clipped_text: str,
    primary_paper: str,
    tags: list[dict],
    custom_tags: list[str],
    notes: str,
) -> dict:
    """
    Create a new page in Notion for the given paper.
    First tries to create it inside a database parent, and if that fails,
    falls back to creating a sub-page inside a page parent.

    Returns the created page dict from Notion API.
    Raises RuntimeError if the paper has no configured parent ID.
    """
    settings = get_settings()
    client = _get_client(settings)

    # Resolve parent ID for this paper
    parent_id = settings.get_notion_db_for_paper(primary_paper)
    if not parent_id:
        # Fallback: try GS1 as default
        parent_id = settings.get_notion_db_for_paper("GS1")
    if not parent_id:
        raise RuntimeError(
            f"No Notion Database/Page ID configured for paper '{primary_paper}'. "
            f"Set NOTION_PAGE_{primary_paper.upper()} or NOTION_DB_{primary_paper.upper()} in your .env file."
        )

    properties = _build_page_properties(
        page_title=page_title,
        source_url=source_url,
        primary_paper=primary_paper,
        tags=tags,
        custom_tags=custom_tags,
        notes=notes,
    )

    body_blocks = _build_body_blocks(clipped_text)

    try:
        # 1. Attempt database row creation
        page = await client.pages.create(
            parent={"database_id": parent_id},
            properties=properties,
            children=body_blocks,
        )
        logger.info(
            "Created Notion page %s in database %s for paper %s",
            page.get("id", "?"),
            parent_id[:8],
            primary_paper,
        )
        return page

    except APIResponseError as e:
        # Check if the error indicates parent mismatches (meaning parent is a page)
        logger.info(
            "Database page creation failed (%s), trying Page Parent fallback...",
            e.message,
        )

        page_properties = {
            "title": {
                "title": [{"text": {"content": page_title[:2000] or "Untitled Clipping"}}]
            }
        }

        # Build metadata header blocks to prepend to body blocks
        metadata_blocks = _build_metadata_header_blocks(
            source_url=source_url,
            primary_paper=primary_paper,
            tags=tags,
            custom_tags=custom_tags,
            notes=notes,
        )
        full_body_blocks = metadata_blocks + body_blocks

        try:
            page = await client.pages.create(
                parent={"page_id": parent_id},
                properties=page_properties,
                children=full_body_blocks,
            )
            logger.info(
                "Created Notion sub-page %s under page parent %s for paper %s",
                page.get("id", "?"),
                parent_id[:8],
                primary_paper,
            )
            return page
        except APIResponseError as fallback_err:
            logger.error(
                "Notion API error on page parent fallback: %s (code=%s)",
                fallback_err.message,
                fallback_err.code,
            )
            raise RuntimeError(
                f"Notion API error: {fallback_err.message} (Original error: {e.message})"
            ) from fallback_err

    finally:
        pass
