// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const normalizePath = (path) => {
        if (!path) return '/';
        return path.endsWith('/') ? path : `${path}/`;
    };

    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            
            // Change icon based on menu state
            const icon = menuButton.querySelector('i');
            if (mobileMenu.classList.contains('hidden')) {
                icon.className = 'fas fa-bars';
            } else {
                icon.className = 'fas fa-times';
            }
        });
    }
    
    // Close mobile menu when clicking on a link
    const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];
    mobileLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.classList.add('hidden');
            const icon = menuButton.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768 && mobileMenu && !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
            const icon = menuButton.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
        }
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const hash = this.getAttribute('href');
            // Ignore placeholder links such as href="#".
            if (!hash || hash === '#') return;
            e.preventDefault();
            let target = null;
            try {
                target = document.querySelector(hash);
            } catch (_err) {
                target = null;
            }
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add active class to current navigation item
    const currentPath = normalizePath(window.location.pathname);
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (!href.startsWith('/')) return;

        const linkPath = normalizePath(href.replace('/index.html', '/'));
        if (linkPath === currentPath ||
            (linkPath !== '/' && currentPath.startsWith(linkPath))) {
            link.classList.add('text-blue-600', 'font-semibold');
        }
    });
});
