/**
 * CareerShield AI — LinkedIn Intelligence Suite
 * 8 original tools for LinkedIn profile, content & safety
 */

document.addEventListener('DOMContentLoaded', () => {

  let liTabInitialized = false;

  // ─── Sub-tab routing ────────────────────────────────────────────────────────
  function switchLinkedInSubTab(tabId) {
    document.querySelectorAll('.li-sub-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.litab === tabId);
    });
    document.querySelectorAll('.li-sub-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `li-panel-${tabId}`);
    });
  }

  // ─── Shared helpers ─────────────────────────────────────────────────────────
  function showLoading(wrapperId) {
    const el = document.getElementById(wrapperId);
    if (el) el.style.display = 'flex';
  }
  function hideLoading(wrapperId) {
    const el = document.getElementById(wrapperId);
    if (el) el.style.display = 'none';
  }
  function showResults(wrapperId) {
    const el = document.getElementById(wrapperId);
    if (el) el.style.display = 'block';
  }
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.getElementById('li-copy-toast');
      if (toast) { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }
    });
  }
  function scoreColor(score, max) {
    max = max || 100;
    const pct = score / max;
    if (pct >= 0.7) return 'var(--color-safe)';
    if (pct >= 0.4) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }
  function animateNumber(el, target, duration) {
    duration = duration || 900;
    let start = 0;
    const step = target / (duration / 16);
    const tick = () => {
      start = Math.min(start + step, target);
      el.textContent = Math.round(start);
      if (start < target) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function setGauge(fillId, score, max) {
    max = max || 100;
    const fill = document.getElementById(fillId);
    if (!fill) return;
    const circumference = 251.2;
    const offset = circumference - (score / max) * circumference;
    setTimeout(() => {
      fill.style.strokeDashoffset = offset;
      fill.style.stroke = scoreColor(score, max);
    }, 100);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL 1 — Brand Voice Forge
  // ═══════════════════════════════════════════════════════════════════════════
  function initBrandVoiceForge() {
    const sampleInput = document.getElementById('bvf-sample');
    const topicInput = document.getElementById('bvf-topic');
    const btn = document.getElementById('btn-bvf-forge');
    const results = document.getElementById('bvf-results');
    if (!btn) return;

    const checkBvfInput = () => { btn.disabled = (sampleInput.value.trim().length < 30); };
    sampleInput.addEventListener('input', checkBvfInput);

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      results.style.display = 'none';
      showLoading('bvf-loading');
      try {
        const res = await fetch('/api/linkedin/brand-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ writingSample: sampleInput.value.trim(), topic: topicInput.value.trim() })
        });
        const data = await res.json();
        renderBrandVoice(data);
        showResults('bvf-results');
      } catch (err) {
        alert('Failed to analyze voice. Please try again.');
      } finally {
        hideLoading('bvf-loading');
        btn.disabled = false;
      }
    });
  }

  function renderBrandVoice(data) {
    const dna = data.voice_dna;
    document.getElementById('bvf-dna-tone').textContent = dna.tone;
    document.getElementById('bvf-dna-archetype').textContent = dna.style_archetype;
    document.getElementById('bvf-dna-energy').textContent = dna.energy_level;
    document.getElementById('bvf-dna-summary').textContent = dna.voice_summary;
    const traitsEl = document.getElementById('bvf-dna-traits');
    traitsEl.innerHTML = dna.signature_traits.map(function(t) { return '<li class="li-trait-item">✦ ' + t + '</li>'; }).join('');
    document.getElementById('bvf-post-short').textContent = data.post_short;
    document.getElementById('bvf-post-long').textContent = data.post_long;
    const notesEl = document.getElementById('bvf-auth-notes');
    notesEl.innerHTML = data.authenticity_notes.map(function(n) { return '<li class="li-auth-note">→ ' + n + '</li>'; }).join('');
    document.getElementById('btn-bvf-copy-short').onclick = function() { copyToClipboard(data.post_short); };
    document.getElementById('btn-bvf-copy-long').onclick = function() { copyToClipboard(data.post_long); };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL 2 — Recruiter Radar
  // ═══════════════════════════════════════════════════════════════════════════
  function initRecruiterRadar() {
    const headlineInput = document.getElementById('rr-headline');
    const aboutInput = document.getElementById('rr-about');
    const btn = document.getElementById('btn-rr-analyze');
    if (!btn) return;

    const checkRrInput = () => { btn.disabled = (headlineInput.value.trim().length < 3 && aboutInput.value.trim().length < 10); };
    headlineInput.addEventListener('input', checkRrInput);
    aboutInput.addEventListener('input', checkRrInput);

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      document.getElementById('rr-results').style.display = 'none';
      showLoading('rr-loading');
      try {
        const res = await fetch('/api/linkedin/recruiter-radar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ headline: headlineInput.value.trim(), about: aboutInput.value.trim() })
        });
        const data = await res.json();
        renderRecruiterRadar(data);
        showResults('rr-results');
      } catch (err) {
        alert('Failed to run recruiter simulation. Please try again.');
      } finally {
        hideLoading('rr-loading');
        btn.disabled = false;
      }
    });
  }

  function renderRecruiterRadar(data) {
    document.getElementById('rr-verdict').textContent = '"' + data.first_impression_verdict + '"';
    const scoreEl = document.getElementById('rr-hire-score');
    animateNumber(scoreEl, data.hire_probability);
    scoreEl.style.color = scoreColor(data.hire_probability);
    setGauge('rr-gauge-fill', data.hire_probability);
    document.getElementById('rr-deal-breakers').innerHTML = data.instant_deal_breakers.map(function(f) { return '<li class="li-flag-item danger">⚠ ' + f + '</li>'; }).join('');
    document.getElementById('rr-green-flags').innerHTML = data.instant_green_flags.map(function(f) { return '<li class="li-flag-item safe">✓ ' + f + '</li>'; }).join('');
    document.getElementById('rr-one-phrase').textContent = data.the_one_phrase;
    document.getElementById('rr-next-action').textContent = data.next_action;
    document.getElementById('rr-priority').textContent = data.improvement_priority;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL 3 — LinkedIn Scam Shield
  // ═══════════════════════════════════════════════════════════════════════════
  function initScamShield() {
    const msgInput = document.getElementById('ss-message');
    const btn = document.getElementById('btn-ss-analyze');
    if (!btn) return;

    msgInput.addEventListener('input', function() { btn.disabled = (msgInput.value.trim().length < 10); });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      document.getElementById('ss-results').style.display = 'none';
      showLoading('ss-loading');
      try {
        const res = await fetch('/api/linkedin/scam-shield', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msgInput.value.trim() })
        });
        const data = await res.json();
        renderScamShield(data);
        showResults('ss-results');
      } catch (err) {
        alert('Failed to analyze message. Please try again.');
      } finally {
        hideLoading('ss-loading');
        btn.disabled = false;
      }
    });
  }

  const THREAT_CONFIG = {
    SAFE: { label: 'SAFE', color: 'var(--color-safe)', icon: '🛡️' },
    SUSPICIOUS: { label: 'SUSPICIOUS', color: 'var(--color-warning)', icon: '⚠️' },
    HIGH_RISK: { label: 'HIGH RISK', color: 'var(--color-danger)', icon: '🚨' },
    CONFIRMED_SCAM_PATTERN: { label: 'CONFIRMED SCAM', color: '#ff2d55', icon: '🔴' }
  };

  function renderScamShield(data) {
    const cfg = THREAT_CONFIG[data.platform_threat_level] || THREAT_CONFIG.SUSPICIOUS;
    const banner = document.getElementById('ss-threat-banner');
    banner.style.background = cfg.color + '18';
    banner.style.borderColor = cfg.color;
    banner.querySelector('.ss-threat-icon').textContent = cfg.icon;
    const labelEl = banner.querySelector('.ss-threat-label');
    labelEl.textContent = cfg.label;
    labelEl.style.color = cfg.color;
    const scoreEl = banner.querySelector('.ss-threat-score');
    scoreEl.textContent = data.threat_score + '/100';
    scoreEl.style.color = cfg.color;
    const flagsEl = document.getElementById('ss-red-flags');
    flagsEl.innerHTML = data.linkedin_specific_red_flags.length
      ? data.linkedin_specific_red_flags.map(function(f) { return '<li class="li-flag-item danger">⚡ ' + f + '</li>'; }).join('')
      : '<li class="li-flag-item safe">No specific red flags detected.</li>';
    document.getElementById('ss-mechanic').textContent = data.scam_mechanic;
    document.getElementById('ss-response-template').textContent = data.safe_response_template;
    document.getElementById('ss-report-action').textContent = data.report_action;
    document.getElementById('btn-ss-copy-template').onclick = function() { copyToClipboard(data.safe_response_template); };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL 4 — Post Momentum Predictor
  // ═══════════════════════════════════════════════════════════════════════════
  function initMomentumPredictor() {
    const draftInput = document.getElementById('mp-draft');
    const btn = document.getElementById('btn-mp-predict');
    if (!btn) return;

    draftInput.addEventListener('input', function() { btn.disabled = (draftInput.value.trim().length < 20); });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      document.getElementById('mp-results').style.display = 'none';
      showLoading('mp-loading');
      try {
        const res = await fetch('/api/linkedin/momentum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: draftInput.value.trim() })
        });
        const data = await res.json();
        renderMomentum(data);
        showResults('mp-results');
      } catch (err) {
        alert('Failed to predict momentum. Please try again.');
      } finally {
        hideLoading('mp-loading');
        btn.disabled = false;
      }
    });
  }

  function renderMomentum(data) {
    const momentumEl = document.getElementById('mp-momentum-score');
    animateNumber(momentumEl, data.momentum_score);
    momentumEl.style.color = scoreColor(data.momentum_score);
    setGauge('mp-gauge-fill', data.momentum_score);
    const stopEl = document.getElementById('mp-scroll-stop');
    animateNumber(stopEl, data.scroll_stop_rating, 600);
    stopEl.style.color = scoreColor(data.scroll_stop_rating, 10);
    document.getElementById('mp-format').textContent = data.best_format;
    document.getElementById('mp-windows').innerHTML = data.best_posting_windows.map(function(w) { return '<span class="li-time-badge">🕐 ' + w + '</span>'; }).join('');
    document.getElementById('mp-audience').textContent = data.predicted_audience;
    document.getElementById('mp-power-move').textContent = data.power_move;
    document.getElementById('mp-micro-opts').innerHTML = data.micro_optimizations.map(function(opt, i) {
      return '<div class="li-micro-opt-card">' +
        '<div class="li-micro-opt-header">Edit ' + (i + 1) + '</div>' +
        '<div class="li-micro-row"><span class="li-micro-label remove">Before</span><span class="li-micro-text">"' + opt.original_phrase + '"</span></div>' +
        '<div class="li-micro-row"><span class="li-micro-label add">After</span><span class="li-micro-text">"' + opt.suggested_replacement + '"</span></div>' +
        '<p class="li-micro-reason">💡 ' + opt.reason + '</p>' +
        '</div>';
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL 5 — Outreach Forge
  // ═══════════════════════════════════════════════════════════════════════════
  function initOutreachForge() {
    const targetInput = document.getElementById('of-target');
    const bgInput = document.getElementById('of-background');
    const goalSelect = document.getElementById('of-goal');
    const btn = document.getElementById('btn-of-forge');
    if (!btn) return;

    const checkOfInput = () => { btn.disabled = (targetInput.value.trim().length < 5 || !goalSelect.value); };
    targetInput.addEventListener('input', checkOfInput);
    goalSelect.addEventListener('change', checkOfInput);

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      document.getElementById('of-results').style.display = 'none';
      showLoading('of-loading');
      try {
        const res = await fetch('/api/linkedin/outreach-forge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPerson: targetInput.value.trim(), background: bgInput.value.trim(), goal: goalSelect.value })
        });
        const data = await res.json();
        renderOutreachForge(data);
        showResults('of-results');
      } catch (err) {
        alert('Failed to forge messages. Please try again.');
      } finally {
        hideLoading('of-loading');
        btn.disabled = false;
      }
    });
  }

  function renderOutreachForge(data) {
    document.getElementById('of-variants').innerHTML = data.variants.map(function(v) {
      return '<div class="li-outreach-card">' +
        '<div class="li-outreach-header">' +
          '<span class="li-outreach-name">' + v.variant_name + '</span>' +
          '<span class="li-char-badge">' + v.character_count + ' chars</span>' +
        '</div>' +
        '<div class="li-response-bar-wrap">' +
          '<span class="li-response-label">Reply likelihood</span>' +
          '<div class="li-response-bar-track"><div class="li-response-bar-fill" style="width:' + v.response_likelihood + '%; background:' + scoreColor(v.response_likelihood) + '"></div></div>' +
          '<span class="li-response-pct" style="color:' + scoreColor(v.response_likelihood) + '">' + v.response_likelihood + '%</span>' +
        '</div>' +
        '<p class="li-outreach-msg">' + v.message + '</p>' +
        '<p class="li-pers-tip">💡 <em>' + v.personalization_tip + '</em></p>' +
        '<p class="li-best-for">Best for: ' + v.best_for + '</p>' +
        '<button class="btn li-copy-btn" data-msg="' + encodeURIComponent(v.message) + '">📋 Copy Message</button>' +
        '</div>';
    }).join('');
    document.getElementById('of-variants').querySelectorAll('.li-copy-btn[data-msg]').forEach(function(b) {
      b.addEventListener('click', function() { copyToClipboard(decodeURIComponent(b.dataset.msg)); });
    });
    document.getElementById('of-strategy').textContent = data.goal_strategy;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL 6 — Comment Intelligence Engine
  // ═══════════════════════════════════════════════════════════════════════════
  function initCommentIntel() {
    const postInput = document.getElementById('ci-post');
    const btn = document.getElementById('btn-ci-generate');
    if (!btn) return;

    postInput.addEventListener('input', function() { btn.disabled = (postInput.value.trim().length < 20); });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      document.getElementById('ci-results').style.display = 'none';
      showLoading('ci-loading');
      try {
        const res = await fetch('/api/linkedin/comment-intel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post: postInput.value.trim() })
        });
        const data = await res.json();
        renderCommentIntel(data);
        showResults('ci-results');
      } catch (err) {
        alert('Failed to generate comments. Please try again.');
      } finally {
        hideLoading('ci-loading');
        btn.disabled = false;
      }
    });
  }

  function renderCommentIntel(data) {
    document.getElementById('ci-topic').textContent = '📌 Topic detected: ' + data.post_topic_detected;
    document.getElementById('ci-comments').innerHTML = data.comments.map(function(c) {
      return '<div class="li-comment-card">' +
        '<div class="li-comment-header">' +
          '<span class="li-comment-angle">' + c.angle + '</span>' +
          '<span class="li-pvp-badge" style="color:' + scoreColor(c.profile_view_probability) + '">👁 ' + c.profile_view_probability + '% profile views</span>' +
        '</div>' +
        '<blockquote class="li-comment-text">"' + c.comment_text + '"</blockquote>' +
        '<p class="li-why-works">🧠 ' + c.why_it_works + '</p>' +
        '<button class="btn li-copy-btn" data-msg="' + encodeURIComponent(c.comment_text) + '">📋 Copy Comment</button>' +
        '</div>';
    }).join('');
    document.getElementById('ci-comments').querySelectorAll('.li-copy-btn[data-msg]').forEach(function(b) {
      b.addEventListener('click', function() { copyToClipboard(decodeURIComponent(b.dataset.msg)); });
    });
    document.getElementById('ci-tip').textContent = '💡 ' + data.engagement_tip;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL 7 — 30-Day Content Runway
  // ═══════════════════════════════════════════════════════════════════════════
  const FORMAT_ICONS = { 'Text Only': '📝', 'Text + Image': '🖼️', 'Poll': '📊', 'Document Carousel': '📄', 'Video': '🎥' };

  function initContentRunway() {
    const industryInput = document.getElementById('cr-industry');
    const goalInput = document.getElementById('cr-goal');
    const freqSelect = document.getElementById('cr-frequency');
    const btn = document.getElementById('btn-cr-generate');
    if (!btn) return;

    const checkCrInput = () => { btn.disabled = (industryInput.value.trim().length < 3 || goalInput.value.trim().length < 5); };
    industryInput.addEventListener('input', checkCrInput);
    goalInput.addEventListener('input', checkCrInput);

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      document.getElementById('cr-results').style.display = 'none';
      showLoading('cr-loading');
      try {
        const res = await fetch('/api/linkedin/content-runway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ industry: industryInput.value.trim(), goal: goalInput.value.trim(), frequency: freqSelect.value })
        });
        const data = await res.json();
        renderContentRunway(data);
        showResults('cr-results');
      } catch (err) {
        alert('Failed to generate content runway. Please try again.');
      } finally {
        hideLoading('cr-loading');
        btn.disabled = false;
      }
    });
  }

  function renderContentRunway(data) {
    document.getElementById('cr-pillars').innerHTML = data.content_pillars.map(function(p, i) {
      return '<div class="li-pillar-card"><span class="li-pillar-num">' + (i + 1) + '</span><span class="li-pillar-text">' + p + '</span></div>';
    }).join('');
    document.getElementById('cr-calendar').innerHTML = data.calendar.map(function(entry) {
      return '<div class="li-cal-entry">' +
        '<div class="li-cal-day-badge">Day ' + entry.day + '<br><small>' + entry.posting_day_label + '</small></div>' +
        '<div class="li-cal-content">' +
          '<div class="li-cal-meta">' +
            '<span class="li-cal-angle">' + entry.angle + '</span>' +
            '<span class="li-cal-format">' + (FORMAT_ICONS[entry.format] || '📝') + ' ' + entry.format + '</span>' +
          '</div>' +
          '<p class="li-cal-topic"><strong>' + entry.topic + '</strong></p>' +
          '<p class="li-cal-hook">Hook: <em>"' + entry.hook_idea + '"</em></p>' +
        '</div>' +
        '</div>';
    }).join('');
    document.getElementById('cr-consistency-tip').textContent = '💡 ' + data.brand_consistency_tip;
    document.getElementById('cr-total-posts').textContent = data.total_posts_scheduled + ' posts scheduled';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL 8 — Bio Story Builder
  // ═══════════════════════════════════════════════════════════════════════════
  function initBioStoryBuilder() {
    const factsInput = document.getElementById('bsb-facts');
    const btn = document.getElementById('btn-bsb-build');
    if (!btn) return;

    factsInput.addEventListener('input', function() { btn.disabled = (factsInput.value.trim().length < 30); });

    document.querySelectorAll('.bsb-version-btn').forEach(function(b) {
      b.addEventListener('click', function() {
        document.querySelectorAll('.bsb-version-btn').forEach(function(x) { x.classList.remove('active'); });
        b.classList.add('active');
        const version = b.dataset.version;
        document.getElementById('bsb-output-punchy').style.display = version === 'punchy' ? 'block' : 'none';
        document.getElementById('bsb-output-narrative').style.display = version === 'narrative' ? 'block' : 'none';
      });
    });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      document.getElementById('bsb-results').style.display = 'none';
      showLoading('bsb-loading');
      try {
        const res = await fetch('/api/linkedin/bio-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facts: factsInput.value.trim() })
        });
        const data = await res.json();
        renderBioStory(data);
        showResults('bsb-results');
      } catch (err) {
        alert('Failed to build bio story. Please try again.');
      } finally {
        hideLoading('bsb-loading');
        btn.disabled = false;
      }
    });
  }

  function renderBioStory(data) {
    document.getElementById('bsb-text-punchy').textContent = data.version_punchy;
    document.getElementById('bsb-text-narrative').textContent = data.version_narrative;
    document.getElementById('bsb-opening-analysis').textContent = data.opening_line_analysis;
    document.getElementById('bsb-cta').textContent = data.cta_suggestion;
    document.getElementById('bsb-facts-used').innerHTML = data.facts_used.map(function(f) { return '<li>✓ ' + f + '</li>'; }).join('');
    document.getElementById('btn-bsb-copy-punchy').onclick = function() { copyToClipboard(data.version_punchy); };
    document.getElementById('btn-bsb-copy-narrative').onclick = function() { copyToClipboard(data.version_narrative); };
  }

  // ─── Public init (called by app.js) ────────────────────────────────────────
  window.initLinkedInTab = function() {
    if (liTabInitialized) return;
    liTabInitialized = true;

    document.querySelectorAll('.li-sub-tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { switchLinkedInSubTab(btn.dataset.litab); });
    });

    initBrandVoiceForge();
    initRecruiterRadar();
    initScamShield();
    initMomentumPredictor();
    initOutreachForge();
    initCommentIntel();
    initContentRunway();
    initBioStoryBuilder();

    switchLinkedInSubTab('brand-voice');
  };

});
