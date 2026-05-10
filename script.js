document.addEventListener('DOMContentLoaded', () => {
    // Mobile navigation toggle
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    const navbar = document.getElementById('navbar');

    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('nav-menu-active');
            toggle.textContent = navLinks.classList.contains('nav-menu-active') ? '✕' : '☰';
        });
    }

    // Scroll effect for navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Form submission logic is handled by form-handler.js (Module 2+3+4)
    // See: form-handler.js for validation, reCAPTCHA, async POST, offline queue
});
