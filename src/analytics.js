/**
 * analytics.js — GA4 Event Tracking, UTM Persistence, Scroll Depth
 * Module 1.1 — Website Traffic Monitoring
 *
 * Loaded on ALL pages. GA4 is only initialized after consent is granted.
 * Uses dataLayer pattern for deferred event queuing.
 */

(function () {
  'use strict';

  /* ========================================================
     CONSTANTS — replaced at build time by build.js
     ======================================================== */
  var GA4_MEASUREMENT_ID = '__GA4_MEASUREMENT_ID__'; // e.g. G-XXXXXXXXXX

  /* ========================================================
     UTM PERSISTENCE (1.1)
     Capture UTM parameters from URL and store in sessionStorage
     so source/medium/campaign survive inter-page navigation.
     ======================================================== */
  function persistUTMParams() {
    var params = new URLSearchParams(window.location.search);
    var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    utmKeys.forEach(function (key) {
      var value = params.get(key);
      if (value) {
        sessionStorage.setItem(key, value);
      }
    });
  }

  function getUTMSource() {
    return sessionStorage.getItem('utm_source') || '(direct)';
  }

  function getUTMMedium() {
    return sessionStorage.getItem('utm_medium') || '(none)';
  }

  function getUTMCampaign() {
    return sessionStorage.getItem('utm_campaign') || '(none)';
  }

  /* ========================================================
     GA4 INITIALIZATION
     Only called after consent is granted via consent-banner.js
     ======================================================== */
  function initGA4() {
    if (GA4_MEASUREMENT_ID.indexOf('__') === 0) {
      console.warn('[AIRA Analytics] GA4 Measurement ID not configured. Skipping GA4 init.');
      return;
    }

    // Load gtag.js script dynamically
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA4_MEASUREMENT_ID, {
      send_page_view: true,
      cookie_flags: 'SameSite=None;Secure',
      custom_map: {
        dimension1: 'utm_source',
        dimension2: 'utm_medium',
        dimension3: 'utm_campaign'
      }
    });

    // Set UTM params as user properties
    gtag('set', 'user_properties', {
      utm_source: getUTMSource(),
      utm_medium: getUTMMedium(),
      utm_campaign: getUTMCampaign()
    });

    console.log('[AIRA Analytics] GA4 initialized:', GA4_MEASUREMENT_ID);
  }

  /* ========================================================
     EVENT TRACKING HELPERS
     ======================================================== */
  function trackEvent(eventName, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
    // Also push to dataLayer for GTM compatibility
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName }, params || {}));
  }

  /* ========================================================
     CTA CLICK TRACKING (1.1)
     Fires on every .btn click with button text and page
     ======================================================== */
  function initCTATracking() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn');
      if (btn) {
        trackEvent('cta_click', {
          button_text: (btn.textContent || '').trim().substring(0, 100),
          page_url: window.location.pathname,
          page_title: document.title
        });
      }
    });
  }

  /* ========================================================
     WHATSAPP CLICK TRACKING (1.1)
     Fires on .whatsapp-float and .btn-yellow WhatsApp links
     ======================================================== */
  function initWhatsAppTracking() {
    document.addEventListener('click', function (e) {
      var waFloat = e.target.closest('.whatsapp-float');
      var waBtn = e.target.closest('.btn-yellow[href*="wa.me"], a[href*="wa.me"]');

      if (waFloat || waBtn) {
        trackEvent('whatsapp_click', {
          click_source: waFloat ? 'floating_button' : 'cta_button',
          page_url: window.location.pathname,
          page_title: document.title
        });
      }
    });
  }

  /* ========================================================
     SCROLL DEPTH TRACKING (1.1)
     Milestones: 25%, 50%, 75%, 100%
     Uses IntersectionObserver-based approach for performance
     ======================================================== */
  function initScrollDepthTracking() {
    var milestones = [25, 50, 75, 100];
    var reached = {};

    function checkScrollDepth() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      var winHeight = window.innerHeight;
      var scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);

      milestones.forEach(function (milestone) {
        if (scrollPercent >= milestone && !reached[milestone]) {
          reached[milestone] = true;
          trackEvent('scroll_depth', {
            depth_threshold: milestone,
            page_url: window.location.pathname,
            page_title: document.title
          });
        }
      });
    }

    // Throttled scroll listener
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        checkScrollDepth();
      }, 250);
    }, { passive: true });
  }

  /* ========================================================
     FORM INTERACTION TRACKING (1.1)
     form_start fires when user focuses any form input (once per form per session)
     form_submit is tracked by form-handler.js
     ======================================================== */
  function initFormTracking() {
    var startedForms = {};

    document.addEventListener('focusin', function (e) {
      var input = e.target;
      if (!input.matches('input, select, textarea')) return;

      var form = input.closest('form');
      if (!form || !form.id) return;

      if (!startedForms[form.id]) {
        startedForms[form.id] = true;
        trackEvent('form_start', {
          form_id: form.id,
          page_url: window.location.pathname
        });
      }
    });
  }

  /* ========================================================
     PUBLIC API
     Exposed via window.__AiraAnalytics for other modules
     ======================================================== */
  window.__AiraAnalytics = {
    initGA4: initGA4,
    trackEvent: trackEvent,
    getUTMSource: getUTMSource,
    getUTMMedium: getUTMMedium,
    getUTMCampaign: getUTMCampaign
  };

  /* ========================================================
     INIT
     ======================================================== */
  function init() {
    // Always persist UTMs regardless of consent
    persistUTMParams();

    // Always set up event listeners (events queue in dataLayer)
    initCTATracking();
    initWhatsAppTracking();
    initScrollDepthTracking();
    initFormTracking();

    // Check if consent already granted from a previous session
    if (document.cookie.indexOf('aira_consent=granted') !== -1) {
      initGA4();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
