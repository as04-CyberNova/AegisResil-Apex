/**
 * CareerShield AI — App Coordinator & Router
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements
  const navItems = document.querySelectorAll('.nav-links .nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const viewTitle = document.getElementById('current-view-title');
  const viewDesc = document.getElementById('current-view-desc');
  const demoIndicator = document.getElementById('demo-mode-indicator');

  // Page titles and descriptions map
  const viewMeta = {
    dashboard: {
      title: 'Dashboard <em>Overview</em>',
      desc: 'Monitor security checks and resume optimization history.'
    },
    analyzer: {
      title: 'Scam & Fraud <em>Message Analyzer</em>',
      desc: 'Verify job offers, recruiter emails, and messages for red flags.'
    },
    scorer: {
      title: 'ATS <em>Resume Scorer</em>',
      desc: 'Evaluate formatting readability, identify missing keywords, and get optimizations.'
    },
    trust: {
      title: 'Company <em>Trust Analyzer</em>',
      desc: 'Verify if a company matches known hiring fraud profiles and check public signals.'
    },
    roadmap: {
      title: 'Career <em>Roadmap Generator</em>',
      desc: 'Get a step-by-step monthly study curriculum for your target career role.'
    },
    match: {
      title: 'Internship <em>Match Score</em>',
      desc: 'Evaluate how well your resume matches target internship criteria.'
    },
    interview: {
      title: 'Interview <em>Preparation</em>',
      desc: 'Generate role-based practice questions and grade your answers in real-time.'
    },
    coverletter: {
      title: 'Outreach & <em>Cover Letter</em> Generator',
      desc: 'Generate scannable cold application messages or formal cover letters matching job descriptions.'
    },
    profile: {
      title: 'LinkedIn <em>Profile Optimizer</em>',
      desc: 'Optimize your LinkedIn headlines and About summary layouts to attract entry-level recruiters.'
    },
    linkedin: {
      title: 'LinkedIn <em>Intelligence Suite</em>',
      desc: 'Eight original AI tools to supercharge your LinkedIn presence — from voice analysis to scam detection.'
    }
  };

  // Check server status (Demo Mode vs. Production Mode)
  async function checkServerStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      if (data.isDemo) {
        demoIndicator.style.display = 'flex';
      } else {
        demoIndicator.style.display = 'none';
      }
    } catch (error) {
      console.warn('Could not contact server to get status, defaulting to showing demo warning:', error);
      demoIndicator.style.display = 'flex';
    }
  }

  // Switch between tabs
  function switchTab(tabId) {
    // 1. Remove active state from all nav buttons
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      }
    });

    // 2. Toggle active state for tab panels
    tabPanels.forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`${tabId}-view`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      if (tabId === 'linkedin') {
        mainContent.classList.add('linkedin-full-width');
      } else {
        mainContent.classList.remove('linkedin-full-width');
      }
    }

    // 3. Update title and descriptions
    if (viewMeta[tabId]) {
      viewTitle.innerHTML = viewMeta[tabId].title;
      viewDesc.textContent = viewMeta[tabId].desc;
    }

    // 4. Trigger panel-specific reload logic
    if (tabId === 'dashboard') {
      if (window.initializeDashboard) {
        window.initializeDashboard();
      }
    } else if (tabId === 'roadmap') {
      const roadmapResumeBadge = document.getElementById('roadmap-resume-badge');
      if (roadmapResumeBadge) {
        const hasResume = !!sessionStorage.getItem('aegisresil_resume_text');
        roadmapResumeBadge.style.display = hasResume ? 'flex' : 'none';
      }
    } else if (tabId === 'match') {
      const profileActive = document.getElementById('match-profile-active');
      const profileManual = document.getElementById('match-profile-manual');
      const hasResume = !!sessionStorage.getItem('aegisresil_resume_text');

      if (profileActive) profileActive.style.display = hasResume ? 'flex' : 'none';
      if (profileManual) profileManual.style.display = hasResume ? 'none' : 'block';
      
      // Toggle button enabled status in match panel depending on textarea input
      const matchTextarea = document.getElementById('match-job-desc');
      const matchBtn = document.getElementById('btn-calculate-match');
      if (matchTextarea && matchBtn) {
        const checkMatchInput = () => {
          const descVal = matchTextarea.value.trim();
          const hasManualSkills = hasResume || (document.getElementById('match-skills-input')?.value.trim().length > 5);
          matchBtn.disabled = (descVal.length < 10 || !hasManualSkills);
        };
        
        matchTextarea.addEventListener('input', checkMatchInput);
        const manualSkillsEl = document.getElementById('match-skills-input');
        if (manualSkillsEl) manualSkillsEl.addEventListener('input', checkMatchInput);
        
        checkMatchInput();
      }
    } else if (tabId === 'coverletter') {
      if (window.checkCoverLetterContext) {
        window.checkCoverLetterContext();
      }
    } else if (tabId === 'linkedin') {
      if (window.initLinkedInTab) {
        window.initLinkedInTab();
      }
    }
  }

  // Attach click listeners to sidebar navigation items
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // --- AegisResil Apex: Landing Page & Auth Access Controller ---
  const landingPage = document.getElementById('landing-page');
  const appContainer = document.querySelector('.app-container');
  const hamburgerBtn = document.getElementById('hamburger-btn');

  function checkAppAccess() {
    const user = (window.firebase && firebase.auth && firebase.auth()) ? firebase.auth().currentUser : null;
    const guestBypass = sessionStorage.getItem('aegisresil_guest_bypass') === 'true';

    if (user || guestBypass) {
      if (landingPage) landingPage.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';
      if (hamburgerBtn) hamburgerBtn.style.display = 'flex';
    } else {
      if (landingPage) landingPage.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
      if (hamburgerBtn) hamburgerBtn.style.display = 'none';
    }
  }

  // --- PHASE 3: CLOUD AUTHENTICATION & INTERVIEW SUBTABS LIFE CYCLES ---
  let firestoreUnsubscribe = null;
  let authMode = 'login'; // 'login' or 'register'

  // Fetch Firebase config from server
  async function initFirebase() {
    try {
      const response = await fetch('/api/firebase-config');
      const data = await response.json();
      
      if (data.enabled && window.firebase) {
        firebase.initializeApp(data.config);
        console.log('Firebase Cloud Service initialized successfully.');
        setupAuthListeners();
      } else {
        console.log('Firebase config not enabled. Continuing in Guest/Local Storage Mode.');
        setupGuestModeUI();
        checkAppAccess();
      }
    } catch (err) {
      console.warn('Unable to reach Firebase config endpoint, default to Local storage:', err);
      setupGuestModeUI();
      checkAppAccess();
    }
  }

  function setupGuestModeUI() {
    const authPanel = document.getElementById('auth-panel');
    if (authPanel) {
      authPanel.innerHTML = `
        <div id="auth-state-unlogged">
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">
            <span>☁️</span> Local Mode
          </h4>
          <p style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.3;">
            Cloud sync offline. Scans are saved securely on this browser.
          </p>
        </div>
      `;
    }
  }

  function setupAuthListeners() {
    firebase.auth().onAuthStateChanged(user => {
      const authUnlogged = document.getElementById('auth-state-unlogged');
      const authLogged = document.getElementById('auth-state-logged');
      const userEmailEl = document.getElementById('auth-user-email');

      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
      }

      if (user) {
        // Logged In
        if (authUnlogged) authUnlogged.style.display = 'none';
        if (authLogged) authLogged.style.display = 'block';
        if (userEmailEl) userEmailEl.textContent = user.email;

        // Perform local storage merge sync
        window.StorageManager.syncLocalToFirestore();

        // Listen for Firestore DB updates
        firestoreUnsubscribe = window.StorageManager.setupFirestoreListener(user, () => {
          if (window.initializeDashboard) {
            window.initializeDashboard();
          }
        });

        checkAppAccess();
      } else {
        // Logged Out
        if (authUnlogged) authUnlogged.style.display = 'block';
        if (authLogged) authLogged.style.display = 'none';

        if (window.initializeDashboard) {
          window.initializeDashboard();
        }

        checkAppAccess();
      }
    });
  }

  // Auth Dialog Modals
  const authModal = document.getElementById('auth-modal');
  const btnShowAuth = document.getElementById('btn-show-auth');
  const btnCloseAuthModal = document.getElementById('btn-close-auth-modal');
  const tabLogin = document.getElementById('tab-auth-login');
  const tabRegister = document.getElementById('tab-auth-register');
  
  const authForm = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const authErrorMsg = document.getElementById('auth-error-msg');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');
  const btnLogout = document.getElementById('btn-auth-logout');

  // Landing Page Action Button Listeners
  const landingBtnLogin = document.getElementById('landing-btn-login');
  const landingBtnStart = document.getElementById('landing-btn-start');
  const landingBtnHeroStart = document.getElementById('landing-btn-hero-start');
  const landingBtnGuest = document.getElementById('landing-btn-guest');

  const openAuthModal = () => {
    authErrorMsg.style.display = 'none';
    emailInput.value = '';
    passwordInput.value = '';
    authModal.style.display = 'flex';
  };

  if (landingBtnLogin) landingBtnLogin.addEventListener('click', openAuthModal);
  if (landingBtnStart) landingBtnStart.addEventListener('click', openAuthModal);
  if (landingBtnHeroStart) landingBtnHeroStart.addEventListener('click', openAuthModal);
  if (landingBtnGuest) {
    landingBtnGuest.addEventListener('click', () => {
      sessionStorage.setItem('aegisresil_guest_bypass', 'true');
      checkAppAccess();
    });
  }

  if (btnShowAuth) {
    btnShowAuth.addEventListener('click', () => {
      openAuthModal();
    });
  }

  if (btnCloseAuthModal) {
    btnCloseAuthModal.addEventListener('click', () => {
      authModal.style.display = 'none';
    });
  }

  // Close modal when clicking background overlay
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        authModal.style.display = 'none';
      }
    });
  }

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      authMode = 'login';
      tabLogin.classList.add('active');
      tabLogin.style.color = 'var(--primary)';
      tabLogin.style.borderBottom = '2px solid var(--primary)';
      tabRegister.classList.remove('active');
      tabRegister.style.color = 'var(--text-secondary)';
      tabRegister.style.borderBottom = 'none';
      btnAuthSubmit.textContent = 'Sign In';
    });

    tabRegister.addEventListener('click', () => {
      authMode = 'register';
      tabRegister.classList.add('active');
      tabRegister.style.color = 'var(--primary)';
      tabRegister.style.borderBottom = '2px solid var(--primary)';
      tabLogin.classList.remove('active');
      tabLogin.style.color = 'var(--text-secondary)';
      tabLogin.style.borderBottom = 'none';
      btnAuthSubmit.textContent = 'Register Account';
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      
      authErrorMsg.style.display = 'none';
      btnAuthSubmit.disabled = true;

      try {
        if (authMode === 'login') {
          await firebase.auth().signInWithEmailAndPassword(email, password);
        } else {
          await firebase.auth().createUserWithEmailAndPassword(email, password);
        }
        // Success
        authModal.style.display = 'none';
      } catch (err) {
        console.error('Authentication error:', err);
        authErrorMsg.textContent = err.message || 'Authentication failed. Please check credentials.';
        authErrorMsg.style.display = 'block';
      } finally {
        btnAuthSubmit.disabled = false;
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('aegisresil_guest_bypass');
      if (window.firebase && firebase.auth && firebase.auth()) {
        firebase.auth().signOut().then(() => {
          checkAppAccess();
        }).catch(err => console.error('Signout failed:', err));
      } else {
        checkAppAccess();
      }
    });
  }

  // Interview Prep views sub-tab triggers
  const subtabSandbox = document.getElementById('subtab-btn-sandbox');
  const subtabSimulator = document.getElementById('subtab-btn-simulator');
  const panelSandbox = document.getElementById('interview-sandbox-panel');
  const panelSimulator = document.getElementById('interview-simulator-panel');

  if (subtabSandbox && subtabSimulator && panelSandbox && panelSimulator) {
    subtabSandbox.addEventListener('click', () => {
      subtabSandbox.classList.add('active');
      subtabSandbox.style.color = 'var(--primary)';
      subtabSandbox.style.borderBottom = '2px solid var(--primary)';
      subtabSimulator.classList.remove('active');
      subtabSimulator.style.color = 'var(--text-secondary)';
      subtabSimulator.style.borderBottom = 'none';
      
      panelSandbox.style.display = 'block';
      panelSimulator.style.display = 'none';
    });

    subtabSimulator.addEventListener('click', () => {
      subtabSimulator.classList.add('active');
      subtabSimulator.style.color = 'var(--primary)';
      subtabSimulator.style.borderBottom = '2px solid var(--primary)';
      subtabSandbox.classList.remove('active');
      subtabSandbox.style.color = 'var(--text-secondary)';
      subtabSandbox.style.borderBottom = 'none';
      
      panelSandbox.style.display = 'none';
      panelSimulator.style.display = 'block';

      // Prefill simulator config inputs if values are present in Sandbox
      const sandboxRole = document.getElementById('interview-target-role')?.value.trim();
      const sandboxDesc = document.getElementById('interview-job-desc')?.value.trim();
      const simRole = document.getElementById('sim-target-role');
      const simDesc = document.getElementById('sim-job-desc');

      if (sandboxRole && simRole && !simRole.value) {
        simRole.value = sandboxRole;
        // Trigger verification checking
        simRole.dispatchEvent(new Event('input'));
      }
      if (sandboxDesc && simDesc && !simDesc.value) {
        simDesc.value = sandboxDesc;
      }
    });
  }

  // --- MOBILE HAMBURGER MENU & DRAWER NAVIGATION ---
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function toggleSidebar(forceClose = false) {
    if (forceClose) {
      document.body.classList.remove('sidebar-open');
    } else {
      document.body.classList.toggle('sidebar-open');
    }
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebar();
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      toggleSidebar(true);
    });
  }

  // Intercept nav clicks to auto-close drawer on mobile
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      toggleSidebar(true);
    });
  });

  // Handle window resizing to clean up sidebar state when transitioning to desktop/tablet views
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      toggleSidebar(true);
    }
  }, { passive: true });

  // --- CURSOR GLOW SPOTLIGHT TRACKING ---
  const cursorGlow = document.getElementById('cursor-glow');
  if (cursorGlow) {
    let mouseX = 0, mouseY = 0;
    let currentX = 0, currentY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    function animateCursor() {
      const dx = mouseX - currentX;
      const dy = mouseY - currentY;
      currentX += dx * 0.12;
      currentY += dy * 0.12;

      cursorGlow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }

  // --- APP THEME SWITCHER CONTROLLER ---
  const themeSelector = document.getElementById('theme-selector');
  if (themeSelector) {
    // Load saved theme on boot
    const savedTheme = localStorage.getItem('aegisresil_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeSelector.value = savedTheme;

    // Listen for theme selector changes
    themeSelector.addEventListener('change', (e) => {
      const selectedTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', selectedTheme);
      localStorage.setItem('aegisresil_theme', selectedTheme);
    });
  }

  // Initialize Page Coordinator
  checkServerStatus();
  initFirebase();
  switchTab('dashboard'); // Start on Dashboard
});

