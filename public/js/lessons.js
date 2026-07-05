/**
 * AegisResil Apex — Skill Gap Micro-Lessons Manager
 * Intercepts skill gaps clicks, queries lessons API (with grounding), and caches locally.
 */

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('skill-lesson-modal');
  const btnClose = document.getElementById('btn-close-lesson-modal');
  const loading = document.getElementById('lesson-modal-loading');
  const content = document.getElementById('lesson-modal-content');

  const titleEl = document.getElementById('lesson-skill-name');
  const explainerEl = document.getElementById('lesson-explainer');
  const exercisesEl = document.getElementById('lesson-exercises-list');
  const resourcesEl = document.getElementById('lesson-resources-list');

  // Unified Lessons Manager object
  window.LessonsManager = {
    async openLesson(skillName) {
      if (!skillName) return;
      
      // Clean names
      const cleanSkill = skillName.replace(/^[\s•\d.-]+/, '').trim();
      if (cleanSkill.length === 0) return;

      // Show modal in loading mode
      modal.style.display = 'flex';
      loading.style.display = 'flex';
      content.style.display = 'none';

      titleEl.textContent = `Skill Micro-Lesson: ${cleanSkill}`;

      const cacheKey = `aegisresil_lesson_v1_${cleanSkill.toLowerCase()}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          renderLesson(parsed);
          return;
        } catch (e) {
          console.warn('Error reading lesson cache:', e);
        }
      }

      // Fetch from API
      try {
        const response = await fetch('/api/skill-lesson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ skillName: cleanSkill })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server failed to build lesson');
        }

        const data = await response.json();

        // Write cache
        localStorage.setItem(cacheKey, JSON.stringify(data));
        
        // Log operation to stats history
        window.StorageManager.saveScan('lesson', data, `Micro Lesson: ${cleanSkill}`);

        renderLesson(data);
      } catch (error) {
        console.error('Error fetching skill lesson:', error);
        explainerEl.textContent = `Error compiling micro-lesson: ${error.message}. Please try again later.`;
        exercisesEl.innerHTML = '';
        resourcesEl.innerHTML = '';
        loading.style.display = 'none';
        content.style.display = 'block';
      }
    }
  };

  function renderLesson(data) {
    // Concept Explainer
    explainerEl.textContent = data.explainer || 'No details provided.';

    // Exercises
    exercisesEl.innerHTML = '';
    if (data.practice_exercises && data.practice_exercises.length > 0) {
      data.practice_exercises.forEach(ex => {
        const difficultyClass = ex.difficulty === 'beginner' ? 'level-low' : (ex.difficulty === 'advanced' ? 'level-high' : 'level-medium');
        
        const card = document.createElement('div');
        card.style.background = 'rgba(255, 255, 255, 0.02)';
        card.style.border = '1px solid var(--border-light)';
        card.style.borderRadius = '8px';
        card.style.padding = '0.85rem';
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <strong style="font-size: 0.9rem; color: var(--text-primary);">${escapeHtml(ex.title)}</strong>
            <span class="badge-level ${difficultyClass}" style="padding: 0.15rem 0.5rem; font-size: 0.7rem;">${ex.difficulty}</span>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4;">${escapeHtml(ex.description)}</p>
        `;
        exercisesEl.appendChild(card);
      });
    } else {
      exercisesEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">No practice exercises compiled.</p>';
    }

    // Resources
    resourcesEl.innerHTML = '';
    if (data.resources && data.resources.length > 0) {
      data.resources.forEach(res => {
        let typeBadge = `<span class="badge-level level-medium" style="padding: 0.15rem 0.5rem; font-size: 0.7rem; text-transform: uppercase;">${res.type}</span>`;
        
        const card = document.createElement('div');
        card.style.background = 'rgba(255, 255, 255, 0.01)';
        card.style.border = '1px solid rgba(255,255,255,0.05)';
        card.style.borderRadius = '8px';
        card.style.padding = '0.75rem';
        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            ${typeBadge}
            <strong style="font-size: 0.85rem; color: var(--primary);">${escapeHtml(res.title)}</strong>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.35; font-style: italic;">
            🔎 Search for this resource: "${escapeHtml(res.note)}"
          </p>
        `;
        resourcesEl.appendChild(card);
      });
    } else {
      resourcesEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">No custom resources suggested.</p>';
    }

    loading.style.display = 'none';
    content.style.display = 'block';
  }

  // Intercept tags clicks globally
  document.addEventListener('click', (e) => {
    const tag = e.target.closest('.clickable-skill-tag');
    if (tag) {
      const skillName = tag.getAttribute('data-skill') || tag.textContent.trim();
      window.LessonsManager.openLesson(skillName);
    }
  });

  // Modal actions
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
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
