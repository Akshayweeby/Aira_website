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

    // Handle form submission logic (for contact forms)
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            // Simple success visual feedback
            btn.innerHTML = 'Submitting...';
            btn.style.opacity = '0.8';
            
            setTimeout(() => {
                const formGroups = form.querySelectorAll('.form-group');
                const successMsg = form.parentElement.querySelector('.form-success');
                
                if (successMsg) {
                    form.classList.add('hidden');
                    form.style.display = 'none';
                    successMsg.classList.remove('hidden');
                    successMsg.style.display = 'block';
                } else {
                    btn.innerHTML = '✅ Submitted Successfully!';
                    btn.style.background = '#2E7D32';
                    form.reset();
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '';
                    }, 3000);
                }
            }, 1000);
        });
    });
});
