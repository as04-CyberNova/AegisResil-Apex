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

  let selectedJurisdiction = null; // null = auto-detect

  // --- Auto-detect jurisdiction from company name + domain as user types ---
  function updateJurisdictionHint() {
    if (!window.RegistryClient) return;
    const name = companyInput.value.trim();
    const url = websiteInput.value.trim();
    if (!name && !url) return;

    const detected = window.RegistryClient.detect(name, url, selectedJurisdiction);
    const jxBadge = document.getElementById('jurisdiction-badge');
    if (jxBadge) {
      jxBadge.textContent = `${detected.registryFlag} ${detected.jurisdiction} — ${detected.registryName}`;
      jxBadge.dataset.jurisdiction = detected.jurisdiction;
    }

    // Only auto-set if user hasn't manually chosen
    if (!selectedJurisdiction) {
      const jxSelect = document.getElementById('jurisdiction-select');
      if (jxSelect && detected.jurisdiction !== 'UNKNOWN') {
        jxSelect.value = detected.jurisdiction;
      }
    }
  }

  // Inject jurisdiction selector below the website input
  function injectJurisdictionSelector() {
    if (!window.RegistryClient) return;
    if (document.getElementById('jurisdiction-selector-row')) return;

    const row = document.createElement('div');
    row.id = 'jurisdiction-selector-row';
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.6rem;
      flex-wrap: wrap;
    `;

    const label = document.createElement('label');
    label.htmlFor = 'jurisdiction-select';
    label.textContent = 'Registry Jurisdiction:';
    label.style.cssText = `font-size:0.78rem; font-weight:600; color:var(--text-secondary); white-space:nowrap;`;

    const select = document.createElement('select');
    select.id = 'jurisdiction-select';
    select.style.cssText = `
      background: var(--bg-card);
      color: var(--text-primary);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 0.38rem 0.75rem;
      font-size: 0.78rem;
      font-family: inherit;
      cursor: pointer;
      outline: none;
    `;

    const autoOpt = document.createElement('option');
    autoOpt.value = '';
    autoOpt.textContent = '🌐 Auto-detect';
    select.appendChild(autoOpt);

    window.RegistryClient.getJurisdictionOptions().forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.code;
      o.textContent = `${opt.flag} ${opt.code} — ${opt.label.replace(opt.flag + ' ', '')}`;
      select.appendChild(o);
    });

    select.addEventListener('change', () => {
      selectedJurisdiction = select.value || null;
    });

    row.appendChild(label);
    row.appendChild(select);

    // Insert after websiteInput
    websiteInput.parentNode.insertAdjacentElement('afterend', row);
  }

  injectJurisdictionSelector();

  // Listen for typing events to enable button
  const checkInputs = () => {
    btnAnalyze.disabled = companyInput.value.trim().length < 2;
    updateJurisdictionHint();
  };
  companyInput.addEventListener('input', checkInputs);
  websiteInput.addEventListener('input', updateJurisdictionHint);

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

    // Determine jurisdiction: manual override or auto-detect
    let jurisdiction = selectedJurisdiction;
    if (!jurisdiction && window.RegistryClient) {
      const detected = window.RegistryClient.detect(companyName, websiteUrl);
      if (detected.jurisdiction !== 'UNKNOWN') jurisdiction = detected.jurisdiction;
    }

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
        body: JSON.stringify({ companyName, websiteUrl, jobText, jurisdiction })
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
    const percentage = score / 100;
    const offset = GAUGE_CIRCUMFERENCE - (percentage * GAUGE_CIRCUMFERENCE);
    gaugeFill.style.strokeDashoffset = offset;

    // Calibrate badge colors
    levelBadge.className = 'badge-level';
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

    // --- Registry Verification Badge (new global feature) ---
    let registryBadgeContainer = document.getElementById('registry-badge-container');
    if (!registryBadgeContainer) {
      registryBadgeContainer = document.createElement('div');
      registryBadgeContainer.id = 'registry-badge-container';
      registryBadgeContainer.style.cssText = `margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;`;
      groundingBadgeContainer.parentNode.insertBefore(registryBadgeContainer, groundingBadgeContainer.nextSibling);
    }

    if (data.registry_source && data.registry_source !== 'AI Reasoning (No Registry Available)') {
      const isVerified = data.registry_verified;
      const registryIcon = isVerified ? '✅' : '❌';
      const registryColor = isVerified ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
      const registryBorder = isVerified ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
      const registryTextColor = isVerified ? 'var(--color-safe)' : 'var(--color-danger)';
      const registryText = isVerified ? 'Registry Verified' : 'Not in Registry';

      registryBadgeContainer.innerHTML = `
        <span style="background:${registryColor}; border:1px solid ${registryBorder}; color:${registryTextColor}; font-size:0.75rem; font-weight:600; display:inline-flex; align-items:center; gap:0.35rem; padding:0.3rem 0.65rem; border-radius:6px;">
          ${registryIcon} ${escapeHtml(registryText)}
        </span>
        <span style="background:rgba(255,255,255,0.04); border:1px solid var(--border-light); color:var(--text-secondary); font-size:0.72rem; font-weight:500; display:inline-flex; align-items:center; gap:0.3rem; padding:0.3rem 0.65rem; border-radius:6px;">
          🏢 ${escapeHtml(data.registry_source)}
        </span>
      `;

      // Registry record detail panel
      let registryPanel = document.getElementById('registry-record-panel');
      if (data.registry_record && isVerified) {
        if (!registryPanel) {
          registryPanel = document.createElement('div');
          registryPanel.id = 'registry-record-panel';
          registryPanel.style.cssText = `
            grid-column: 1 / -1;
            background: rgba(16, 185, 129, 0.04);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 12px;
            padding: 1rem 1.2rem;
            font-size: 0.8rem;
          `;
          resultsSection.appendChild(registryPanel);
        }
        const rec = data.registry_record;
        registryPanel.innerHTML = `
          <div style="font-weight:700; color:#10b981; margin-bottom:0.6rem; font-size:0.82rem;">✅ Live Registry Record — ${escapeHtml(data.registry_source)}</div>
          <div style="display:grid; grid-template-columns: auto 1fr; gap:0.3rem 1rem; color:var(--text-secondary);">
            ${rec.companyNumber ? `<span style="font-weight:600;">Company No.</span><span>${escapeHtml(rec.companyNumber)}</span>` : ''}
            ${rec.status ? `<span style="font-weight:600;">Status</span><span style="color:${rec.status === 'active' ? '#10b981' : '#f59e0b'}; font-weight:600; text-transform:capitalize;">${escapeHtml(rec.status)}</span>` : ''}
            ${rec.companyType ? `<span style="font-weight:600;">Type</span><span>${escapeHtml(rec.companyType.replace(/-/g,' '))}</span>` : ''}
            ${rec.dateOfCreation ? `<span style="font-weight:600;">Incorporated</span><span>${escapeHtml(rec.dateOfCreation)}</span>` : ''}
            ${rec.registeredAddress ? `<span style="font-weight:600;">Address</span><span>${escapeHtml(rec.registeredAddress)}</span>` : ''}
          </div>
        `;
        registryPanel.style.display = 'block';
      } else if (registryPanel) {
        registryPanel.style.display = 'none';
      }
    } else {
      registryBadgeContainer.innerHTML = '';
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
