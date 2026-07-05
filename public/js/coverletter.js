/**
 * AegisResil Apex — Cover Letter & Application Message Generator Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('coverletter-form');
  const toneSelect = document.getElementById('coverletter-tone');
  const jobTextarea = document.getElementById('coverletter-job-desc');
  const backgroundTextarea = document.getElementById('coverletter-background');
  
  const resumeBadge = document.getElementById('coverletter-resume-badge');
  const backgroundGroup = document.getElementById('coverletter-background-group');
  
  const btnGenerate = document.getElementById('btn-generate-coverletter');
  const btnCopy = document.getElementById('btn-copy-coverletter');

  const loadingSection = document.getElementById('coverletter-loading');
  const resultsSection = document.getElementById('coverletter-results-card');

  const draftResultTextarea = document.getElementById('coverletter-draft-result');
  const highlightsList = document.getElementById('coverletter-highlights-list');

  // Verify and sync active resume from session storage
  window.checkCoverLetterContext = function() {
    const resumeText = sessionStorage.getItem('aegisresil_resume_text');
    if (resumeText && resumeText.trim().length > 50) {
      if (resumeBadge) resumeBadge.style.display = 'block';
      if (backgroundGroup) backgroundGroup.style.display = 'none';
      if (backgroundTextarea) backgroundTextarea.required = false;
    } else {
      if (resumeBadge) resumeBadge.style.display = 'none';
      if (backgroundGroup) backgroundGroup.style.display = 'block';
      if (backgroundTextarea) backgroundTextarea.required = true;
    }
  };

  // Submit form generator trigger
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const jobDescription = jobTextarea.value.trim();
      if (jobDescription.length < 10) {
        alert('Please enter a valid job description (at least 10 characters).');
        return;
      }

      const syncResume = sessionStorage.getItem('aegisresil_resume_text') || '';
      const hasSyncedResume = syncResume.trim().length > 50;

      const backgroundText = hasSyncedResume ? syncResume : backgroundTextarea.value.trim();
      if (!hasSyncedResume && backgroundText.length < 10) {
        alert('Please provide some background details or copy your resume text.');
        return;
      }

      const format = toneSelect.value; // 'formal' or 'short'

      // Show loader
      resultsSection.style.display = 'none';
      loadingSection.style.display = 'flex';
      btnGenerate.disabled = true;

      try {
        const response = await fetch('/api/generate-cover-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ backgroundText, jobDescription, format })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server failed to write application draft');
        }

        const data = await response.json();

        // Truncate job title for history label
        const rawLines = jobDescription.split('\n');
        const firstLine = rawLines[0].trim().substring(0, 30);
        const historyLabel = `Cover Letter (${format}): ${firstLine || 'Job Spec'}`;

        // Save scan using Unified Storage
        window.StorageManager.saveScan('coverletter', data, historyLabel);

        // Render results
        draftResultTextarea.value = data.draft || '';
        
        highlightsList.innerHTML = '';
        if (data.key_points_highlighted && data.key_points_highlighted.length > 0) {
          data.key_points_highlighted.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point;
            highlightsList.appendChild(li);
          });
        } else {
          highlightsList.innerHTML = '<li>Tailored to match keywords automatically.</li>';
        }

        loadingSection.style.display = 'none';
        resultsSection.style.display = 'block';

      } catch (error) {
        console.error('Error generating cover letter:', error);
        alert(`Drafting Failed: ${error.message}\nMake sure the local server is running.`);
        loadingSection.style.display = 'none';
      } finally {
        btnGenerate.disabled = false;
      }
    });
  }

  // Copy Draft Clipboard click bindings
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const textToCopy = draftResultTextarea.value;
      if (!textToCopy) return;

      navigator.clipboard.writeText(textToCopy).then(() => {
        const origContent = btnCopy.innerHTML;
        btnCopy.innerHTML = 'Copied! ✔';
        btnCopy.style.background = 'var(--color-safe)';
        btnCopy.style.borderColor = 'var(--color-safe)';

        setTimeout(() => {
          btnCopy.innerHTML = origContent;
          btnCopy.style.background = '';
          btnCopy.style.borderColor = '';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text draft:', err);
      });
    });
  }

  // Initial check
  window.checkCoverLetterContext();
});
