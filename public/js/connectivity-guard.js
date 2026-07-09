/**
 * AegisResil Apex — Connectivity Guard
 * Monitors online/offline status and low-bandwidth conditions.
 * Shows a non-intrusive status banner and triggers EdgeSession queue flush on reconnect.
 * Attach to DOM after EdgeSession is initialized.
 */

window.ConnectivityGuard = (() => {

  let _bannerEl = null;
  let _probeTimer = null;
  let _isOnline = navigator.onLine;
  let _isBannerVisible = false;

  // Probe endpoint — lightweight HEAD request to our own server
  const PROBE_URL = '/api/status';
  const PROBE_INTERVAL_MS = 15000; // Check every 15 seconds when offline

  /**
   * Creates and injects the banner element into the DOM.
   * Called lazily on first use.
   */
  function _createBanner() {
    if (_bannerEl) return;

    _bannerEl = document.createElement('div');
    _bannerEl.id = 'connectivity-banner';
    _bannerEl.setAttribute('role', 'status');
    _bannerEl.setAttribute('aria-live', 'polite');
    _bannerEl.style.cssText = `
      position: fixed;
      bottom: 1.25rem;
      left: 50%;
      transform: translateX(-50%) translateY(calc(100% + 2rem));
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 1.2rem;
      border-radius: 10px;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 4px 24px rgba(0,0,0,0.35);
      border: 1px solid transparent;
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
      opacity: 0;
      pointer-events: none;
      white-space: nowrap;
    `;
    document.body.appendChild(_bannerEl);
  }

  /**
   * Shows the connectivity banner with a given message and style variant.
   * @param {'offline'|'slow'|'online'} type
   */
  function _showBanner(type) {
    _createBanner();

    const configs = {
      offline: {
        icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>`,
        message: 'Offline Mode — Results saved locally',
        bg: 'rgba(30, 30, 46, 0.92)',
        border: 'rgba(245, 158, 11, 0.35)',
        color: '#f59e0b',
      },
      slow: {
        icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        message: 'Slow connection — Results cached locally',
        bg: 'rgba(30, 30, 46, 0.92)',
        border: 'rgba(245, 158, 11, 0.25)',
        color: '#fbbf24',
      },
      online: {
        icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
        message: 'Back online — Syncing saved data…',
        bg: 'rgba(16, 30, 20, 0.92)',
        border: 'rgba(16, 185, 129, 0.35)',
        color: '#10b981',
      },
    };

    const cfg = configs[type] || configs.offline;
    _bannerEl.innerHTML = `${cfg.icon}<span>${cfg.message}</span>`;
    _bannerEl.style.background = cfg.bg;
    _bannerEl.style.borderColor = cfg.border;
    _bannerEl.style.color = cfg.color;

    // Slide in
    requestAnimationFrame(() => {
      _bannerEl.style.opacity = '1';
      _bannerEl.style.pointerEvents = 'auto';
      _bannerEl.style.transform = 'translateX(-50%) translateY(0)';
    });

    _isBannerVisible = true;
  }

  /**
   * Hides the connectivity banner with a slide-out animation.
   * @param {number} [delayMs=0] - Optional delay before hiding
   */
  function _hideBanner(delayMs = 0) {
    if (!_bannerEl || !_isBannerVisible) return;

    setTimeout(() => {
      _bannerEl.style.opacity = '0';
      _bannerEl.style.pointerEvents = 'none';
      _bannerEl.style.transform = 'translateX(-50%) translateY(calc(100% + 2rem))';
      _isBannerVisible = false;
    }, delayMs);
  }

  /**
   * Probes the server with a lightweight fetch to confirm real connectivity.
   * navigator.onLine can return true even with no actual internet access.
   * @returns {Promise<boolean>}
   */
  async function _probeServer() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const startTime = Date.now();
      await fetch(PROBE_URL, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      // Flag as "slow" if latency > 2000ms
      return latency > 2000 ? 'slow' : 'online';
    } catch {
      return 'offline';
    }
  }

  /**
   * Handles going offline.
   */
  function _handleOffline() {
    _isOnline = false;
    _showBanner('offline');

    // Start polling to detect reconnect
    if (!_probeTimer) {
      _probeTimer = setInterval(async () => {
        const status = await _probeServer();
        if (status !== 'offline') {
          clearInterval(_probeTimer);
          _probeTimer = null;
          _handleOnline();
        }
      }, PROBE_INTERVAL_MS);
    }
  }

  /**
   * Handles coming back online.
   * Triggers EdgeSession queue flush.
   */
  async function _handleOnline() {
    _isOnline = true;
    _showBanner('online');

    // Attempt to flush queued offline entries
    if (window.EdgeSession) {
      try {
        const { flushed } = await window.EdgeSession.flushQueue();
        if (flushed > 0) {
          console.log(`[ConnectivityGuard] Flushed ${flushed} offline-queued entries.`);
        }
      } catch (e) {
        console.warn('[ConnectivityGuard] Queue flush error:', e);
      }
    }

    // Auto-hide the online banner after 3 seconds
    _hideBanner(3000);
  }

  // ── Public API ──────────────────────────────────────────────────

  return {

    /**
     * Initializes the connectivity guard.
     * Sets up browser event listeners and performs an initial probe.
     * Call once on app startup.
     */
    async init() {
      // Listen for browser online/offline events
      window.addEventListener('offline', () => {
        _handleOffline();
      });

      window.addEventListener('online', async () => {
        // Browser says online — double-check with server probe
        const status = await _probeServer();
        if (status === 'offline') {
          _handleOffline();
        } else {
          _handleOnline();
        }
      });

      // Initial probe on startup — detect pre-existing offline/slow state
      const initialStatus = await _probeServer();
      if (initialStatus === 'offline') {
        _handleOffline();
      } else if (initialStatus === 'slow') {
        _showBanner('slow');
        _hideBanner(5000);
      }

      console.log('[ConnectivityGuard] Initialized. Initial status:', initialStatus);
    },

    /**
     * Returns the current online status as seen by the guard.
     * @returns {boolean}
     */
    isOnline() {
      return _isOnline;
    },

    /**
     * Manually trigger an offline state (for testing or forced offline UI).
     */
    forceOffline() {
      _handleOffline();
    },

    /**
     * Dismisses the banner immediately.
     */
    dismissBanner() {
      _hideBanner(0);
    },
  };

})();
