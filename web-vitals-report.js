/**
 * web-vitals-report.js — Core Web Vitals → GA4
 * Module 1.2
 * Requires: web-vitals IIFE loaded first via CDN
 */
(function () {
  'use strict';

  function sendToGA4(metric) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
      metric_id: metric.id,
      metric_name: metric.name,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
      page_url: window.location.pathname,
      non_interaction: true
    });
  }

  function init() {
    if (typeof webVitals === 'undefined') {
      console.warn('[AIRA Web Vitals] web-vitals library not loaded.');
      return;
    }
    webVitals.onLCP(sendToGA4);
    webVitals.onFID(sendToGA4);
    webVitals.onCLS(sendToGA4);
    webVitals.onTTFB(sendToGA4);
    if (typeof webVitals.onINP === 'function') {
      webVitals.onINP(sendToGA4);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 100); });
  } else {
    setTimeout(init, 100);
  }
})();
