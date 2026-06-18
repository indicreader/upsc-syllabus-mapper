# Graph Report - d:/plugs/google extention/sylalus tagger  (2026-06-18)

## Corpus Check
- 43 files · ~59,798 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 236 nodes · 259 edges · 30 communities (23 shown, 7 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.61)
- Token cost: 1,500 input · 800 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Syllabus Tagger Map|Syllabus Tagger Map]]
- [[_COMMUNITY_FastAPI Backend Core & Routing|FastAPI Backend Core & Routing]]
- [[_COMMUNITY_Notion Integration Service|Notion Integration Service]]
- [[_COMMUNITY_Chrome Extension MV3 Manifest|Chrome Extension MV3 Manifest]]
- [[_COMMUNITY_Jetro Geospatial Utility|Jetro Geospatial Utility]]
- [[_COMMUNITY_Popup Extension UI Script|Popup Extension UI Script]]
- [[_COMMUNITY_Pydantic Models|Pydantic Models]]
- [[_COMMUNITY_SQLite DB Service|SQLite DB Service]]
- [[_COMMUNITY_Readability Parsing Module|Readability Parsing Module]]
- [[_COMMUNITY_Jetro MCP Configuration|Jetro MCP Configuration]]
- [[_COMMUNITY_Research Board Canvas State|Research Board Canvas State]]
- [[_COMMUNITY_Cursor MCP Server Configuration|Cursor MCP Server Configuration]]
- [[_COMMUNITY_MCP definitions|MCP definitions]]
- [[_COMMUNITY_Chrome Extension Client Architecture|Chrome Extension Client Architecture]]
- [[_COMMUNITY_Jetro Headless Browser Helpers|Jetro Headless Browser Helpers]]
- [[_COMMUNITY_VS Code settings|VS Code settings]]
- [[_COMMUNITY_Jetro Local API|Jetro Local API]]
- [[_COMMUNITY_Jetro Connector API|Jetro Connector API]]
- [[_COMMUNITY_Jetro Project Context|Jetro Project Context]]
- [[_COMMUNITY_Tagger utility details|Tagger utility details]]
- [[_COMMUNITY_Extension Popup Script & HTML|Extension Popup Script & HTML]]
- [[_COMMUNITY_Claude Instructions|Claude Instructions]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]

## God Nodes (most connected - your core abstractions)
1. `Settings` - 10 edges
2. `create_clipping_page()` - 8 edges
3. `GS3` - 8 edges
4. `extract_article()` - 7 edges
5. `ingest_clipping()` - 7 edges
6. `GS1` - 7 edges
7. `jetro` - 6 edges
8. `jetro` - 6 edges
9. `ClipRequest` - 6 edges
10. `ClipResponse` - 6 edges

## Surprising Connections (you probably didn't know these)
- `str` --uses--> `Settings`  [INFERRED]
  backend/auth.py → backend/config.py
- `Settings` --uses--> `Settings`  [INFERRED]
  backend/auth.py → backend/config.py
- `Any` --uses--> `Settings`  [INFERRED]
  backend/notion_service.py → backend/config.py
- `AsyncClient` --uses--> `Settings`  [INFERRED]
  backend/notion_service.py → backend/config.py
- `Settings` --uses--> `Settings`  [INFERRED]
  backend/notion_service.py → backend/config.py

## Import Cycles
- 1-file cycle: `backend/main.py -> backend/main.py`
- 2-file cycle: `backend/main.py -> backend/routers/clipper.py -> backend/main.py`

## Communities (30 total, 7 thin omitted)

### Community 0 - "Syllabus Tagger Map"
Cohesion: 0.07
Nodes (26): GS1, Geography, Indian Heritage & Culture, Indian Society, Modern Indian History, Post-Independence India, World History, GS2 (+18 more)

### Community 1 - "FastAPI Backend Core & Routing"
Cohesion: 0.10
Nodes (21): X-App-Local-Token Auth, Settings, str, UPSC Clipper Backend — Authentication Dependency Validates X-App-Local-Token hea, FastAPI dependency that enforces the internal app token.     Returns the validat, verify_app_token(), health_check(), lifespan() (+13 more)

### Community 2 - "Notion Integration Service"
Cohesion: 0.13
Nodes (19): Any, AsyncClient, get_settings(), str, UPSC Clipper Backend — Configuration Reads all settings from .env via pydantic-s, Resolve a paper identifier to its Notion database ID., Settings, _build_body_blocks() (+11 more)

### Community 3 - "Chrome Extension MV3 Manifest"
Cohesion: 0.09
Nodes (21): action, default_icon, default_popup, background, service_worker, type, content_scripts, 128 (+13 more)

### Community 4 - "Jetro Geospatial Utility"
Cohesion: 0.10
Nodes (19): bbox(), bearing(), destination_point(), grid_points(), haversine(), jet.geo -- Geospatial utilities for Jetro refresh scripts.  Usage:   from jet.ge, Format layer data for 3D frame refresh output.      Usage in refresh scripts:, Distance between two points in km (Haversine formula). (+11 more)

### Community 5 - "Popup Extension UI Script"
Cohesion: 0.22
Nodes (11): addCustomTag(), bindEvents(), handleSubmit(), init(), loadPendingClip(), loadSettings(), removeTag(), renderTags() (+3 more)

### Community 6 - "Pydantic Models"
Cohesion: 0.24
Nodes (12): ClipRequest, ClipResponse, UPSC Clipper Backend — Pydantic Models Request/response schemas for the clipper, A single syllabus tag match., Inbound clipping payload from the Chrome extension., Outbound response after processing a clipping., TagItem, str (+4 more)

### Community 7 - "SQLite DB Service"
Cohesion: 0.21
Nodes (11): _get_connection(), get_db(), init_db(), insert_clipping(), str, UPSC Clipper Backend — Database Layer SQLite (or SQLCipher) connection manager w, Insert a clipping and its tags in a single transaction.     Returns the generate, Create a new SQLite/SQLCipher connection.     If USE_SQLCIPHER is true, applies (+3 more)

### Community 8 - "Readability Parsing Module"
Cohesion: 0.27
Nodes (10): _deep_clean(), extract_article(), ParsedArticle, str, UPSC Clipper Backend — Article Parser Clean text extraction that strips navbars,, Remove noise elements from HTML and return plaintext.     Strips nav, ads, sideb, Nuclear fallback: strip all HTML tags, return raw text., Result of article extraction. (+2 more)

### Community 9 - "Jetro MCP Configuration"
Cohesion: 0.20
Nodes (9): JET_API_URL, JET_JWT, JET_WORKSPACE, PATH, args, command, env, mcpServers (+1 more)

### Community 10 - "Research Board Canvas State"
Cohesion: 0.25
Nodes (7): edges, elements, name, viewport, x, y, zoom

### Community 11 - "Cursor MCP Server Configuration"
Cohesion: 0.29
Nodes (6): JET_API_URL, JET_JWT, JET_WORKSPACE, PATH, C:\Users\vijay\.jetro\runtime\node-win32-x64.exe, jetro

### Community 12 - "MCP definitions"
Cohesion: 0.29
Nodes (6): JET_API_URL, JET_JWT, JET_WORKSPACE, PATH, C:\Users\vijay\.jetro\runtime\node-win32-x64.exe, jetro

### Community 13 - "Chrome Extension Client Architecture"
Cohesion: 0.50
Nodes (5): MV3 Background Service Worker, UPSC Clipper Content Script, Extension Manifest MV3, Syllabus Key-value Map, Regex Tagger Utility

### Community 14 - "Jetro Headless Browser Helpers"
Cohesion: 0.50
Nodes (4): launch_stealth(), login_and_fetch(), Launch a stealth Playwright Chromium browser context.      Returns (pw, browser,, Full credential-aware fetch with auto-login.      If credentials exist for the d

### Community 15 - "VS Code settings"
Cohesion: 0.50
Nodes (3): python.testing.pytestEnabled, python.testing.unittestArgs, python.testing.unittestEnabled

## Knowledge Gaps
- **77 isolated node(s):** `C:\Users\vijay\.jetro\runtime\node-win32-x64.exe`, `JET_WORKSPACE`, `JET_API_URL`, `JET_JWT`, `PATH` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ingest_clipping()` connect `Pydantic Models` to `Readability Parsing Module`, `FastAPI Backend Core & Routing`, `Notion Integration Service`, `SQLite DB Service`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `create_clipping_page()` connect `Notion Integration Service` to `Pydantic Models`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `extract_article()` connect `Readability Parsing Module` to `Pydantic Models`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `Settings` (e.g. with `Any` and `AsyncClient`) actually correct?**
  _`Settings` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `create_clipping_page()` (e.g. with `get_settings()` and `ingest_clipping()`) actually correct?**
  _`create_clipping_page()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `ingest_clipping()` (e.g. with `insert_clipping()` and `create_clipping_page()`) actually correct?**
  _`ingest_clipping()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `C:\Users\vijay\.jetro\runtime\node-win32-x64.exe`, `JET_WORKSPACE`, `JET_API_URL` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._