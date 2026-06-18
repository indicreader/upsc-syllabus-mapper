"""
UPSC Clipper Backend — Pydantic Models
Request/response schemas for the clipper API.
"""

from __future__ import annotations
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, HttpUrl


class TagItem(BaseModel):
    """A single syllabus tag match."""
    paper: str = Field(..., description="GS paper identifier, e.g. GS1, GS2")
    topic: str = Field(..., description="Topic within the paper")
    keyword: str = Field(..., description="Matched keyword")


class ClipRequest(BaseModel):
    """Inbound clipping payload from the Chrome extension."""
    source_url: str = Field(..., description="URL of the source page")
    page_title: str = Field("", description="Title of the source page")
    selected_text: str | None = Field(None, description="User-selected text snippet")
    fetch_full_article: bool = Field(
        False,
        description="If true, backend fetches and cleans the full article from source_url",
    )
    tags: list[TagItem] = Field(default_factory=list, description="Auto-detected syllabus tags")
    custom_tags: list[str] = Field(default_factory=list, description="User-added custom tags")
    notes: str = Field("", description="User notes")
    destination: Literal["local", "notion"] = Field(
        "local",
        description="Where to store the clipping",
    )
    primary_paper: str = Field(
        "",
        description="Primary paper for Notion routing (GS1, GS2, GS3, GS4, Ethics, Optional)",
    )


class ClipResponse(BaseModel):
    """Outbound response after processing a clipping."""
    status: str
    clip_id: str
    destination: str
    tags_applied: list[str]
    message: str = ""


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = "1.0.0"
    timestamp: datetime
