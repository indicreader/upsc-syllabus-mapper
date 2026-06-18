/**
 * UPSC Clipper — Background Service Worker (MV3)
 * Manages context menu, captures selections, and coordinates popup opening.
 *
 * MV3 rule: never call chrome.contextMenus.onClicked at the top level of the
 * module. Always register all event listeners before any async work so the
 * service worker can re-attach them on wake-up.
 */

// ── Context Menu Click Handler ────────────────────────────────────────────────
// Must be registered at the TOP LEVEL (not inside any async callback) so
// Chrome can re-attach it each time the service worker wakes up.

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'upsc-clip-selection') return;

  const clipData = {
    // selectionText is undefined when right-clicking the page without selecting
    selectedText: info.selectionText ? info.selectionText.trim() : '',
    pageUrl:      info.pageUrl || tab?.url || '',
    pageTitle:    tab?.title  || '',
    timestamp:    Date.now()
  };

  chrome.storage.local.set({ pendingClip: clipData }, () => {
    // Notify the content script so it can show the toast
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'CLIP_CAPTURED',
        data: clipData
      }).catch(() => {
        // Content script may not be injected yet on restricted pages — ignore
      });
    }
  });
});

// ── Message Handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PENDING_CLIP') {
    chrome.storage.local.get('pendingClip', (result) => {
      sendResponse(result.pendingClip || null);
    });
    return true; // keep channel open for async response
  }

  if (message.type === 'CLEAR_PENDING_CLIP') {
    chrome.storage.local.remove('pendingClip', () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'CAPTURE_SELECTION') {
    const clipData = {
      selectedText: message.selectedText,
      pageUrl:      message.pageUrl,
      pageTitle:    message.pageTitle,
      timestamp:    Date.now()
    };
    chrome.storage.local.set({ pendingClip: clipData }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'SAVE_CLIP') {
    chrome.storage.local.get(['backendUrl', 'appToken'], (settings) => {
      const backendUrl = settings.backendUrl || 'http://localhost:8000';
      const appToken   = settings.appToken   || '';

      if (!appToken) {
        sendResponse({ success: false, error: 'Set your App Token in settings first' });
        return;
      }

      fetch(`${backendUrl}/api/clipper/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-App-Local-Token': appToken,
        },
        body: JSON.stringify(message.payload),
      })
      .then(async (resp) => {
        const data = await resp.json();
        if (resp.ok) {
          sendResponse({ success: true, data });
        } else {
          sendResponse({ success: false, error: data.detail || 'Server error' });
        }
      })
      .catch((err) => {
        sendResponse({ success: false, error: `Connection failed: ${err.message}` });
      });
    });
    return true; // keep channel open for async response
  }
});

// ── One-time Installation Setup ───────────────────────────────────────────────
// Create the context menu item and seed default storage on first install/update.

chrome.runtime.onInstalled.addListener(() => {
  // Remove existing item first to avoid 'already exists' errors on update
  chrome.contextMenus.remove('upsc-clip-selection', () => {
    // Clear the error from trying to remove a non-existent item
    void chrome.runtime.lastError;

    chrome.contextMenus.create({
      id:       'upsc-clip-selection',
      title:    '📋 Clip with UPSC Tagger',
      contexts: ['selection', 'page']  // 'page' = no selection → full article
    });
  });

  // Seed default settings if not already set
  chrome.storage.local.get(['backendUrl', 'appToken'], (result) => {
    if (!result.backendUrl) {
      chrome.storage.local.set({
        backendUrl: 'http://localhost:8000',
        appToken:   ''
      });
    }
  });
});
