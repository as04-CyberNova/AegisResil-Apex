/**
 * AegisResil Apex — Internship Match Score Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const jobTextarea = document.getElementById('match-job-desc');
  const skillsTextarea = document.getElementById('match-skills-input');
  
  const btnCalculate = document.getElementById('btn-calculate-match');
  const btnClear = document.getElementById('btn-clear-match');
  
  const loadingSection = document.getElementById('match-loading');
  const resultsSection = document.getElementById('match-results');
  
  const scoreNum = document.getElementById('match-score-num');
  const gaugeFill = document.getElementById('match-gauge-fill');
  const levelBadge = document.getElementById('match-level-badge');
  
  const matchedBox = document.getElementById('match-matched-skills-box');
  const gapsBox = document.getElementById('match-skill-gaps-box');
  const recommendationBox = document.getElementById('match-recommendation-box');

  const GAUGE_CIRCUMFERENCE = 251.2;

  // Clear button handler
  btnClear.addEventListener('click', () => {
    jobTextarea.value = '';
    if (skillsTextarea) skillsTextarea.value = '';
    
    jobTextarea.disabled = false;
    if (skillsTextarea) skillsTextarea.disabled = false;
    
    btnCalculate.disabled = true;
    btnClear.disabled = false;

    resultsSection.style.display = 'none';
    loadingSection.style.display = 'none';
  });

  // Submit button handler
  btnCalculate.addEventListener('click', async () => {
    const jobDescription = jobTextarea.value.trim();
    if (jobDescription.length < 10) return;

    const resumeText = sessionStorage.getItem('aegisresil_resume_text') || '';
    const skillsText = skillsTextarea ? skillsTextarea.value.trim() : '';

    // Disable inputs & show loading state
    jobTextarea.disabled = true;
    if (skillsTextarea) skillsTextarea.disabled = true;
    btnCalculate.disabled = true;
    btnClear.disabled = true;

    resultsSection.style.display = 'none';
    loadingSection.style.display = 'flex';

    try {
      const response = await fetch('/api/match-internship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobDescription, resumeText, skillsText })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server error during fit calculation');
      }

      const result = await response.json();

      // Save match check results into storage
      window.StorageManager.saveScan('match', result, 'Internship Fit Match check');

      // Render results
      renderResults(result);

    } catch (error) {
      console.error('Error matching internship:', error);
      alert(`Fit Calculation Failed: ${error.message}\nMake sure the local server is running.`);
      resultsSection.style.display = 'none';
    } finally {
      jobTextarea.disabled = false;
      if (skillsTextarea) skillsTextarea.disabled = false;
      btnCalculate.disabled = false;
      btnClear.disabled = false;
      loadingSection.style.display = 'none';
    }
  });

  function renderResults(data) {
    const score = data.match_score || 0;
    
    // Update Score text
    scoreNum.textContent = score;

    // Animate circular gauge fill ring
    const percentage = score / 100;
    const offset = GAUGE_CIRCUMFERENCE - (percentage * GAUGE_CIRCUMFERENCE);
    gaugeFill.style.strokeDashoffset = offset;

    // Calibrate level badge color classes (Job Match >= 70 safe (green), 45-69 warning (orange), <45 danger (red))
    levelBadge.className = 'badge-level'; // Reset classes
    let colorClass = 'level-high';
    let label = 'Unsatisfactory Fit';
    if (score >= 70) {
      colorClass = 'level-low';
      label = 'Strong Match';
    } else if (score >= 45) {
      colorClass = 'level-medium';
      label = 'Moderate Match';
    }
    levelBadge.classList.add(colorClass);
    levelBadge.textContent = label;

    // Set Gauge color
    if (score >= 70) {
      gaugeFill.style.stroke = 'var(--color-safe)';
    } else if (score >= 45) {
      gaugeFill.style.stroke = 'var(--color-warning)';
    } else {
      gaugeFill.style.stroke = 'var(--color-danger)';
    }

    // Matched skills tags
    matchedBox.innerHTML = '';
    if (data.matched_skills && data.matched_skills.length > 0) {
      data.matched_skills.forEach(skill => {
        const span = document.createElement('span');
        span.className = 'keyword-tag';
        span.style.background = 'rgba(16, 185, 129, 0.05)';
        span.style.borderColor = 'rgba(16, 185, 129, 0.15)';
        span.style.color = 'var(--color-safe)';
        span.innerHTML = `✔ ${escapeHtml(skill)}`;
        matchedBox.appendChild(span);
      });
    } else {
      matchedBox.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No overlapping skills identified.</span>';
    }

    // Skill gaps tags
    gapsBox.innerHTML = '';
    if (data.skill_gaps && data.skill_gaps.length > 0) {
      data.skill_gaps.forEach(gap => {
        const span = document.createElement('span');
        span.className = 'keyword-tag clickable-skill-tag';
        span.setAttribute('data-skill', gap);
        span.style.background = 'rgba(239, 68, 68, 0.05)';
        span.style.borderColor = 'rgba(239, 68, 68, 0.15)';
        span.style.color = 'var(--color-danger)';
        span.innerHTML = `✘ ${escapeHtml(gap)}`;
        gapsBox.appendChild(span);
      });
    } else {
      gapsBox.innerHTML = '<span style="color: var(--color-safe); font-size: 0.85rem; font-weight: 600;">No significant skill gaps identified!</span>';
    }

    // Recommendation text
    recommendationBox.textContent = data.recommendation || 'No guidance details received.';

    // Show Results panel
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
