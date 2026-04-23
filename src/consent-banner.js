/**
 * consent-banner.js — GDPR/Cookie Consent Banner
 * Module 1.4 — Cookie Consent Banner
 *
 * Displays a compact consent banner at the bottom of every page.
 * Matches the site palette (white background, green border, yellow CTA).
 * Only loads GA4 and Hotjar after consent is granted.
 * Persists the decision via cookie across sessions.
 */

(function () {
  'use strict';

  /* ========================================================
     CONSTANTS — replaced at build time by build.js
     ======================================================== */
  var HOTJAR_SITE_ID = '__HOTJAR_SITE_ID__'; // e.g. XXXXXXX

  /* ========================================================
     COOKIE HELPERS
     ======================================================== */
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + d.toUTCString();
    }
    document.cookie = name + '=' + value + expires + '; path=/; SameSite=Lax; Secure';
  }

  /* ========================================================
     HOTJAR INITIALIZATION
     Only called after consent is granted
     ======================================================== */
  function initHotjar() {
    if (HOTJAR_SITE_ID.indexOf('__') === 0) {
      console.warn('[AIRA Consent] Hotjar Site ID not configured. Skipping Hotjar init.');
      return;
    }

    /*
     * HOW TO ACTIVATE HOTJAR:
     * 1. Sign up at https://www.hotjar.com
     * 2. Create a new site and get your Site ID (numeric)
     * 3. Replace HOTJAR_SITE_ID in .env with your actual Site ID
     * 4. Run build.js to inject the value
     * 5. Hotjar will load automatically for users who accept cookies
     */
    (function (h, o, t, j, a, r) {
      h.hj = h.hj || function () { (h.hj.q = h.hj.q || []).push(arguments); };
      h._hjSettings = { hjid: parseInt(HOTJAR_SITE_ID, 10), hjsv: 6 };
      a = o.getElementsByTagName('head')[0];
      r = o.createElement('script');
      r.async = 1;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');

    console.log('[AIRA Consent] Hotjar initialized:', HOTJAR_SITE_ID);
  }

  /* ========================================================
     LOAD ANALYTICS SUITE (called on consent grant)
     ======================================================== */
  function loadAnalytics() {
    // Load GA4 via analytics.js module
    if (window.__AiraAnalytics && typeof window.__AiraAnalytics.initGA4 === 'function') {
      window.__AiraAnalytics.initGA4();
    }
    // Load Hotjar
    initHotjar();
  }

  // Expose globally for analytics.js to call if consent already exists
  window.__loadAnalytics = loadAnalytics;

  /* ========================================================
     CONSENT BANNER UI
     ======================================================== */
  function createBanner() {
    var banner = document.createElement('div');
    banner.id = 'aira-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');

    // All styling is inline to avoid touching style.css
    banner.style.cssText = [
      'position: fixed',
      'bottom: 0',
      'left: 0',
      'right: 0',
      'z-index: 10001',
      'background: #ffffff',
      'border-top: 2px solid #2E7D32',
      'box-shadow: 0 -4px 20px rgba(0,0,0,0.1)',
      'padding: 1rem 1.5rem',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'gap: 1.5rem',
      'flex-wrap: wrap',
      'font-family: "Open Sans", "Inter", sans-serif',
      'font-size: 0.9rem',
      'color: #2c3e50',
      'animation: airaSlideUp 0.4s ease-out'
    ].join(';');

    banner.innerHTML = [
      '<style>',
      '@keyframes airaSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',
      '#aira-consent-banner button{cursor:pointer;border:none;padding:0.6rem 1.5rem;border-radius:9999px;font-family:"Montserrat",sans-serif;font-weight:600;font-size:0.875rem;transition:all 0.3s ease}',
      '#aira-consent-btn-accept{background:#FDD835;color:#2c3e50;box-shadow:0 2px 8px rgba(253,216,53,0.3)}',
      '#aira-consent-btn-accept:hover{background:#fbc02d;transform:translateY(-1px)}',
      '#aira-consent-btn-decline{background:transparent;color:#64748b;border:1px solid #e2e8f0}',
      '#aira-consent-btn-decline:hover{background:#f8fafc;color:#2c3e50}',
      '</style>',
      '<div style="flex:1;min-width:280px">',
      '  <strong style="color:#2E7D32">🍪 We value your privacy</strong>',
      '  <p style="margin:0.25rem 0 0;color:#64748b;font-size:0.85rem">',
      '    We use cookies and analytics to understand how visitors interact with our website and to improve your experience. ',
      '    No personal data is sold or shared with third parties.',
      '  </p>',
      '</div>',
      '<div style="display:flex;gap:0.75rem;flex-shrink:0">',
      '  <button id="aira-consent-btn-decline" type="button">Decline</button>',
      '  <button id="aira-consent-btn-accept" type="button">Accept Cookies</button>',
      '</div>'
    ].join('');

    document.body.appendChild(banner);

    // Accept handler
    document.getElementById('aira-consent-btn-accept').addEventListener('click', function () {
      setCookie('aira_consent', 'granted', 365);
      banner.style.animation = 'none';
      banner.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      banner.style.transform = 'translateY(100%)';
      banner.style.opacity = '0';
      setTimeout(function () {
        banner.remove();
      }, 350);
      loadAnalytics();
    });

    // Decline handler
    document.getElementById('aira-consent-btn-decline').addEventListener('click', function () {
      setCookie('aira_consent', 'denied', 365);
      banner.style.animation = 'none';
      banner.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      banner.style.transform = 'translateY(100%)';
      banner.style.opacity = '0';
      setTimeout(function () {
        banner.remove();
      }, 350);
    });
  }

  /* ========================================================
     INIT
     ======================================================== */
  function init() {
    var consent = getCookie('aira_consent');

    if (consent === 'granted') {
      // Consent already granted — load analytics silently
      loadAnalytics();
      return;
    }

    if (consent === 'denied') {
      // User previously declined — respect their choice
      return;
    }

    // No decision yet — show banner
    createBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
