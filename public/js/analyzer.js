/**
 * aegisresil-apex — Scam/Fraud Message Analyzer Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const textInput = document.getElementById('scam-text-input');
  const charCount = document.getElementById('scam-char-count');
  const btnAnalyze = document.getElementById('btn-analyze-scam');
  const btnClear = document.getElementById('btn-clear-scam');
  const loadingSection = document.getElementById('scam-loading');
  const resultsSection = document.getElementById('scam-results');
  
  // Results details elements
  const scoreNum = document.getElementById('scam-score-num');
  const gaugeFill = document.getElementById('scam-gauge-fill');
  const levelBadge = document.getElementById('scam-level-badge');
  const flagsList = document.getElementById('scam-flags-list');
  const recommendationBox = document.getElementById('scam-recommendation-box');

  // SVG Gauge Circumference: 2 * PI * r = 2 * 3.14159 * 40 = 251.2
  const GAUGE_CIRCUMFERENCE = 251.2;

  // Listen for typing events to update character count and enable/disable button
  textInput.addEventListener('input', () => {
    const textLength = textInput.value.trim().length;
    charCount.textContent = textLength.toLocaleString();
    btnAnalyze.disabled = textLength < 10; // Require at least 10 characters to perform analysis
  });

  // Clear button handler
  btnClear.addEventListener('click', () => {
    textInput.value = '';
    charCount.textContent = '0';
    btnAnalyze.disabled = true;
    resultsSection.style.display = 'none';
    loadingSection.style.display = 'none';
    textInput.disabled = false;
  });

  // Analyze button click handler
  btnAnalyze.addEventListener('click', async () => {
    const rawText = textInput.value.trim();
    if (rawText.length < 10) return;

    // --- Run multi-channel normalizer before sending ---
    let textToSend = rawText;
    let detectedChannel = 'Unknown';
    if (window.ChannelNormalizer) {
      const normalized = window.ChannelNormalizer.process(rawText);
      textToSend = normalized.annotatedText; // Annotated text with [SOURCE_CHANNEL: X] prefix
      detectedChannel = normalized.channelLabel;
    }

    // Toggle loading UI states
    textInput.disabled = true;
    btnAnalyze.disabled = true;
    btnClear.disabled = true;
    resultsSection.style.display = 'none';
    loadingSection.style.display = 'flex';

    try {
      // Call secure Express backend endpoint
      const response = await fetch('/api/analyze-scam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textToSend })
      });

      if (!response.ok) {
        const errPayload = await response.json();
        throw new Error(errPayload.error || 'Server error occurred during analysis');
      }

      const analysisResult = await response.json();

      // Determine document summary label for history listing (e.g. first line or slice of text)
      const truncatedTitle = rawText.split('\n')[0].substring(0, 50) || 'Job Message Analysis';

      // Save to localStorage
      window.StorageManager.saveScan('scam', analysisResult, truncatedTitle);

      // Render the result to UI
      renderScamResults(analysisResult);

    } catch (error) {
      console.error('Error analyzing message:', error);
      alert(`Analysis Failed: ${error.message}\nEnsure the local server is running and check console.`);
      resultsSection.style.display = 'none';
    } finally {
      // Re-enable inputs
      textInput.disabled = false;
      btnAnalyze.disabled = false;
      btnClear.disabled = false;
      loadingSection.style.display = 'none';
    }
  });

  /**
   * Updates risk visual components with the API response content
   */
  function renderScamResults(result) {
    const score = Math.max(0, Math.min(100, result.risk_score));
    const level = (result.risk_level || 'LOW').toUpperCase();
    const flags = result.red_flags || [];
    const recommendation = result.recommendation || 'No specific recommendations provided.';
    const sourceChannel = result.source_channel || 'Unknown';
    const scamType = result.international_scam_type || '';

    // 1. Update text fields
    scoreNum.textContent = score;
    levelBadge.textContent = level;
    recommendationBox.innerHTML = escapeHtml(recommendation);

    // 2. Animate SVG circular gauge
    const strokeOffset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * score) / 100;
    requestAnimationFrame(() => {
      gaugeFill.style.strokeDashoffset = strokeOffset;
    });

    // 3. Apply color-coded styling classes based on risk level
    applyLevelStyles(level);

    // 4. Render the list of flags
    if (flags.length === 0) {
      flagsList.innerHTML = `<li style="list-style:none; color: var(--text-secondary);">&nbsp;✅ No severe red flags identified. The text parameters check out normal.</li>`;
    } else {
      flagsList.innerHTML = flags.map(flag => `<li>${escapeHtml(flag)}</li>`).join('');
    }

    // 5. Render source channel badge
    let channelBadge = document.getElementById('scam-channel-badge');
    if (!channelBadge) {
      channelBadge = document.createElement('div');
      channelBadge.id = 'scam-channel-badge';
      channelBadge.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
      `;
      // Insert above the flags list
      flagsList.parentNode.insertBefore(channelBadge, flagsList);
    }

    const channelColor = ['WhatsApp','Telegram'].includes(sourceChannel) ? '#ef4444'
      : ['Discord','SMS'].includes(sourceChannel) ? '#f59e0b'
      : '#6b7280';

    channelBadge.innerHTML = `
      <span style="display:inline-flex; align-items:center; gap:0.35rem; background:rgba(255,255,255,0.04); border:1px solid ${channelColor}44; color:${channelColor}; border-radius:6px; padding:0.28rem 0.65rem; font-size:0.75rem; font-weight:600;">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${escapeHtml(sourceChannel)}
      </span>
      ${scamType ? `<span style="display:inline-flex; align-items:center; gap:0.35rem; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); color:#fca5a5; border-radius:6px; padding:0.28rem 0.65rem; font-size:0.72rem; font-weight:600;">
        ⚠️ ${escapeHtml(scamType.replace(/_/g, ' '))}
      </span>` : ''}
    `;

    // 6. Unhide Results Grid
    resultsSection.style.display = 'grid';
  }

  /**
   * Manages status specific classes (level-low, level-medium, level-high) on indicator cards
   */
  function applyLevelStyles(level) {
    // Clear old status styles
    const statusClasses = ['level-low', 'level-medium', 'level-high'];
    gaugeFill.classList.remove(...statusClasses);
    scoreNum.classList.remove(...statusClasses);
    levelBadge.classList.remove(...statusClasses);

    // Assign appropriate color styles
    let targetClass = 'level-low';
    if (level === 'MEDIUM') {
      targetClass = 'level-medium';
    } else if (level === 'HIGH') {
      targetClass = 'level-high';
    }

    gaugeFill.classList.add(targetClass);
    scoreNum.classList.add(targetClass);
    levelBadge.classList.add(targetClass);
  }

  /**
   * Helper to encode characters to avoid XSS injections
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
