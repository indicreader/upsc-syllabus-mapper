/**
 * UPSC Clipper — Popup Controller
 * Auto-detects save mode:
 *   • Highlighted text → save the snippet only
 *   • No highlight     → backend fetches the full cleaned article
 */

(() => {
  'use strict';

  // ── DOM References ──────────────────────────────────────────────────────

  const $clipText     = document.getElementById('textarea-clip');
  const $notes        = document.getElementById('textarea-notes');
  const $tagsBox      = document.getElementById('tags-container');
  const $customInput  = document.getElementById('input-custom-tag');
  const $btnAddTag    = document.getElementById('btn-add-tag');
  const $btnSubmit    = document.getElementById('btn-submit');
  const $btnText      = $btnSubmit.querySelector('.btn-text');
  const $btnSpinner   = $btnSubmit.querySelector('.btn-spinner');
  const $statusBar    = document.getElementById('status-bar');
  const $statusText   = document.getElementById('status-text');
  const $selectPaper  = document.getElementById('select-paper');
  const $optOptional  = document.getElementById('option-optional');
  const $modeIcon     = document.getElementById('mode-icon');
  const $modeText     = document.getElementById('mode-text');

  // Settings
  const $btnSettings     = document.getElementById('btn-settings');
  const $panelSettings   = document.getElementById('panel-settings');
  const $inputBackend    = document.getElementById('input-backend-url');
  const $inputToken      = document.getElementById('input-app-token');
  const $inputOptSubject = document.getElementById('input-optional-subject');
  const $inputOptKeywords = document.getElementById('input-optional-keywords');
  const $btnSaveSettings = document.getElementById('btn-save-settings');

  // ── State ───────────────────────────────────────────────────────────────

  let currentTags = [];    // [{paper, topic, keyword, type:'auto'|'custom'}]
  let pageUrl     = '';
  let pageTitle   = '';
  let hasHighlight = false; // true when user had text selected

  // ── Init ────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    await loadSettings();
    await loadPendingClip();
    bindEvents();
  }

  // ── Settings ────────────────────────────────────────────────────────────

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ['backendUrl', 'appToken', 'optionalSubject', 'optionalKeywords'],
        (result) => {
          $inputBackend.value     = result.backendUrl      || 'http://localhost:8000';
          $inputToken.value       = result.appToken        || '';
          $inputOptSubject.value  = result.optionalSubject || '';
          $inputOptKeywords.value = result.optionalKeywords || '';

          if (result.optionalSubject) {
            $optOptional.textContent = `Optional — ${result.optionalSubject}`;
          }
          resolve();
        }
      );
    });
  }

  function saveSettings() {
    const settings = {
      backendUrl:       $inputBackend.value.replace(/\/+$/, ''),
      appToken:         $inputToken.value.trim(),
      optionalSubject:  $inputOptSubject.value.trim(),
      optionalKeywords: $inputOptKeywords.value.trim(),
    };
    chrome.storage.local.set(settings, () => {
      if (settings.optionalSubject) {
        $optOptional.textContent = `Optional — ${settings.optionalSubject}`;
      }
      setStatus('Settings saved ✓', 'success');
      $panelSettings.classList.add('hidden');
    });
  }

  // ── Load Clip Data ──────────────────────────────────────────────────────

  async function loadPendingClip() {
    return new Promise((resolve) => {
      chrome.storage.local.get('pendingClip', async (result) => {
        const clip = result.pendingClip;

        if (clip) {
          pageUrl   = clip.pageUrl   || '';
          pageTitle = clip.pageTitle || '';

          if (clip.selectedText && clip.selectedText.trim().length > 0) {
            // User had text highlighted — show snippet mode
            hasHighlight = true;
            $clipText.value = clip.selectedText;
            setModeIndicator('highlight');
            await runTagger(clip.selectedText);
            setStatus('Highlighted text loaded — review tags', 'success');
          } else {
            // No selection — full article mode
            hasHighlight = false;
            $clipText.value = '';
            setModeIndicator('full');
            // Still try to tag from the page title
            if (pageTitle) await runTagger(pageTitle);
            setStatus('No highlight — full article will be fetched', '');
          }
        } else {
          setStatus('Open a page and select text, or just open the popup to save the full article');
        }
        resolve();
      });
    });
  }

  // ── Mode Indicator ──────────────────────────────────────────────────────

  function setModeIndicator(mode) {
    const indicator = document.getElementById('mode-indicator');
    if (mode === 'highlight') {
      $modeIcon.textContent = '✂️';
      $modeText.textContent = 'Saving highlighted text as notes';
      indicator.className   = 'mode-indicator mode-indicator--snippet';
    } else {
      $modeIcon.textContent = '📰';
      $modeText.textContent = 'Full article will be fetched & saved';
      indicator.className   = 'mode-indicator mode-indicator--full';
    }
  }

  // ── Tagger ──────────────────────────────────────────────────────────────

  async function runTagger(text) {
    if (!text || !globalThis.UPSCTagger) return;
    try {
      const settings = await new Promise(resolve => {
        chrome.storage.local.get(['optionalSubject', 'optionalKeywords'], resolve);
      });
      const matches = await globalThis.UPSCTagger.matchTags(
        text,
        settings.optionalSubject || '',
        settings.optionalKeywords || ''
      );
      currentTags = matches.map(m => ({
        paper:   m.paper,
        topic:   m.topic,
        keyword: m.keyword,
        type:    'auto',
      }));
      renderTags();

      // Auto-set paper dropdown to top match
      if (matches.length > 0 && $selectPaper.value === 'auto') {
        // Leave on 'auto' — backend resolves; user can override manually
      }
    } catch (err) {
      console.error('Tagger error:', err);
    }
  }

  // ── Tag Rendering ──────────────────────────────────────────────────────

  function renderTags() {
    $tagsBox.innerHTML = '';

    if (currentTags.length === 0) {
      $tagsBox.innerHTML = '<span class="tags-empty">No tags detected yet</span>';
      return;
    }

    currentTags.forEach((tag, idx) => {
      const chip = document.createElement('span');
      const paperClass = tag.type === 'custom'
        ? 'tag-chip--custom'
        : `tag-chip--${tag.paper.toLowerCase()}`;

      chip.className = `tag-chip ${paperClass}`;

      const label = tag.type === 'custom'
        ? tag.keyword
        : `${tag.paper}: ${tag.keyword}`;

      chip.innerHTML = `
        ${escapeHtml(label)}
        <span class="tag-remove" data-idx="${idx}" title="Remove tag">✕</span>
      `;
      $tagsBox.appendChild(chip);
    });
  }

  function addCustomTag() {
    const value = $customInput.value.trim();
    if (!value) return;

    if (currentTags.some(t => t.keyword.toLowerCase() === value.toLowerCase())) {
      setStatus('Tag already exists', 'error');
      return;
    }

    currentTags.push({ paper: 'Custom', topic: 'Custom', keyword: value, type: 'custom' });
    $customInput.value = '';
    renderTags();
  }

  function removeTag(idx) {
    currentTags.splice(idx, 1);
    renderTags();
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const destination   = document.querySelector('input[name="destination"]:checked').value;
    const selectedPaper = $selectPaper.value;

    // Resolve primary paper from auto-detected tags if dropdown is on 'auto'
    let primaryPaper = selectedPaper;
    if (selectedPaper === 'auto') {
      const autoTags = currentTags.filter(t => t.type === 'auto');
      primaryPaper   = autoTags.length > 0 ? autoTags[0].paper : 'GS1';
    }

    // Decide what to send:
    //   hasHighlight → send the snippet as selected_text, no full fetch
    //   no highlight → send empty selected_text, request full article fetch
    const selectedText     = hasHighlight ? $clipText.value.trim() : null;
    const fetchFullArticle = !hasHighlight;

    if (fetchFullArticle && !pageUrl) {
      setStatus('❌ No page URL found — cannot fetch article', 'error');
      return;
    }

    const payload = {
      source_url:         pageUrl,
      page_title:         pageTitle,
      selected_text:      selectedText,
      fetch_full_article: fetchFullArticle,
      tags: currentTags
        .filter(t => t.type === 'auto')
        .map(t => ({ paper: t.paper, topic: t.topic, keyword: t.keyword })),
      custom_tags: currentTags
        .filter(t => t.type === 'custom')
        .map(t => t.keyword),
      notes:         $notes.value.trim(),
      destination:   destination,
      primary_paper: primaryPaper,
    };

    // Get settings
    const settings = await new Promise(resolve => {
      chrome.storage.local.get(['backendUrl', 'appToken'], resolve);
    });

    const backendUrl = settings.backendUrl || 'http://localhost:8000';
    const appToken   = settings.appToken   || '';

    if (!appToken) {
      setStatus('Set your App Token in ⚙️ Settings first', 'error');
      return;
    }

    setLoading(true);
    setStatus(fetchFullArticle ? 'Fetching & saving article…' : 'Saving highlight…', 'loading');

    try {
      const resp = await fetch(`${backendUrl}/api/clipper/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'X-App-Local-Token': appToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (resp.ok) {
        const dest  = data.destination === 'notion' ? 'Notion' : 'Local DB';
        const nTags = data.tags_applied ? data.tags_applied.length : 0;
        setStatus(`✅ Saved to ${dest} (${primaryPaper}) — ${nTags} tags`, 'success');
        chrome.storage.local.remove('pendingClip');
      } else {
        setStatus(`❌ ${data.detail || 'Server error'}`, 'error');
      }
    } catch (err) {
      setStatus(`❌ Connection failed — is the backend running? (${err.message})`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── UI Helpers ──────────────────────────────────────────────────────────

  function setStatus(msg, type = '') {
    $statusText.textContent  = msg;
    $statusBar.className     = 'status-bar';
    if (type) $statusBar.classList.add(`status-bar--${type}`);
  }

  function setLoading(loading) {
    $btnSubmit.disabled = loading;
    $btnText.classList.toggle('hidden', loading);
    $btnSpinner.classList.toggle('hidden', !loading);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Event Bindings ─────────────────────────────────────────────────────

  function bindEvents() {
    $btnSettings.addEventListener('click', () => {
      $panelSettings.classList.toggle('hidden');
    });

    $btnSaveSettings.addEventListener('click', saveSettings);

    $btnAddTag.addEventListener('click', addCustomTag);
    $customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); }
    });

    // Remove tag via delegation
    $tagsBox.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.tag-remove');
      if (removeBtn) removeTag(parseInt(removeBtn.dataset.idx, 10));
    });

    // Re-run tagger when clip textarea is manually edited (highlight mode only)
    let taggerTimeout;
    $clipText.addEventListener('input', () => {
      if (!hasHighlight) return; // full-article mode: don't re-tag empty box
      clearTimeout(taggerTimeout);
      taggerTimeout = setTimeout(async () => {
        const customTags = currentTags.filter(t => t.type === 'custom');
        await runTagger($clipText.value);
        currentTags = [...currentTags.filter(t => t.type === 'auto'), ...customTags];
        renderTags();
      }, 500);
    });

    $btnSubmit.addEventListener('click', handleSubmit);
  }
})();
