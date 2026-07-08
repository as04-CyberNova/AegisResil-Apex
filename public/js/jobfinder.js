/**
 * aegisresil-apex — Job Openings Finder Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {

  const jobfinderForm = document.getElementById('jobfinder-form');
  const jobfinderLoading = document.getElementById('jobfinder-loading');
  const jobfinderResults = document.getElementById('jobfinder-results');

  const jfRole = document.getElementById('jf-role');
  const jfLocation = document.getElementById('jf-location');
  const jfExperience = document.getElementById('jf-experience');
  const jfSalary = document.getElementById('jf-salary');
  const jfType = document.getElementById('jf-type');
  const jfIndustry = document.getElementById('jf-industry');

  const btnSubmit = document.getElementById('btn-jobfinder-submit');

  const matchesGrid = document.getElementById('jobfinder-matches-grid');
  const altTitlesContainer = document.getElementById('jobfinder-alt-titles');
  const tableBody = document.getElementById('jobfinder-table-body');

  if (jobfinderForm) {
    jobfinderForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const role = jfRole.value.trim();
      const location = jfLocation.value.trim();
      const experience = jfExperience.value.trim();
      const expectedSalary = jfSalary.value.trim();
      const employmentType = jfType.value.trim();
      const industryPreference = jfIndustry.value.trim();

      if (!role || !location) {
        alert('Please fill out the required fields.');
        return;
      }

      // Toggle views
      jobfinderForm.style.display = 'none';
      jobfinderResults.style.display = 'none';
      jobfinderLoading.style.display = 'flex';

      try {
        const response = await fetch('/api/job-finder/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role,
            location,
            experience,
            expectedSalary,
            employmentType,
            industryPreference
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server failed to query listings');
        }

        const data = await response.json();
        renderResults(data);

      } catch (err) {
        console.error(err);
        alert(`Job search failed: ${err.message}`);
        jobfinderForm.style.display = 'flex';
      } finally {
        jobfinderLoading.style.display = 'none';
      }
    });
  }

  function renderResults(data) {
    // 1. RENDER TOP 3 HIGHLIGHTS
    matchesGrid.innerHTML = '';
    if (data.top_matches && data.top_matches.length > 0) {
      data.top_matches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.background = 'rgba(0, 242, 254, 0.02)';
        card.style.borderColor = 'var(--border-glow)';
        card.style.padding = '1.25rem';
        card.style.position = 'relative';

        card.innerHTML = `
          <span style="position: absolute; top: 0.75rem; right: 0.75rem; font-size: 1.1rem;">🔥</span>
          <h5 style="color: var(--primary); font-family: var(--font-header); font-weight: 800; font-size: 1rem; margin-bottom: 0.25rem;">
            ${escapeHtml(match.title)}
          </h5>
          <p style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; margin-bottom: 0.75rem;">
            ${escapeHtml(match.company)}
          </p>
          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45;">
            <strong>Match Reason:</strong> ${escapeHtml(match.reason)}
          </p>
        `;
        matchesGrid.appendChild(card);
      });
    } else {
      matchesGrid.innerHTML = '<p style="color: var(--text-muted);">No matches computed.</p>';
    }

    // 2. RENDER ALTERNATE TITLES
    altTitlesContainer.innerHTML = '';
    if (data.alternate_titles && data.alternate_titles.length > 0) {
      data.alternate_titles.forEach(title => {
        const chip = document.createElement('span');
        chip.style.padding = '0.35rem 0.85rem';
        chip.style.background = 'rgba(255,255,255,0.03)';
        chip.style.border = '1px solid var(--border-light)';
        chip.style.borderRadius = '20px';
        chip.style.fontSize = '0.8rem';
        chip.style.color = 'var(--text-secondary)';
        chip.style.cursor = 'pointer';
        chip.style.transition = 'var(--transition)';

        chip.textContent = title;
        chip.addEventListener('mouseenter', () => {
          chip.style.borderColor = 'var(--primary)';
          chip.style.color = 'var(--primary)';
        });
        chip.addEventListener('mouseleave', () => {
          chip.style.borderColor = 'var(--border-light)';
          chip.style.color = 'var(--text-secondary)';
        });
        chip.addEventListener('click', () => {
          jfRole.value = title;
          // Reset view and let them search easily
          jobfinderResults.style.display = 'none';
          jobfinderForm.style.display = 'flex';
          jobfinderForm.scrollIntoView({ behavior: 'smooth' });
        });

        altTitlesContainer.appendChild(chip);
      });
    }

    // 3. RENDER TABLE OF TOP 10 Results
    tableBody.innerHTML = '';
    if (data.jobs && data.jobs.length > 0) {
      data.jobs.forEach(job => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light)';

        tr.innerHTML = `
          <td style="padding: 1rem; font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(job.title)}</td>
          <td style="padding: 1rem; font-size: 0.88rem; color: var(--text-secondary);">${escapeHtml(job.company)}</td>
          <td style="padding: 1rem; font-size: 0.88rem; color: var(--text-secondary);">${escapeHtml(job.location)}</td>
          <td style="padding: 1rem; font-size: 0.88rem; color: var(--primary); font-weight: 600;">${escapeHtml(job.salary)}</td>
          <td style="padding: 1rem; font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(job.date_posted)}</td>
          <td style="padding: 1rem; text-align: center;">
            <a href="${escapeHtml(job.apply_link)}" target="_blank" class="btn" style="padding: 0.35rem 0.85rem; font-size: 0.78rem; font-weight: 700; background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.25); color: var(--primary); text-decoration: none; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; transition: var(--transition);">
              Apply Direct
            </a>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    } else {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No job openings matched current criteria.</td></tr>';
    }

    // Add back button below the results to let them search again
    let btnBack = document.getElementById('btn-jobfinder-back');
    if (!btnBack) {
      btnBack = document.createElement('button');
      btnBack.id = 'btn-jobfinder-back';
      btnBack.className = 'btn';
      btnBack.style.marginTop = '2rem';
      btnBack.style.background = 'rgba(255,255,255,0.03)';
      btnBack.style.border = '1px solid var(--border-light)';
      btnBack.style.color = 'var(--text-primary)';
      btnBack.style.padding = '0.6rem 2rem';
      btnBack.textContent = 'Back to Search Form';
      btnBack.addEventListener('click', () => {
        jobfinderResults.style.display = 'none';
        jobfinderForm.style.display = 'flex';
      });
      jobfinderResults.appendChild(btnBack);
    }

    jobfinderResults.style.display = 'block';
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
