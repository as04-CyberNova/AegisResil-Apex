/**
 * AegisResil Apex — Company Trust Analyzer Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const companyInput = document.getElementById('trust-company-name');
  const websiteInput = document.getElementById('trust-website-url');
  const textInput = document.getElementById('trust-job-text');
  
  const btnAnalyze = document.getElementById('btn-analyze-trust');
  const btnClear = document.getElementById('btn-clear-trust');
  
  const loadingSection = document.getElementById('trust-loading');
  const resultsSection = document.getElementById('trust-results');
  
  const scoreNum = document.getElementById('trust-score-num');
  const gaugeFill = document.getElementById('trust-gauge-fill');
  const levelBadge = document.getElementById('trust-level-badge');
  const signalsList = document.getElementById('trust-signals-list');
  const caveatsList = document.getElementById('trust-caveats-list');
  const recommendationBox = document.getElementById('trust-recommendation-box');
  
  const citationsSection = document.getElementById('citations-section');
  const citationsList = document.getElementById('trust-citations-list');
  const groundingBadgeContainer = document.getElementById('grounding-badge-container');

  const GAUGE_CIRCUMFERENCE = 251.2;

  // Listen for typing events to enable button
  const checkInputs = () => {
    btnAnalyze.disabled = companyInput.value.trim().length < 2;
  };
  companyInput.addEventListener('input', checkInputs);

  // Clear button handler
  btnClear.addEventListener('click', () => {
    companyInput.value = '';
    websiteInput.value = '';
    textInput.value = '';
    btnAnalyze.disabled = true;
    
    companyInput.disabled = false;
    websiteInput.disabled = false;
    textInput.disabled = false;
    btnAnalyze.disabled = true;
    btnClear.disabled = false;
    
    resultsSection.style.display = 'none';
    loadingSection.style.display = 'none';
  });

  // Submit button handler
  btnAnalyze.addEventListener('click', async () => {
    const companyName = companyInput.value.trim();
    if (companyName.length < 2) return;

    const websiteUrl = websiteInput.value.trim();
    const jobText = textInput.value.trim();

    // Disable inputs & show loading state
    companyInput.disabled = true;
    websiteInput.disabled = true;
    textInput.disabled = true;
    btnAnalyze.disabled = true;
    btnClear.disabled = true;
    
    resultsSection.style.display = 'none';
    loadingSection.style.display = 'flex';

    try {
      const response = await fetch('/api/analyze-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyName, websiteUrl, jobText })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server error during trust analysis');
      }

      const result = await response.json();

      // Save check into Unified Storage Manager
      window.StorageManager.saveScan('trust', result, companyName);

      // Render results
      renderResults(result);

    } catch (error) {
      console.error('Error analyzing company:', error);
      alert(`Analysis Failed: ${error.message}\nMake sure the local server is running.`);
      resultsSection.style.display = 'none';
    } finally {
      companyInput.disabled = false;
      websiteInput.disabled = false;
      textInput.disabled = false;
      btnAnalyze.disabled = false;
      btnClear.disabled = false;
      loadingSection.style.display = 'none';
    }
  });

  function renderResults(data) {
    const score = data.trust_score || 0;
    
    // Update Score Indicator text
    scoreNum.textContent = score;

    // Animate circular gauge fill ring
    // offset = GAUGE_CIRCUMFERENCE - (percentage * GAUGE_CIRCUMFERENCE)
    const percentage = score / 100;
    const offset = GAUGE_CIRCUMFERENCE - (percentage * GAUGE_CIRCUMFERENCE);
    gaugeFill.style.strokeDashoffset = offset;

    // Calibrate badge colors (Trust score >= 80 safe (emerald), 40-79 warning (orange), <40 danger (red))
    levelBadge.className = 'badge-level'; // Reset classes
    let colorClass = 'level-high';
    if (score >= 80) colorClass = 'level-low';
    else if (score >= 40) colorClass = 'level-medium';
    levelBadge.classList.add(colorClass);
    levelBadge.textContent = data.confidence_level ? `${data.confidence_level} Confidence` : 'Evaluated';

    // Set Gauge color
    if (score >= 80) {
      gaugeFill.style.stroke = 'var(--color-safe)';
    } else if (score >= 40) {
      gaugeFill.style.stroke = 'var(--color-warning)';
    } else {
      gaugeFill.style.stroke = 'var(--color-danger)';
    }

    // Grounding Indicator Badge
    if (data.search_grounded) {
      groundingBadgeContainer.innerHTML = `
        <span class="history-badge level-low" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: var(--color-safe); font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          Google Search Grounded
        </span>
      `;
    } else {
      groundingBadgeContainer.innerHTML = `
        <span class="history-badge level-medium" style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); color: var(--color-warning); font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></svg>
          AI Reasoning Mode
        </span>
      `;
    }

    // Checked Signals list
    signalsList.innerHTML = '';
    if (data.signals_checked && data.signals_checked.length > 0) {
      data.signals_checked.forEach(signal => {
        const li = document.createElement('li');
        li.textContent = signal;
        signalsList.appendChild(li);
      });
    } else {
      signalsList.innerHTML = '<li>No specific signals listed.</li>';
    }

    // Caveats & warnings
    caveatsList.innerHTML = '';
    if (data.caveats && data.caveats.length > 0) {
      data.caveats.forEach(caveat => {
        const li = document.createElement('li');
        li.textContent = caveat;
        caveatsList.appendChild(li);
      });
    } else {
      caveatsList.innerHTML = '<li>No caveats flagged. Make sure to perform manual checks.</li>';
    }

    // Recommendation summary box
    recommendationBox.textContent = data.recommendation || 'No guidance summary received.';

    // Search Citations tags list
    citationsList.innerHTML = '';
    if (data.search_grounded && data.search_citations && data.search_citations.length > 0) {
      citationsSection.style.display = 'block';
      data.search_citations.forEach(cit => {
        const a = document.createElement('a');
        a.href = cit.uri;
        a.target = '_blank';
        a.className = 'keyword-tag';
        a.style.textDecoration = 'none';
        a.style.display = 'inline-flex';
        a.style.alignItems = 'center';
        a.style.gap = '0.35rem';
        a.style.background = 'rgba(255, 255, 255, 0.03)';
        a.style.borderColor = 'var(--border-light)';
        a.style.color = 'var(--text-secondary)';
        
        a.innerHTML = `
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          ${escapeHtml(cit.title || 'Source')}
        `;
        citationsList.appendChild(a);
      });
    } else {
      citationsSection.style.display = 'none';
    }

    // Display Results panel
    resultsSection.style.display = 'grid';
  }

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
