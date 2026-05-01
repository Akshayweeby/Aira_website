/**
 * smooth-scroll.js — Lenis Smooth Scrolling + GSAP Integration
 * Provides buttery smooth scrolling with inertia
 */

(function () {
  'use strict';

  // Wait for DOM and libraries
  function init() {
    if (typeof Lenis === 'undefined' || typeof gsap === 'undefined') {
      console.warn('Lenis or GSAP not loaded. Smooth scroll disabled.');
      return;
    }

    // Initialize Lenis with tuned parameters
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    // Connect Lenis scroll to GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Use GSAP ticker for Lenis RAF loop
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    // Disable GSAP's built-in lag smoothing to avoid conflicts
    gsap.ticker.lagSmoothing(0);

    // Expose lenis instance globally for other modules
    window.__lenis = lenis;

    // Handle anchor links smoothly
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -80 });
        }
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
