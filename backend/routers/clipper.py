"""
UPSC Clipper Backend — Clipper Router
POST /api/clipper/ingest — core ingestion endpoint.

Logic:
  • selected_text present  → save the snippet as the page body
  • fetch_full_article=True → fetch & clean the URL, save full article text
  Routes to local SQLite (local) or per-paper Notion database (notion).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from auth import verify_app_token
from models import ClipRequest, ClipResponse
from database import insert_clipping
from notion_service import create_clipping_page
from parser import extract_article

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/clipper", tags=["clipper"])


@router.post(
    "/ingest",
    response_model=ClipResponse,
    summary="Ingest a clipping",
    description=(
        "Accepts a clipping from the Chrome extension. "
        "If selected_text is provided, saves that snippet. "
        "If fetch_full_article=True, fetches and cleans the full article from source_url. "
        "Routes to local SQLite or a per-paper Notion database."
    ),
)
async def ingest_clipping(
    payload: ClipRequest,
    _token: str = Depends(verify_app_token),
) -> ClipResponse:

    # ── 1. Resolve the content to save ───────────────────────────────────
    content = payload.selected_text or ""

    if payload.fetch_full_article:
        if not payload.source_url:
            raise HTTPException(
                status_code=400,
                detail="source_url is required when fetch_full_article is true",
            )
        try:
            article = await extract_article(payload.source_url)
            content = article.text
            # Use article title when page_title wasn't sent
            if not payload.page_title and article.title:
                payload.page_title = article.title
            logger.info("Fetched full article: %d words from %s", article.word_count, payload.source_url)
        except Exception as e:
            logger.error("Article extraction failed: %s", e)
            raise HTTPException(status_code=502, detail=f"Failed to fetch article: {e}")

    if not content.strip():
        raise HTTPException(
            status_code=400,
            detail="No content to save — provide selected_text or enable fetch_full_article",
        )

    # ── 2. Resolve primary paper ──────────────────────────────────────────
    primary_paper = payload.primary_paper or ""
    if not primary_paper and payload.tags:
        primary_paper = payload.tags[0].paper
    if not primary_paper:
        primary_paper = "GS1"

    # ── 3. Build tag structures ───────────────────────────────────────────
    tags_dicts     = [t.model_dump() for t in payload.tags]
    all_tag_labels = [f"{t.paper}: {t.keyword}" for t in payload.tags]
    all_tag_labels.extend(payload.custom_tags)

    # ── 4. Route ──────────────────────────────────────────────────────────

    if payload.destination == "local":
        try:
            clip_id = insert_clipping(
                source_url=payload.source_url,
                page_title=payload.page_title,
                clipped_text=content,
                primary_paper=primary_paper,
                notes=payload.notes,
                tags=tags_dicts,
                custom_tags=payload.custom_tags,
            )
        except Exception as e:
            logger.error("DB insert failed: %s", e)
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

        return ClipResponse(
            status="saved",
            clip_id=clip_id,
            destination="local",
            tags_applied=all_tag_labels,
            message=f"Saved to local DB ({primary_paper})",
        )

    elif payload.destination == "notion":
        try:
            page = await create_clipping_page(
                source_url=payload.source_url,
                page_title=payload.page_title,
                clipped_text=content,
                primary_paper=primary_paper,
                tags=tags_dicts,
                custom_tags=payload.custom_tags,
                notes=payload.notes,
            )
            clip_id = page.get("id", "unknown")
        except RuntimeError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error("Notion creation failed: %s", e)
            raise HTTPException(status_code=502, detail=f"Notion error: {e}")

        return ClipResponse(
            status="saved",
            clip_id=clip_id,
            destination="notion",
            tags_applied=all_tag_labels,
            message=f"Saved to Notion ({primary_paper})",
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unknown destination: {payload.destination}")
