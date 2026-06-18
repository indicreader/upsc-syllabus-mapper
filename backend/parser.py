"""
UPSC Clipper Backend — Article Parser
Clean text extraction that strips navbars, ads, scripts, and styling.
Uses readability-lxml as primary, trafilatura as fallback.
"""

import logging
from dataclasses import dataclass

import httpx
from readability import Document as ReadabilityDocument
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Tags to completely remove before extraction
_STRIP_TAGS = {
    "script", "style", "nav", "header", "footer", "aside",
    "iframe", "noscript", "svg", "form", "button",
}

# Class/id substrings that indicate non-content elements
_NOISE_PATTERNS = [
    "nav", "menu", "sidebar", "footer", "header", "cookie",
    "banner", "advert", "social", "share", "comment", "popup",
    "modal", "overlay", "promo", "newsletter", "subscribe",
    "related", "recommended", "widget",
]

_REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

_TIMEOUT = 15.0  # seconds


@dataclass
class ParsedArticle:
    """Result of article extraction."""
    title: str
    text: str
    url: str
    word_count: int


async def extract_article(url: str) -> ParsedArticle:
    """
    Fetch and extract the main article text from a URL.

    Strategy:
    1. Fetch HTML with httpx (async, with timeout + UA header)
    2. Try readability-lxml to isolate the main content
    3. Clean the HTML with BeautifulSoup (strip noise tags/classes)
    4. If readability fails or returns too little, fall back to trafilatura
    5. Return clean plaintext + metadata

    Raises httpx.HTTPError on network failure.
    """
    # ── Step 1: Fetch ──────────────────────────────────────────────────────
    async with httpx.AsyncClient(
        headers=_REQUEST_HEADERS,
        timeout=_TIMEOUT,
        follow_redirects=True,
        verify=True,
    ) as client:
        response = await client.get(url)
        response.raise_for_status()
        raw_html = response.text

    # ── Step 2: Readability extraction ────────────────────────────────────
    title = ""
    clean_text = ""

    try:
        doc = ReadabilityDocument(raw_html)
        title = doc.short_title() or doc.title() or ""
        content_html = doc.summary()

        # Step 3: Deep clean with BeautifulSoup
        clean_text = _deep_clean(content_html)
    except Exception as e:
        logger.warning("Readability extraction failed for %s: %s", url, e)

    # ── Step 4: Fallback to trafilatura ───────────────────────────────────
    if len(clean_text.split()) < 50:
        logger.info("Readability yielded too little content; trying trafilatura")
        try:
            import trafilatura
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                result = trafilatura.extract(
                    downloaded,
                    include_comments=False,
                    include_tables=True,
                    no_fallback=False,
                    favor_precision=True,
                )
                if result and len(result.split()) > len(clean_text.split()):
                    clean_text = result
                    # Try to get title from trafilatura metadata
                    meta = trafilatura.extract(
                        downloaded,
                        output_format="json",
                        include_comments=False,
                    )
                    if meta and not title:
                        import json
                        try:
                            meta_dict = json.loads(meta)
                            title = meta_dict.get("title", title)
                        except (json.JSONDecodeError, TypeError):
                            pass
        except ImportError:
            logger.warning("trafilatura not installed — skipping fallback")
        except Exception as e:
            logger.warning("trafilatura fallback failed: %s", e)

    # ── Step 5: Final cleanup ─────────────────────────────────────────────
    if not clean_text:
        # Last resort: just strip all HTML
        clean_text = _strip_all_html(raw_html)

    # Normalize whitespace
    lines = [line.strip() for line in clean_text.splitlines()]
    clean_text = "\n".join(line for line in lines if line)

    word_count = len(clean_text.split())
    logger.info("Extracted %d words from %s", word_count, url)

    return ParsedArticle(
        title=title.strip(),
        text=clean_text.strip(),
        url=url,
        word_count=word_count,
    )


def _deep_clean(html: str) -> str:
    """
    Remove noise elements from HTML and return plaintext.
    Strips nav, ads, sidebars, scripts, styles, and elements
    whose class/id match known noise patterns.
    """
    soup = BeautifulSoup(html, "lxml")

    # Remove known junk tags
    for tag_name in _STRIP_TAGS:
        for el in soup.find_all(tag_name):
            el.decompose()

    # Remove elements with noisy class/id attributes
    for el in soup.find_all(True):
        attrs_text = " ".join([
            " ".join(el.get("class", [])),
            el.get("id", ""),
        ]).lower()
        if any(pat in attrs_text for pat in _NOISE_PATTERNS):
            el.decompose()

    # Remove hidden elements
    for el in soup.find_all(style=True):
        style = el.get("style", "").lower()
        if "display:none" in style or "visibility:hidden" in style:
            el.decompose()

    return soup.get_text(separator="\n", strip=True)


def _strip_all_html(html: str) -> str:
    """Nuclear fallback: strip all HTML tags, return raw text."""
    soup = BeautifulSoup(html, "lxml")
    for tag_name in _STRIP_TAGS:
        for el in soup.find_all(tag_name):
            el.decompose()
    return soup.get_text(separator="\n", strip=True)
