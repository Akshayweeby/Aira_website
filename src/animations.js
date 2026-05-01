/**
 * animations.js — GSAP ScrollTrigger Animations + 3D Card Tilt
 * Cinematic scroll-driven reveals, parallax, card interactions
 */

(function () {
  'use strict';

  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger not loaded.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // ---------- SECTION REVEALS ----------
    // Fade + slide up for section headers
    gsap.utils.toArray('.section-header').forEach((header) => {
      gsap.from(header, {
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
          end: 'top 50%',
          toggleActions: 'play none none reverse',
        },
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      });
    });

    // ---------- PAGE HEADER REVEAL ----------
    const pageHeader = document.querySelector('.page-header');
    if (pageHeader) {
      gsap.from(pageHeader.children, {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.3,
      });
    }

    // ---------- HERO ANIMATIONS ----------
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
      const tl = gsap.timeline({ delay: 0.3 });

      tl.from('.hero-content .section-tag', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
        .from(
          '.hero-content h1',
          {
            y: 50,
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
          },
          '-=0.4'
        )
        .from(
          '.hero-content p',
          {
            y: 30,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.5'
        )
        .from(
          '.hero-btns',
          {
            y: 30,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.4'
        )
        .from(
          '.hero-image',
          {
            x: 80,
            opacity: 0,
            duration: 1.2,
            ease: 'power3.out',
          },
          '-=0.8'
        )
        .from(
          '.hero-float-card',
          {
            scale: 0,
            opacity: 0,
            duration: 0.6,
            stagger: 0.2,
            ease: 'back.out(1.7)',
          },
          '-=0.5'
        );
    }

    // ---------- UNIFORM STAGGER REVEALS ----------
    const cardSelectors = [
      '.problem-card',
      '.feature-card',
      '.program-card',
      '.testi-card',
      '.case-study',
      'img:not(.logo img):not(.footer-socials img):not(.hero-img-wrap img)' // All vectors/images except logos and hero
    ];

    cardSelectors.forEach((selector) => {
      const elements = gsap.utils.toArray(selector);
      if (elements.length === 0) return;

      elements.forEach((el) => {
        // Find a common parent to use as trigger or use element itself
        const trigger = el.parentElement || el;

        gsap.from(el, {
          scrollTrigger: {
            trigger: trigger,
            start: 'top 85%', // Trigger slightly earlier
            toggleActions: 'play none none none', // Play once, don't reverse
          },
          y: 40,
          opacity: 0,
          scale: 0.98,
          duration: 0.8,
          ease: 'power3.out',
        });
      });
    });

    // ---------- PROBLEM TRANSITION BANNER ----------
    const problemTransition = document.querySelector('.problem-transition');
    if (problemTransition) {
      gsap.from(problemTransition, {
        scrollTrigger: {
          trigger: problemTransition,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        y: 40,
        opacity: 0,
        scale: 0.95,
        duration: 1,
        ease: 'power3.out',
      });
    }

    // ---------- PROCESS STEPS ----------
    const processSteps = gsap.utils.toArray('.process-step');
    if (processSteps.length > 0) {
      gsap.from(processSteps, {
        scrollTrigger: {
          trigger: '.process-wrap',
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
        y: 50,
        opacity: 0,
        scale: 0.8,
        duration: 0.6,
        stagger: 0.15,
        ease: 'back.out(1.7)',
      });

      // Animate process line
      const processLine = document.querySelector('.process-line');
      if (processLine) {
        gsap.from(processLine, {
          scrollTrigger: {
            trigger: '.process-wrap',
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
          scaleX: 0,
          transformOrigin: 'left center',
          duration: 1.5,
          ease: 'power3.inOut',
        });
      }
    }

    // ---------- CTA SECTION ----------
    const ctaSection = document.querySelector('.cta-section');
    if (ctaSection) {
      gsap.from(ctaSection.querySelectorAll('h2, p, .cta-btns'), {
        scrollTrigger: {
          trigger: ctaSection,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
      });
    }

    // ---------- FOOTER REVEAL ----------
    const footerGrid = document.querySelector('.footer-grid');
    if (footerGrid) {
      gsap.from(footerGrid.children, {
        scrollTrigger: {
          trigger: footerGrid,
          start: 'top 90%',
          toggleActions: 'play none none reverse',
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }

    // ---------- PARALLAX EFFECTS ----------
    gsap.utils.toArray('.parallax-bg').forEach((el) => {
      gsap.to(el, {
        scrollTrigger: {
          trigger: el.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
        y: -100,
        ease: 'none',
      });
    });

    // ---------- NAVBAR SCROLL EFFECT ----------
    const navbar = document.getElementById('navbar');
    if (navbar) {
      ScrollTrigger.create({
        start: 10,
        onUpdate: (self) => {
          if (self.direction === 1 && window.scrollY > 100) {
            navbar.classList.add('navbar-hidden');
          } else {
            navbar.classList.remove('navbar-hidden');
          }
          if (window.scrollY > 10) {
            navbar.classList.add('scrolled');
          } else {
            navbar.classList.remove('scrolled');
          }
        },
      });
    }

    // ---------- 3D TILT CARDS ----------
    initTiltCards();

    // ---------- LINK UNDERLINE ANIMATION ----------
    initLinkAnimations();
  }

  // ---------- 3D TILT EFFECT ----------
  function initTiltCards() {
    const tiltElements = document.querySelectorAll(
      '.problem-card, .feature-card, .program-card, .testi-card, .case-study'
    );

    tiltElements.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        el.style.transition = 'transform 0.1s ease';

        // Dynamic shadow
        const shadowX = rotateY * 2;
        const shadowY = -rotateX * 2;
        el.style.boxShadow = `${shadowX}px ${shadowY}px 30px rgba(46, 125, 50, 0.15), 0 8px 32px rgba(0,0,0,0.1)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform =
          'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        el.style.transition =
          'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.5s ease';
        el.style.boxShadow = '';
      });
    });
  }

  // ---------- LINK UNDERLINE ANIMATIONS ----------
  function initLinkAnimations() {
    const links = document.querySelectorAll(
      '.footer-links a, .nav-links > a'
    );

    links.forEach((link) => {
      // Already has CSS-powered animation via ::after pseudo-element
      // Add slight scale on hover for extra polish
      link.addEventListener('mouseenter', () => {
        gsap.to(link, {
          x: 4,
          duration: 0.3,
          ease: 'power2.out',
        });
      });

      link.addEventListener('mouseleave', () => {
        gsap.to(link, {
          x: 0,
          duration: 0.3,
          ease: 'power2.out',
        });
      });
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
