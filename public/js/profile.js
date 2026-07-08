/**
 * aegisresil-apex — LinkedIn Profile Optimizer Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profile-form');
  const headlineInput = document.getElementById('profile-headline');
  const bioTextarea = document.getElementById('profile-bio');
  const btnOptimize = document.getElementById('btn-optimize-profile');
  const btnCopyPost = document.getElementById('btn-copy-profile-post');

  const loadingSection = document.getElementById('profile-loading');
  const resultsContainer = document.getElementById('profile-results-container');

  // Overall circular gauge fields
  const scoreNum = document.getElementById('profile-overall-score');
  const gaugeFill = document.getElementById('profile-overall-gauge-fill');
  const gradeBadge = document.getElementById('profile-grade-badge');

  // Recruiter screening dimension ratings
  const rateAppeal = document.getElementById('profile-rate-appeal');
  const barAppeal = document.getElementById('profile-bar-appeal');
  const rateClarity = document.getElementById('profile-rate-clarity');
  const barClarity = document.getElementById('profile-bar-clarity');
  const rateBranding = document.getElementById('profile-rate-branding');
  const barBranding = document.getElementById('profile-bar-branding');
  const rateKeywords = document.getElementById('profile-rate-keywords');
  const barKeywords = document.getElementById('profile-bar-keywords');
  const rateReadiness = document.getElementById('profile-rate-readiness');
  const barReadiness = document.getElementById('profile-bar-readiness');
  const rateWorthiness = document.getElementById('profile-rate-worthiness');
  const barWorthiness = document.getElementById('profile-bar-worthiness');

  // Feedbacks sections
  const headlineGrade = document.getElementById('profile-headline-grade');
  const headlineFeedback = document.getElementById('profile-headline-feedback');
  const headlineRewrites = document.getElementById('profile-headline-rewrites');

  const bioGrade = document.getElementById('profile-bio-grade');
  const bioFeedback = document.getElementById('profile-bio-feedback');
  const bioRewrites = document.getElementById('profile-bio-rewrites');

  const postDraftTextarea = document.getElementById('profile-post-draft');

  const GAUGE_CIRCUMFERENCE = 251.2;

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const headline = headlineInput.value.trim();
      const bio = bioTextarea.value.trim();

      if (headline.length < 3 && bio.length < 10) {
        alert('Please fill out at least your headline or About bio summaries.');
        return;
      }

      // Transition layouts
      resultsContainer.style.display = 'none';
      loadingSection.style.display = 'flex';
      btnOptimize.disabled = true;

      try {
        const response = await fetch('/api/optimize-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ headline, bio })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server failed to optimize profile data');
        }

        const data = await response.json();

        // Save log check to Storage Manager
        window.StorageManager.saveScan('profile', data, 'LinkedIn Profile Optimization check');

        // Render Results
        renderProfileResults(data);

      } catch (error) {
        console.error('Error optimizing profile:', error);
        alert(`Optimization Failed: ${error.message}\nMake sure the local server is running.`);
        loadingSection.style.display = 'none';
      } finally {
        btnOptimize.disabled = false;
      }
    });
  }

  function renderProfileResults(data) {
    // Average scores calculations
    const score = Math.round(((data.headline_score || 0) + (data.bio_score || 0)) / 2);

    scoreNum.textContent = score;

    const percentage = score / 100;
    const offset = GAUGE_CIRCUMFERENCE - (percentage * GAUGE_CIRCUMFERENCE);
    gaugeFill.style.strokeDashoffset = offset;

    // Badges level
    gradeBadge.className = 'badge-level';
    let colorClass = 'level-high';
    let label = 'Needs Work';
    if (score >= 80) {
      colorClass = 'level-low';
      label = 'Strong Profile';
      gaugeFill.style.stroke = 'var(--color-safe)';
    } else if (score >= 50) {
      colorClass = 'level-medium';
      label = 'Moderate Profile';
      gaugeFill.style.stroke = 'var(--color-warning)';
    } else {
      gaugeFill.style.stroke = 'var(--color-danger)';
    }
    gradeBadge.classList.add(colorClass);
    gradeBadge.textContent = label;

    // Screening ratings bars
    if (data.ratings) {
      const appeal = data.ratings.recruiter_appeal || 0;
      rateAppeal.textContent = `${appeal}%`;
      barAppeal.style.width = `${appeal}%`;

      const clarity = data.ratings.clarity || 0;
      rateClarity.textContent = `${clarity}%`;
      barClarity.style.width = `${clarity}%`;

      const branding = data.ratings.professional_branding || 0;
      rateBranding.textContent = `${branding}%`;
      barBranding.style.width = `${branding}%`;

      const keywords = data.ratings.keyword_optimization || 0;
      rateKeywords.textContent = `${keywords}%`;
      barKeywords.style.width = `${keywords}%`;

      const readiness = data.ratings.internship_readiness || 0;
      rateReadiness.textContent = `${readiness}%`;
      barReadiness.style.width = `${readiness}%`;

      const worthiness = data.ratings.interview_worthiness || 0;
      rateWorthiness.textContent = `${worthiness}%`;
      barWorthiness.style.width = `${worthiness}%`;
    }

    // Headline critiques
    headlineGrade.textContent = `Score: ${data.headline_score}%`;
    
    // Headline level badge color
    headlineGrade.className = 'badge-level';
    if (data.headline_score >= 80) headlineGrade.classList.add('level-low');
    else if (data.headline_score >= 50) headlineGrade.classList.add('level-medium');
    else headlineGrade.classList.add('level-high');

    headlineFeedback.innerHTML = '';
    if (data.headline_feedback && data.headline_feedback.length > 0) {
      data.headline_feedback.forEach(note => {
        const li = document.createElement('li');
        li.textContent = note;
        headlineFeedback.appendChild(li);
      });
    } else {
      headlineFeedback.innerHTML = '<li>Headline metrics look good.</li>';
    }

    headlineRewrites.innerHTML = '';
    if (data.headline_rewrite_suggestions && data.headline_rewrite_suggestions.length > 0) {
      data.headline_rewrite_suggestions.forEach(h => {
        const div = document.createElement('div');
        div.style.background = 'rgba(255, 255, 255, 0.02)';
        div.style.border = '1px solid var(--border-light)';
        div.style.borderRadius = '8px';
        div.style.padding = '0.85rem';
        div.style.fontSize = '0.9rem';
        div.style.color = 'var(--text-primary)';
        div.style.lineHeight = '1.45';
        div.textContent = `"${h}"`;
        headlineRewrites.appendChild(div);
      });
    }

    // Bio summaries critiques
    bioGrade.textContent = `Score: ${data.bio_score}%`;
    
    // Bio level badge color
    bioGrade.className = 'badge-level';
    if (data.bio_score >= 80) bioGrade.classList.add('level-low');
    else if (data.bio_score >= 50) bioGrade.classList.add('level-medium');
    else bioGrade.classList.add('level-high');

    bioFeedback.innerHTML = '';
    if (data.bio_feedback && data.bio_feedback.length > 0) {
      data.bio_feedback.forEach(note => {
        const li = document.createElement('li');
        li.textContent = note;
        bioFeedback.appendChild(li);
      });
    } else {
      bioFeedback.innerHTML = '<li>Bio details look clear.</li>';
    }

    bioRewrites.innerHTML = '';
    if (data.bio_rewrite_suggestions && data.bio_rewrite_suggestions.length > 0) {
      data.bio_rewrite_suggestions.forEach(draft => {
        const div = document.createElement('div');
        div.style.background = 'rgba(255, 255, 255, 0.02)';
        div.style.border = '1px solid var(--border-light)';
        div.style.borderRadius = '8px';
        div.style.padding = '0.85rem';
        div.style.fontSize = '0.88rem';
        div.style.color = 'var(--text-secondary)';
        div.style.lineHeight = '1.5';
        div.style.whiteSpace = 'pre-line';
        div.textContent = draft;
        bioRewrites.appendChild(div);
      });
    }

    // Suggested scannable post
    postDraftTextarea.value = data.suggested_post || '';

    // Swap loading displays
    loadingSection.style.display = 'none';
    resultsContainer.style.display = 'block';
  }

  // Copy Post Draft Clipboard trigger
  if (btnCopyPost) {
    btnCopyPost.addEventListener('click', () => {
      const textToCopy = postDraftTextarea.value;
      if (!textToCopy) return;

      navigator.clipboard.writeText(textToCopy).then(() => {
        const origContent = btnCopyPost.innerHTML;
        btnCopyPost.innerHTML = 'Copied! ✔';
        btnCopyPost.style.background = 'var(--color-safe)';
        btnCopyPost.style.borderColor = 'var(--color-safe)';

        setTimeout(() => {
          btnCopyPost.innerHTML = origContent;
          btnCopyPost.style.background = '#8b5cf6';
          btnCopyPost.style.borderColor = '#8b5cf6';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy post text:', err);
      });
    });
  }

  // ============================================================
  // POST OPTIMIZER SECTION
  // ============================================================

  const postOptimizerForm = document.getElementById('post-optimizer-form');
  const postDraftInput = document.getElementById('post-draft-input');
  const postContextInput = document.getElementById('post-context-input');
  const btnOptimizePost = document.getElementById('btn-optimize-post');

  const postOptimizerLoading = document.getElementById('post-optimizer-loading');
  const postOptimizerResults = document.getElementById('post-optimizer-results');

  const postTypeBadge = document.getElementById('post-type-badge');
  const postWordCount = document.getElementById('post-word-count');
  const postOptimizedOutput = document.getElementById('post-optimized-output');
  const postHookAnalysis = document.getElementById('post-hook-analysis');
  const postImprovementsBlock = document.getElementById('post-improvements-block');
  const postImprovementsList = document.getElementById('post-improvements-list');
  const btnCopyOptimizedPost = document.getElementById('btn-copy-optimized-post');

  if (postOptimizerForm) {
    postOptimizerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const draft = postDraftInput.value.trim();
      const context = postContextInput.value.trim();

      if (draft.length === 0 && context.length === 0) {
        alert('Please provide either an existing post draft or a topic/context to write from.');
        return;
      }

      // Show loading
      postOptimizerResults.style.display = 'none';
      postOptimizerLoading.style.display = 'flex';
      btnOptimizePost.disabled = true;

      try {
        const response = await fetch('/api/optimize-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft, context })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server failed to optimize post');
        }

        const data = await response.json();

        // Render results
        renderPostResults(data, draft.length > 0);

      } catch (error) {
        console.error('Error optimizing post:', error);
        alert(`Post Optimization Failed: ${error.message}\nMake sure the local server is running.`);
        postOptimizerLoading.style.display = 'none';
      } finally {
        btnOptimizePost.disabled = false;
      }
    });
  }

  function renderPostResults(data, hadDraft) {
    // Type badge + word count
    postTypeBadge.textContent = data.post_type || 'LinkedIn Post';
    postWordCount.textContent = data.word_count ? `${data.word_count} words` : '';

    // The optimized post text
    postOptimizedOutput.value = data.optimized_post || '';

    // Hook analysis
    postHookAnalysis.textContent = data.hook_analysis || '';

    // Improvements list (only relevant if a draft was provided)
    postImprovementsList.innerHTML = '';
    if (data.improvements_made && data.improvements_made.length > 0) {
      data.improvements_made.forEach(imp => {
        const li = document.createElement('li');
        li.textContent = imp;
        postImprovementsList.appendChild(li);
      });
      postImprovementsBlock.style.display = 'block';
    } else {
      // No original draft — hide improvements section
      postImprovementsBlock.style.display = hadDraft ? 'block' : 'none';
      if (hadDraft) {
        postImprovementsList.innerHTML = '<li>Post rewritten using the Full Post Framework.</li>';
      }
    }

    postOptimizerLoading.style.display = 'none';
    postOptimizerResults.style.display = 'block';
  }

  // Copy optimized post to clipboard
  if (btnCopyOptimizedPost) {
    btnCopyOptimizedPost.addEventListener('click', () => {
      const text = postOptimizedOutput.value;
      if (!text) return;

      navigator.clipboard.writeText(text).then(() => {
        const orig = btnCopyOptimizedPost.innerHTML;
        btnCopyOptimizedPost.innerHTML = 'Copied! ✔';
        btnCopyOptimizedPost.style.background = 'var(--color-safe)';
        btnCopyOptimizedPost.style.borderColor = 'var(--color-safe)';

        setTimeout(() => {
          btnCopyOptimizedPost.innerHTML = orig;
          btnCopyOptimizedPost.style.background = '#8b5cf6';
          btnCopyOptimizedPost.style.borderColor = '#8b5cf6';
        }, 2200);
      }).catch(err => console.error('Failed to copy optimized post:', err));
    });
  }

});

