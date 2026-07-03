/**
 * CareerShield AI — Resume Scorer Handler (PDF.js text extraction & client integration)
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
    sessionStorage.removeItem('careershield_resume_text');
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
        body: JSON.stringify({ text: extractedText })
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

      sessionStorage.setItem('careershield_resume_text', extractedText);

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

    // 7. Unhide Results Grid
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
