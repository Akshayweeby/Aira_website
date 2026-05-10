/**
 * cursor.js — Custom Cursor with Magnetic Button Effects
 * Premium dot + ring cursor, magnetic buttons, hover states
 */

(function () {
  'use strict';

  // Skip on touch devices
  const isTouchDevice =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) return;

  // Create cursor elements
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  // Cursor state
  let mouseX = -100,
    mouseY = -100;
  let ringX = -100,
    ringY = -100;
  let isHovering = false;

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Smooth follow for ring with spring physics
  function animate() {
    const speed = isHovering ? 0.2 : 0.15;
    ringX += (mouseX - ringX) * speed;
    ringY += (mouseY - ringY) * speed;

    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;

    requestAnimationFrame(animate);
  }
  animate();

  // Interactive element selectors
  const interactiveSelectors = 'a, button, .btn, input, select, textarea, .tilt-card, .program-card, .feature-card, .problem-card, .testi-card, .process-step';

  // Hover states
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest(interactiveSelectors);
    if (target) {
      isHovering = true;
      dot.classList.add('cursor-hover');
      ring.classList.add('cursor-hover');
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest(interactiveSelectors);
    if (target) {
      isHovering = false;
      dot.classList.remove('cursor-hover');
      ring.classList.remove('cursor-hover');
    }
  });

  // Click effect
  document.addEventListener('mousedown', () => {
    dot.classList.add('cursor-click');
    ring.classList.add('cursor-click');
  });

  document.addEventListener('mouseup', () => {
    dot.classList.remove('cursor-click');
    ring.classList.remove('cursor-click');
  });

  // Magnetic button effect
  function initMagneticButtons() {
    const magneticElements = document.querySelectorAll('.btn, .magnetic');

    magneticElements.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
        el.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        setTimeout(() => {
          el.style.transition = '';
        }, 500);
      });
    });
  }

  // Initialize magnetic on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMagneticButtons);
  } else {
    initMagneticButtons();
  }

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });
})();
