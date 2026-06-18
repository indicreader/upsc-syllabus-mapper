/**
 * UPSC Clipper — Content Script
 * Scans page on load for UPSC syllabus keywords and displays interactive save toast.
 */

(() => {
  'use strict';

  // ── Auto-scan page on run/load ──────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAutoScan);
  } else {
    runAutoScan();
  }

  async function runAutoScan() {
    if (!globalThis.UPSCTagger) return;

    // Fetch optional subject and keywords from storage
    chrome.storage.local.get(['optionalSubject', 'optionalKeywords'], async (settings) => {
      const optSubject = settings.optionalSubject || '';
      const optKeywords = settings.optionalKeywords || '';

      const bodyText = document.body.innerText || '';
      if (bodyText.length < 50) return; // ignore blank/empty pages

      try {
        const matches = await globalThis.UPSCTagger.matchTags(bodyText, optSubject, optKeywords);
        if (matches && matches.length > 0) {
          // Identify unique matched papers
          const papers = [...new Set(matches.map(m => m.paper))];
          showInteractiveToast(papers, matches);
        }
      } catch (err) {
        console.error('UPSC Clipper scan error:', err);
      }
    });
  }

  // ── Toast Notification UI ──────────────────────────────────────────────────

  function showInteractiveToast(papers, matches) {
    if (document.getElementById('upsc-clipper-toast')) return;

    const toast = document.createElement('div');
    toast.id = 'upsc-clipper-toast';

    // Build the matches detail list html (top 3)
    const matchesSnippet = matches.slice(0, 3)
      .map(m => `<span class="upsc-tag-bullet upsc-tag-bullet--${m.paper.toLowerCase()}">${m.paper}: ${m.keyword}</span>`)
      .join(' ');

    // Main header
    const titleDiv = document.createElement('div');
    titleDiv.className = 'upsc-toast-title';
    titleDiv.innerHTML = `<span>🔍 UPSC Syllabus Match</span><span class="upsc-toast-close">✕</span>`;

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'upsc-toast-body';
    bodyDiv.innerHTML = `
      <p class="upsc-toast-info">Found matches in syllabus:</p>
      <div class="upsc-toast-tags">${matchesSnippet}</div>
    `;

    // Button row
    const btnRow = document.createElement('div');
    btnRow.className = 'upsc-toast-buttons';

    papers.forEach(paper => {
      const btn = document.createElement('button');
      btn.className = `upsc-toast-btn upsc-toast-btn--${paper.toLowerCase()}`;
      btn.textContent = `Save to ${paper}`;
      btn.addEventListener('click', () => saveClippedPage(paper, matches, toast));
      btnRow.appendChild(btn);
    });

    toast.appendChild(titleDiv);
    toast.appendChild(bodyDiv);
    toast.appendChild(btnRow);

    // Apply Styles injectively to avoid stylesheet dependencies
    const style = document.createElement('style');
    style.id = 'upsc-toast-styles';
    style.textContent = `
      #upsc-clipper-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: rgba(18, 18, 28, 0.9);
        backdrop-filter: blur(14px) saturate(180%);
        -webkit-backdrop-filter: blur(14px) saturate(180%);
        color: #e2e8f0;
        padding: 18px 20px;
        border-radius: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13.5px;
        z-index: 2147483647;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08);
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        opacity: 0;
        transform: translateY(24px) scale(0.96);
        max-width: 360px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        border-left: 4px solid #6366f1;
      }
      .upsc-toast-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 14px;
        color: #ffffff;
      }
      .upsc-toast-close {
        cursor: pointer;
        opacity: 0.5;
        font-size: 14px;
        transition: opacity 0.2s;
        padding: 0 4px;
      }
      .upsc-toast-close:hover {
        opacity: 0.9;
      }
      .upsc-toast-body {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .upsc-toast-info {
        margin: 0;
        opacity: 0.7;
        font-size: 12.5px;
      }
      .upsc-toast-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }
      .upsc-tag-bullet {
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 6px;
        font-weight: 600;
        background: rgba(255,255,255,0.06);
      }
      .upsc-tag-bullet--gs1 { color: #f28e2b; background: rgba(242,142,43,0.12); }
      .upsc-tag-bullet--gs2 { color: #4e79a7; background: rgba(78,121,167,0.12); }
      .upsc-tag-bullet--gs3 { color: #59a14f; background: rgba(89,161,79,0.12); }
      .upsc-tag-bullet--gs4 { color: #b07aa1; background: rgba(176,122,161,0.12); }
      .upsc-tag-bullet--optional { color: #e15759; background: rgba(225,87,89,0.12); }
      
      .upsc-toast-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      .upsc-toast-btn {
        border: none;
        outline: none;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #ffffff;
      }
      .upsc-toast-btn--gs1 { background: #d67a1c; }
      .upsc-toast-btn--gs1:hover { background: #f28e2b; }
      .upsc-toast-btn--gs2 { background: #3c628a; }
      .upsc-toast-btn--gs2:hover { background: #4e79a7; }
      .upsc-toast-btn--gs3 { background: #44833c; }
      .upsc-toast-btn--gs3:hover { background: #59a14f; }
      .upsc-toast-btn--gs4 { background: #925c84; }
      .upsc-toast-btn--gs4:hover { background: #b07aa1; }
      .upsc-toast-btn--optional { background: #be4345; }
      .upsc-toast-btn--optional:hover { background: #e15759; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(toast);

    // Dismiss trigger
    toast.querySelector('.upsc-toast-close').addEventListener('click', () => {
      dismissToast(toast);
    });

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    });
  }

  function dismissToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(16px) scale(0.96)';
    setTimeout(() => {
      toast.remove();
      const style = document.getElementById('upsc-toast-styles');
      if (style) style.remove();
    }, 400);
  }

  // ── Save action ────────────────────────────────────────────────────────────

  function saveClippedPage(paper, matches, toast) {
    // Disable all buttons in the toast
    const buttons = toast.querySelectorAll('.upsc-toast-btn');
    buttons.forEach(b => {
      b.disabled = true;
      b.style.opacity = '0.5';
      b.style.cursor = 'not-allowed';
    });

    const bodyText = toast.querySelector('.upsc-toast-body');
    bodyText.innerHTML = `<p class="upsc-toast-info">⏳ Saving article to Notion (${paper})...</p>`;

    // Check if there is currently highlighted text
    const selectedText = window.getSelection().toString().trim();
    const fetchFullArticle = !selectedText;

    // Filter tags that correspond to the clicked paper
    const paperTags = matches
      .filter(m => m.paper === paper)
      .map(m => ({ paper: m.paper, topic: m.topic, keyword: m.keyword }));

    const payload = {
      source_url: window.location.href,
      page_title: document.title,
      selected_text: selectedText || null,
      fetch_full_article: fetchFullArticle,
      tags: paperTags,
      custom_tags: [],
      notes: selectedText ? `Snippet selection: "${selectedText}"` : '',
      destination: 'notion',
      primary_paper: paper
    };

    chrome.runtime.sendMessage({
      type: 'SAVE_CLIP',
      payload
    }, (response) => {
      if (response && response.success) {
        bodyText.innerHTML = `<p class="upsc-toast-info" style="color: #4ade80;">✅ Saved to Notion sub-page successfully!</p>`;
        setTimeout(() => dismissToast(toast), 2500);
      } else {
        const errorMsg = response ? response.error : 'Connection timeout';
        bodyText.innerHTML = `
          <p class="upsc-toast-info" style="color: #f87171;">❌ Save failed!</p>
          <span style="font-size: 11px; opacity: 0.8; word-break: break-all;">${errorMsg}</span>
        `;
        // Enable buttons again to retry
        setTimeout(() => {
          bodyText.innerHTML = `
            <p class="upsc-toast-info">Found matches in syllabus:</p>
            <div class="upsc-toast-tags">${matches.slice(0, 3).map(m => `<span class="upsc-tag-bullet upsc-tag-bullet--${m.paper.toLowerCase()}">${m.paper}: ${m.keyword}</span>`).join(' ')}</div>
          `;
          buttons.forEach(b => {
            b.disabled = false;
            b.style.opacity = '1';
            b.style.cursor = 'pointer';
          });
        }, 3000);
      }
    });
  }
})();
