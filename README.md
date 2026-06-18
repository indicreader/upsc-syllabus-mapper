# UPSC Clipper

A Chrome Extension (Manifest V3) + Python FastAPI backend for clipping, tagging, and organizing web content against the UPSC Civil Services Mains syllabus.

## Features

### Chrome Extension
- **Context Menu Clipping** — Right-click selected text → "Clip with UPSC Tagger"
- **Bundled Syllabus Engine** — Local regex matching against 200+ UPSC GS1-GS4 keywords. Zero network calls for tagging.
- **Interactive Popup UI** — Dark theme popup with:
  - Editable clipped text
  - Auto-detected syllabus tag chips (color-coded per paper)
  - Custom tag input
  - Destination toggle: Local DB / Notion
  - Format toggle: Selected Text / Whole Article
  - Primary paper selector (GS1-GS4, Ethics, Optional)
  - Notes field

### FastAPI Backend
- **Authenticated Endpoint** — `POST /api/clipper/ingest` protected via `X-App-Local-Token` header
- **Dual Routing** — Save to local SQLite database OR send to Notion workspace
- **Per-Paper Notion Databases** — Each paper (GS1-GS4, Ethics, Optional) routes to its own Notion database
- **Article Parser** — Full article extraction using readability-lxml + trafilatura fallback. Strips navbars, ads, scripts, and styling.
- **SQL Injection Proof** — All queries use parameterized placeholders
- **Optional SQLCipher** — Encrypted SQLite at rest (toggle via env var)

---

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Copy and configure environment
copy .env.example .env
# Edit .env with your tokens and Notion database IDs

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
# or: uvicorn main:app --reload --port 8000
```

### 2. Extension Setup

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. Add your icon files to `extension/icons/` (icon16.png, icon48.png, icon128.png)

### 3. Configure the Extension

1. Click the UPSC Clipper extension icon
2. Click ⚙️ Settings
3. Set:
   - **Backend URL**: `http://localhost:8000`
   - **App Token**: same value as `APP_LOCAL_TOKEN` in your `.env`
   - **Optional Subject**: your optional subject name (if any)
4. Click Save Settings

---

## Usage

1. **Select text** on any webpage
2. **Right-click** → "📋 Clip with UPSC Tagger" (or just click the extension icon)
3. Review auto-detected syllabus tags in the popup
4. Add/remove tags, add notes
5. Choose destination (Local DB or Notion) and format (snippet or full article)
6. Select the primary paper for routing
7. Click **✅ Confirm Submit**

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_LOCAL_TOKEN` | Secret token for extension ↔ backend auth |
| `NOTION_TOKEN` | Notion Internal Integration Token |
| `NOTION_DB_GS1` | Notion Database ID for GS Paper 1 |
| `NOTION_DB_GS2` | Notion Database ID for GS Paper 2 |
| `NOTION_DB_GS3` | Notion Database ID for GS Paper 3 |
| `NOTION_DB_GS4` | Notion Database ID for GS Paper 4 |
| `NOTION_DB_ETHICS` | Notion Database ID for Ethics |
| `NOTION_DB_OPTIONAL` | Notion Database ID for Optional paper |
| `OPTIONAL_SUBJECT_NAME` | Name of the optional subject |
| `DB_PATH` | Path to SQLite database file |
| `USE_SQLCIPHER` | Enable SQLCipher encryption (true/false) |
| `SQLCIPHER_KEY` | Encryption passphrase for SQLCipher |

---

## Notion Database Setup

For each paper database in Notion, create these columns:

| Column | Type | Description |
|--------|------|-------------|
| Title | Title | Page title / article name |
| URL | URL | Source page URL |
| Paper | Select | GS paper identifier |
| Tags | Multi-select | Syllabus tags |
| Notes | Rich text | User notes |

Then connect your Notion integration to each database (Share → Invite → select your integration).

---

## API Reference

### `GET /health`
Health check. Returns status, version, timestamp.

### `POST /api/clipper/ingest`
**Headers**: `X-App-Local-Token: <your-token>`

**Body**:
```json
{
  "source_url": "https://example.com/article",
  "page_title": "Article Title",
  "selected_text": "The clipped text...",
  "fetch_full_article": false,
  "tags": [{"paper": "GS2", "topic": "Governance", "keyword": "welfare schemes"}],
  "custom_tags": ["my-custom-tag"],
  "notes": "Important for prelims",
  "destination": "local",
  "primary_paper": "GS2"
}
```

**Response**:
```json
{
  "status": "saved",
  "clip_id": "uuid-here",
  "destination": "local",
  "tags_applied": ["GS2: welfare schemes", "my-custom-tag"],
  "message": "Clipping saved to local DB (GS2)"
}
```

---

## Project Structure

```
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── data/
│   │   └── syllabus_map.json
│   ├── utils/
│   │   └── tagger.js
│   └── icons/
│
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── auth.py
│   ├── models.py
│   ├── database.py
│   ├── notion_service.py
│   ├── parser.py
│   ├── requirements.txt
│   ├── .env.example
│   └── routers/
│       └── clipper.py
│
└── README.md
```
