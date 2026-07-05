/**
 * AegisResil Apex — Career Roadmap Generator Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const selectLevel = document.getElementById('roadmap-skill-level');
  const roleInput = document.getElementById('roadmap-target-role');
  const durationInput = document.getElementById('roadmap-timeline-months');
  
  const btnGenerate = document.getElementById('btn-generate-roadmap');
  const btnClear = document.getElementById('btn-clear-roadmap');
  
  const loadingSection = document.getElementById('roadmap-loading');
  const resultsSection = document.getElementById('roadmap-results');
  
  const milestonesList = document.getElementById('roadmap-milestones-list');
  const timelineContainer = document.getElementById('roadmap-timeline-container');

  // Input validation
  const validateInputs = () => {
    btnGenerate.disabled = roleInput.value.trim().length < 2;
  };
  roleInput.addEventListener('input', validateInputs);

  // Clear button handler
  btnClear.addEventListener('click', () => {
    roleInput.value = '';
    durationInput.value = '3';
    selectLevel.value = 'beginner';
    btnGenerate.disabled = true;

    roleInput.disabled = false;
    durationInput.disabled = false;
    selectLevel.disabled = false;
    btnGenerate.disabled = true;
    btnClear.disabled = false;

    resultsSection.style.display = 'none';
    loadingSection.style.display = 'none';
  });

  // Submit button handler
  btnGenerate.addEventListener('click', async () => {
    const targetRole = roleInput.value.trim();
    if (targetRole.length < 2) return;

    const skillLevel = selectLevel.value;
    const timelineMonths = durationInput.value;
    const resumeText = sessionStorage.getItem('aegisresil_resume_text') || '';

    // Disable inputs & show loading state
    selectLevel.disabled = true;
    roleInput.disabled = true;
    durationInput.disabled = true;
    btnGenerate.disabled = true;
    btnClear.disabled = true;

    resultsSection.style.display = 'none';
    loadingSection.style.display = 'flex';

    try {
      const response = await fetch('/api/generate-roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skillLevel, targetRole, resumeText, timelineMonths })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server error during roadmap generation');
      }

      const result = await response.json();

      // Save roadmap run to Storage Manager
      window.StorageManager.saveScan('roadmap', result, `${targetRole} Study Curriculum (${timelineMonths}m)`);

      // Render results
      renderRoadmap(result);

    } catch (error) {
      console.error('Error generating roadmap:', error);
      alert(`Roadmap Generation Failed: ${error.message}\nMake sure the local server is running.`);
      resultsSection.style.display = 'none';
    } finally {
      selectLevel.disabled = false;
      roleInput.disabled = false;
      durationInput.disabled = false;
      btnGenerate.disabled = false;
      btnClear.disabled = false;
      loadingSection.style.display = 'none';
    }
  });

  function renderRoadmap(data) {
    // Milestones
    milestonesList.innerHTML = '';
    if (data.key_milestones && data.key_milestones.length > 0) {
      data.key_milestones.forEach(m => {
        const li = document.createElement('li');
        li.textContent = m;
        milestonesList.appendChild(li);
      });
    } else {
      milestonesList.innerHTML = '<li>Complete monthly study segments.</li>';
    }

    // Timeline cards
    timelineContainer.innerHTML = '';
    if (data.roadmap && data.roadmap.length > 0) {
      timelineContainer.className = 'timeline-container';
      timelineContainer.innerHTML = data.roadmap.map(step => {
        const tasksLi = step.tasks.map(t => `<li>${escapeHtml(t)}</li>`).join('');
        const resourcesSpan = step.resources.map(r => `
          <span class="keyword-tag clickable-skill-tag" data-skill="${escapeHtml(r)}" style="background: rgba(79, 172, 254, 0.04); border: 1px solid rgba(79, 172, 254, 0.15); color: var(--secondary); font-size: 0.75rem;">
            📚 ${escapeHtml(r)}
          </span>
        `).join('');

        return `
          <div class="timeline-step">
            <div class="step-indicator">${step.month}</div>
            <div class="card step-card" style="margin-bottom: 0;">
              <h4>${escapeHtml(step.focus_area)}</h4>
              <div class="step-tasks" style="margin-bottom: 1.25rem;">
                <h5 style="color: var(--primary); font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.02em;">Recommended Milestones:</h5>
                <ul class="ats-list" style="font-size: 0.92rem; flex-direction: column; gap: 0.35rem;">
                  ${tasksLi}
                </ul>
              </div>
              <div class="step-resources">
                <h5 style="color: var(--secondary); font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.02em;">Suggested Resources:</h5>
                <div class="keyword-tag-container" style="gap: 0.5rem;">
                  ${resourcesSpan}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      timelineContainer.innerHTML = '<p style="color: var(--text-muted);">No roadmap stages generated.</p>';
    }

    resultsSection.style.display = 'block';
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
