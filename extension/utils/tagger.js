/**
 * UPSC Clipper — Local Syllabus Tagger Engine
 * Runs entirely client-side. No network calls.
 * Loads syllabus_map.json and matches text against UPSC GS1-GS4 keywords.
 */

let syllabusData = null;
let compiledPatterns = null;

/**
 * Load and compile the syllabus map into regex patterns (once).
 * @returns {Promise<void>}
 */
async function initTagger() {
  if (compiledPatterns) return;

  const url = chrome.runtime.getURL('data/syllabus_map.json');
  const response = await fetch(url);
  syllabusData = await response.json();
  compiledPatterns = [];

  for (const [paper, topics] of Object.entries(syllabusData)) {
    for (const [topic, keywords] of Object.entries(topics)) {
      for (const keyword of keywords) {
        // Escape regex special chars in keyword, then build word-boundary pattern
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
        compiledPatterns.push({ paper, topic, keyword, pattern });
      }
    }
  }
}

/**
 * Match input text against all UPSC syllabus keywords.
 * Returns deduplicated tag matches sorted by paper.
 *
 * @param {string} text - The text to scan for syllabus keywords.
 * @param {string} [optionalSubject] - The name of the optional subject.
 * @param {string} [optionalKeywords] - Comma-separated custom optional keywords.
 * @returns {Promise<Array<{paper: string, topic: string, keyword: string, count: number}>>}
 */
async function matchTags(text, optionalSubject = '', optionalKeywords = '') {
  await initTagger();

  if (!text || typeof text !== 'string') return [];

  const matches = [];
  const seen = new Set();

  // Compile custom optional patterns on the fly
  const optionalPatterns = [];
  if (optionalSubject && optionalKeywords) {
    const keywords = optionalKeywords.split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    for (const kw of keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
      optionalPatterns.push({
        paper: 'Optional',
        topic: optionalSubject,
        keyword: kw,
        pattern
      });
    }
  }

  // Combine standard and optional patterns
  const allPatterns = [...compiledPatterns, ...optionalPatterns];

  for (const entry of allPatterns) {
    const hits = text.match(entry.pattern);
    if (hits && hits.length > 0) {
      const key = `${entry.paper}::${entry.topic}::${entry.keyword}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({
          paper: entry.paper,
          topic: entry.topic,
          keyword: entry.keyword,
          count: hits.length
        });
      }
    }
  }

  // Sort: higher match count first, then by paper order
  const paperOrder = { GS1: 1, GS2: 2, GS3: 3, GS4: 4, Optional: 5 };
  matches.sort((a, b) => {
    if (a.paper !== b.paper) return (paperOrder[a.paper] || 99) - (paperOrder[b.paper] || 99);
    return b.count - a.count;
  });

  return matches;
}

// Export for popup.js (loaded as module or via globalThis)
if (typeof globalThis !== 'undefined') {
  globalThis.UPSCTagger = { initTagger, matchTags };
}
