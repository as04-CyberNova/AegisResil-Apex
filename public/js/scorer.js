/**
 * AegisResil Apex — Resume Scorer Handler (PDF.js text extraction & client integration)
 */

document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('resume-dropzone');
  const fileInput = document.getElementById('resume-file-input');
  const parseStatus = document.getElementById('parse-status');
  const filenameText = document.getElementById('parsed-filename');
  const charCountText = document.getElementById('parsed-char-count');
  
  const btnScore = document.getElementById('btn-score-resume');
  const btnClear = document.getElementById('btn-clear-resume');
  
  const loadingSection = document.getElementById('resume-loading');
  const resultsSection = document.getElementById('resume-results');

  // Gauge details elements
  const scoreNum = document.getElementById('resume-score-num');
  const gaugeFill = document.getElementById('resume-score-gauge-fill');
  const levelBadge = document.getElementById('resume-level-badge');
  const atsList = document.getElementById('resume-ats-list');
  const keywordsBox = document.getElementById('resume-keywords-box');
  const suggestionsList = document.getElementById('resume-suggestions-list');

  // SVG Gauge Circumference: 2 * PI * r = 2 * 3.14159 * 40 = 251.2
  const GAUGE_CIRCUMFERENCE = 251.2;

  let extractedText = '';
  let activeFilename = '';
  let selectedRegion = 'US'; // Default region

  // --- Inject Region Selector UI above the dropzone ---
  function injectRegionSelector() {
    // Guard: only inject if RegionConfig is loaded and dropzone exists
    if (!window.RegionConfig || !dropzone) return;

    // Avoid double injection
    if (document.getElementById('resume-region-selector')) return;

    const savedRegion = window.RegionConfig.getSavedPreference();
    selectedRegion = savedRegion;

    const wrapperDiv = document.createElement('div');
    wrapperDiv.id = 'resume-region-selector';
    wrapperDiv.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    `;

    const label = document.createElement('label');
    label.htmlFor = 'region-select-dropdown';
    label.textContent = 'Target Market:';
    label.style.cssText = `
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      white-space: nowrap;
    `;

    const select = document.createElement('select');
    select.id = 'region-select-dropdown';
    select.style.cssText = `
      background: var(--bg-card);
      color: var(--text-primary);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.82rem;
      font-family: inherit;
      cursor: pointer;
      outline: none;
      min-width: 200px;
    `;

    // Populate options from RegionConfig
    window.RegionConfig.getCodes().forEach(code => {
      const region = window.RegionConfig.get(code);
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${region.label} — ${region.description}`;
      if (code === savedRegion) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      selectedRegion = select.value;
      window.RegionConfig.savePreference(selectedRegion);
      // Clear previous results when region changes
      resultsSection.style.display = 'none';
    });

    wrapperDiv.appendChild(label);
    wrapperDiv.appendChild(select);

    // Insert before the dropzone
    dropzone.parentNode.insertBefore(wrapperDiv, dropzone);
  }

  // Run after DOM is ready
  injectRegionSelector();

  // --- Drag & Drop Event Listeners ---
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('click', (e) => e.stopPropagation());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  ['dragleave', 'dragend'].forEach(type => {
    dropzone.addEventListener(type, () => {
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  // --- Clear Button Handler ---
  btnClear.addEventListener('click', () => {
    fileInput.value = '';
    extractedText = '';
    activeFilename = '';
    sessionStorage.removeItem('aegisresil_resume_text');
    parseStatus.style.display = 'none';
    btnScore.disabled = true;
    resultsSection.style.display = 'none';
    loadingSection.style.display = 'none';
  });

  // --- Score Button Handler ---
  btnScore.addEventListener('click', async () => {
    if (!extractedText || extractedText.trim() === '') return;

    // Toggle loading UI states
    btnScore.disabled = true;
    btnClear.disabled = true;
    resultsSection.style.display = 'none';
    loadingSection.style.display = 'flex';

    try {
      const response = await fetch('/api/score-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: extractedText, region: selectedRegion })
      });

      if (!response.ok) {
        const errPayload = await response.json();
        throw new Error(errPayload.error || 'Server error occurred during resume scoring');
      }

      const scoreResult = await response.json();

      // Save to localStorage
      window.StorageManager.saveScan('resume', scoreResult, activeFilename);

      // Render the result to UI
      renderScoreResults(scoreResult);

    } catch (error) {
      console.error('Error scoring resume:', error);
      alert(`Scoring Failed: ${error.message}\nEnsure the local server is running and check console.`);
      resultsSection.style.display = 'none';
    } finally {
      btnScore.disabled = false;
      btnClear.disabled = false;
      loadingSection.style.display = 'none';
    }
  });

  /**
   * Processes the chosen file, identifies type, and extracts text
   */
  async function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    activeFilename = file.name;

    if (ext !== 'pdf' && ext !== 'txt') {
      alert('Invalid file format. Please upload a PDF or plain text (.txt) file.');
      return;
    }

    // Reset previous states
    extractedText = '';
    btnScore.disabled = true;
    resultsSection.style.display = 'none';
    parseStatus.style.display = 'none';

    // Show parsing status
    filenameText.textContent = `Processing: ${file.name}...`;
    charCountText.textContent = 'Extracting document text content...';
    parseStatus.style.display = 'flex';

    try {
      if (ext === 'txt') {
        extractedText = await readTxtFile(file);
      } else if (ext === 'pdf') {
        extractedText = await readPdfFile(file);
      }

      const textLength = extractedText.trim().length;

      if (textLength < 50) {
        throw new Error('Document is too short or contains no readable text characters.');
      }

      sessionStorage.setItem('aegisresil_resume_text', extractedText);

      // Update successful parse state
      filenameText.textContent = `Selected: ${file.name}`;
      charCountText.textContent = `Parsed ${textLength.toLocaleString()} text characters. Ready to score.`;
      btnScore.disabled = false;

    } catch (err) {
      console.error('File parsing error:', err);
      filenameText.textContent = 'Parsing Failed';
      charCountText.textContent = err.message || 'Unable to read this file.';
      parseStatus.style.display = 'flex';
      btnScore.disabled = true;
    }
  }

  /**
   * Reads plain text file asynchronously
   */
  function readTxtFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  /**
   * Parses PDF binary contents asynchronously using PDF.js
   */
  function readPdfFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target.result);
          
          // PDFJS loader
          const loadingTask = pdfjsLib.getDocument(typedarray);
          const pdf = await loadingTask.promise;
          
          let parsedText = '';
          
          // Loop through each PDF page and append text strings
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageStrings = textContent.items.map(item => item.str);
            parsedText += pageStrings.join(' ') + '\n';
          }
          
          resolve(parsedText);
        } catch (err) {
          reject(new Error('PDF.js text extraction failed. The file may be password protected or corrupted.'));
        }
      };
      
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Renders the Gemini rating outcomes to the UI elements
   */
  function renderScoreResults(result) {
    const score = Math.max(0, Math.min(100, result.overall_score));
    const atsNotes = result.ats_compatibility_notes || [];
    const keywords = result.missing_keywords || [];
    const suggestions = result.suggestions || [];
    const complianceViolations = result.compliance_violations || [];
    const regionalNotes = result.regional_notes || [];
    const region = result.region || selectedRegion || 'US';
    const regionMeta = window.RegionConfig ? window.RegionConfig.get(region) : null;

    // Determine category based on score
    let level = 'AVERAGE';
    if (score >= 80) level = 'GOOD';
    else if (score < 60) level = 'NEEDS IMPROVEMENT';

    // 1. Update text content
    scoreNum.textContent = score;
    levelBadge.textContent = level;

    // 2. Animate SVG circular gauge
    const strokeOffset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * score) / 100;
    requestAnimationFrame(() => {
      gaugeFill.style.strokeDashoffset = strokeOffset;
    });

    // 3. Set color coding classes
    applyScoreLevelStyles(score);

    // 4. Render ATS notes
    if (atsNotes.length === 0) {
      atsList.innerHTML = `<li style="list-style:none; color: var(--text-secondary);">&nbsp;✅ No layout or parsing problems found. High compatibility.</li>`;
    } else {
      atsList.innerHTML = atsNotes.map(note => `<li>${escapeHtml(note)}</li>`).join('');
    }

    // 5. Render Keywords Tags
    if (keywords.length === 0) {
      keywordsBox.innerHTML = `<span class="stat-label" style="color: var(--text-secondary);">No major skill gaps identified.</span>`;
    } else {
      keywordsBox.innerHTML = keywords.map(kw => `<span class="keyword-tag">${escapeHtml(kw)}</span>`).join('');
    }

    // 6. Render suggestions
    if (suggestions.length === 0) {
      suggestionsList.innerHTML = `<li style="list-style:none; color: var(--text-secondary);">&nbsp;✅ Excellent content structure. No improvement suggestions.</li>`;
    } else {
      suggestionsList.innerHTML = suggestions.map(sug => `<li>${escapeHtml(sug)}</li>`).join('');
    }

    // 7. Render Compliance Violations panel (HIGH RISK card) — injected dynamically
    let complianceCard = document.getElementById('resume-compliance-card');
    if (complianceViolations.length > 0) {
      if (!complianceCard) {
        complianceCard = document.createElement('div');
        complianceCard.id = 'resume-compliance-card';
        complianceCard.style.cssText = `
          grid-column: 1 / -1;
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 12px;
          padding: 1.1rem 1.3rem;
          margin-top: 0;
        `;
        // Insert before the results grid's first child
        resultsSection.prepend(complianceCard);
      }
      complianceCard.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.7rem;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style="font-weight:700; font-size:0.85rem; color:#ef4444; letter-spacing:0.04em;">⚠️ COMPLIANCE VIOLATIONS — ${regionMeta ? regionMeta.shortLabel : region} REGION</span>
        </div>
        <ul style="margin:0; padding-left:1.2rem; color: #fca5a5; font-size:0.82rem; line-height:1.7;">
          ${complianceViolations.map(v => `<li>${escapeHtml(v)}</li>`).join('')}
        </ul>
      `;
      complianceCard.style.display = 'block';
    } else if (complianceCard) {
      complianceCard.style.display = 'none';
    }

    // 8. Render Regional Notes panel (info card) — injected dynamically
    let regionalCard = document.getElementById('resume-regional-card');
    if (regionalNotes.length > 0) {
      if (!regionalCard) {
        regionalCard = document.createElement('div');
        regionalCard.id = 'resume-regional-card';
        regionalCard.style.cssText = `
          grid-column: 1 / -1;
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          padding: 1.1rem 1.3rem;
          margin-top: 0;
        `;
        resultsSection.appendChild(regionalCard);
      }
      const regionLabel = regionMeta ? `${regionMeta.label} Market` : region;
      regionalCard.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.7rem;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style="font-weight:700; font-size:0.85rem; color:#10b981; letter-spacing:0.04em;">📍 REGIONAL NOTES — ${escapeHtml(regionLabel)}</span>
        </div>
        <ul style="margin:0; padding-left:1.2rem; color: #6ee7b7; font-size:0.82rem; line-height:1.7;">
          ${regionalNotes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
        </ul>
      `;
      regionalCard.style.display = 'block';
    } else if (regionalCard) {
      regionalCard.style.display = 'none';
    }

    // 9. Unhide Results Grid
    resultsSection.style.display = 'grid';
  }

  /**
   * Colors visual meters based on the score threshold values
   */
  function applyScoreLevelStyles(score) {
    const statusClasses = ['level-low', 'level-medium', 'level-high'];
    gaugeFill.classList.remove(...statusClasses);
    scoreNum.classList.remove(...statusClasses);
    levelBadge.classList.remove(...statusClasses);

    let targetClass = 'level-medium'; // Orange / Medium
    if (score >= 80) {
      targetClass = 'level-low'; // Green / Good
    } else if (score < 60) {
      targetClass = 'level-high'; // Red / Needs Improvement
    }

    gaugeFill.classList.add(targetClass);
    scoreNum.classList.add(targetClass);
    levelBadge.classList.add(targetClass);
  }

  /**
   * Escapes special characters to thwart cross-site scripting
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
